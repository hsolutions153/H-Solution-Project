# Kiểm tra điều phối SOS, thu hồi phiên và cấu hình khóa ký.

import os
import unittest
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from tests.notification_isolation import setUpModule, tearDownModule  # noqa: F401

from fastapi.security import HTTPAuthorizationCredentials

from app.auth import utils as auth_utils
from app.core.exceptions import AppException
from app.repair_requests import repository as repairs_repository
from app.repair_requests import service as repairs


class MockedTest(unittest.TestCase):
    def mock(self, target, **kwargs):
        patcher = patch(target, **kwargs)
        result = patcher.start()
        self.addCleanup(patcher.stop)
        return result


class AutoDispatchTests(MockedTest):
    # Kiểm tra điều phối lại đơn SOS an toàn khi có cạnh tranh.

    def setUp(self):
        old = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
        self.live = {
            "id": "REPAIR0001", "customer_id": "CUSTOMER01", "technician_id": "TECH000001",
            "device_id": "DEVICE0001", "is_sos": True, "status": "ASSIGNED", "assigned_at": old,
        }
        self.snapshot = deepcopy(self.live)
        database = self.mock("app.db.database.supabase")
        database.table.return_value.select.return_value.in_.return_value.eq.return_value.execute.side_effect = (
            lambda: SimpleNamespace(data=[deepcopy(self.snapshot)])
        )
        self.history_rows = []
        self.mock("app.repair_requests.service.repository.get_status_history", side_effect=lambda _id: self.history_rows)
        self.mock("app.repair_requests.service.repository.get_device_type", return_value="SCOOTER")
        self.history = self.mock("app.repair_requests.service.repository.add_status_history")
        self.notify = self.mock("app.notifications.service.notify_request_assigned")
        self.find = self.mock("app.repair_requests.service._find_best_sos_technician", return_value="TECH000002")

        def update(request_id, data, expected=None):
            # Mô phỏng UPDATE ... WHERE: 0 bản ghi khi dữ liệu đã đổi so với lúc đọc.
            if any(self.live.get(k) != v for k, v in (expected or {}).items()):
                return None
            self.live.update(data)
            return deepcopy(self.live)

        self.update = self.mock("app.repair_requests.service.repository.update_repair_request", side_effect=update)

    def test_timed_out_assignment_moves_to_next_technician_and_notifies(self):
        self.assertEqual(repairs.reassign_timed_out_requests(), 1)
        self.assertEqual((self.live["status"], self.live["technician_id"]), ("ASSIGNED", "TECH000002"))
        self.notify.assert_called_once()
        self.assertIn("TECH000001", self.find.call_args.kwargs["exclude_tech_ids"])

    def test_assignment_accepted_meanwhile_is_not_overwritten(self):
        self.live["status"] = "ACCEPTED"  # KTV nhận đơn sau khi worker đã đọc snapshot
        self.assertEqual(repairs.reassign_timed_out_requests(), 0)
        self.assertEqual((self.live["status"], self.live["technician_id"]), ("ACCEPTED", "TECH000001"))
        self.history.assert_not_called()
        self.notify.assert_not_called()

    def test_recent_assignment_is_left_alone(self):
        self.snapshot["assigned_at"] = datetime.now(timezone.utc).isoformat()
        self.assertEqual(repairs.reassign_timed_out_requests(), 0)
        self.update.assert_not_called()

    def test_unassigned_sos_is_dispatched_when_technician_becomes_available(self):
        self.snapshot.update(status="REQUESTED", technician_id=None, assigned_at=None)
        self.live.update(status="REQUESTED", technician_id=None, assigned_at=None)
        self.assertEqual(repairs.reassign_timed_out_requests(), 1)
        self.assertEqual((self.live["status"], self.live["technician_id"]), ("ASSIGNED", "TECH000002"))

    def test_unassigned_sos_waits_when_nobody_is_available(self):
        self.snapshot.update(status="REQUESTED", technician_id=None, assigned_at=None)
        self.find.return_value = None
        self.assertEqual(repairs.reassign_timed_out_requests(), 0)
        self.update.assert_not_called()

    def test_technicians_who_declined_are_excluded(self):
        # Lượt từ chối được lưu với status REQUESTED vì DB không có REJECTED.
        self.history_rows = [{"status": "REQUESTED", "changed_by": "TECH000007", "note": "[KTV từ chối nhận đơn]"}]
        repairs.reassign_timed_out_requests()
        self.assertTrue({"TECH000001", "TECH000007"} <= self.find.call_args.kwargs["exclude_tech_ids"])

    def test_unreadable_history_skips_dispatch_instead_of_guessing(self):
        self.mock("app.repair_requests.service.repository.get_status_history", side_effect=RuntimeError("db down"))
        self.assertEqual(repairs.reassign_timed_out_requests(), 0)
        self.update.assert_not_called()


class SosCandidateTests(MockedTest):
    def test_locked_account_is_not_selected(self):
        now = datetime.now(timezone.utc).isoformat()
        profiles = [
            {"user_id": "TECH000001", "skills": "SCOOTER", "last_latitude": 10.0, "last_longitude": 106.0, "last_location_at": now},
            {"user_id": "TECH000002", "skills": "SCOOTER", "last_latitude": 10.5, "last_longitude": 106.5, "last_location_at": now},
        ]
        database = self.mock("app.db.database.supabase")

        def table(name):
            query = MagicMock()
            if name == "technician_profiles":
                query.select.return_value.eq.return_value.eq.return_value.execute.return_value = SimpleNamespace(data=profiles)
            elif name == "users":
                query.select.return_value.in_.return_value.execute.return_value = SimpleNamespace(
                    data=[{"id": "TECH000001", "is_active": False}, {"id": "TECH000002", "is_active": True}]
                )
            else:
                query.select.return_value.in_.return_value.execute.return_value = SimpleNamespace(data=[])
            return query

        database.table.side_effect = table
        self.mock("app.repair_requests.service._skill_matches_device", return_value=True)
        self.mock("app.repair_requests.service._has_fresh_technician_location", return_value=True)
        self.assertEqual(repairs._find_best_sos_technician(10.0, 106.0, "SCOOTER"), "TECH000002")


class RepositoryTests(MockedTest):
    def test_status_history_orders_by_changed_at_and_reports_failures(self):
        database = self.mock("app.repair_requests.repository.supabase")
        chain = database.table.return_value.select.return_value.eq.return_value
        chain.order.return_value.execute.return_value = SimpleNamespace(data=[{"id": "H1"}])
        self.assertEqual(repairs_repository.get_status_history("REPAIR0001"), [{"id": "H1"}])
        chain.order.assert_called_with("changed_at", desc=False)
        chain.order.return_value.execute.side_effect = RuntimeError("column does not exist")
        with self.assertRaises(RuntimeError):
            repairs_repository.get_status_history("REPAIR0001")

    def test_conditional_update_filters_on_expected_values(self):
        database = self.mock("app.repair_requests.repository.supabase")
        query = database.table.return_value.update.return_value.eq.return_value
        query.eq.return_value = query
        query.is_.return_value = query
        query.execute.return_value = SimpleNamespace(data=[])
        result = repairs_repository.update_repair_request(
            "REPAIR0001", {"status": "ASSIGNED"}, expected={"status": "ASSIGNED", "technician_id": None}
        )
        self.assertIsNone(result)
        query.eq.assert_any_call("status", "ASSIGNED")
        query.is_.assert_any_call("technician_id", "null")


class SessionRevocationTests(MockedTest):
    def setUp(self):
        auth_utils.invalidate_account_cache()
        self.addCleanup(auth_utils.invalidate_account_cache)
        self.account = {"id": "TECH000001", "is_active": True, "role_id": "ROLE_TECH", "password_hash": "hash-1"}
        database = self.mock("app.db.database.supabase")
        database.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.side_effect = (
            lambda: SimpleNamespace(data=dict(self.account))
        )

    def token(self, **extra):
        claims = {"sub": "TECH000001", "role_id": "ROLE_TECH", "role": "TECHNICIAN",
                  "pwv": auth_utils.password_version("hash-1"), **extra}
        return HTTPAuthorizationCredentials(scheme="Bearer", credentials=auth_utils.create_access_token(claims))

    def rejected(self, credentials):
        auth_utils.invalidate_account_cache()
        with self.assertRaises(AppException) as error:
            auth_utils.get_current_user(credentials)
        return error.exception.status_code

    def test_active_account_with_current_role_is_accepted(self):
        self.assertEqual(auth_utils.get_current_user(self.token())["sub"], "TECH000001")

    def test_locked_account_token_stops_working(self):
        credentials = self.token()
        self.account["is_active"] = False
        self.assertIn(self.rejected(credentials), {401, 403})

    def test_changed_role_invalidates_token(self):
        credentials = self.token()
        self.account["role_id"] = "ROLE_CUSTOMER"
        self.assertEqual(self.rejected(credentials), 401)

    def test_password_change_invalidates_token(self):
        credentials = self.token()
        self.account["password_hash"] = "hash-2"
        self.assertEqual(self.rejected(credentials), 401)


class SigningKeyTests(unittest.TestCase):
    def test_production_refuses_missing_or_placeholder_secret(self):
        for secret in ("", "super-secret-key-change-it", "short"):
            with patch.dict(os.environ, {"APP_ENV": "production", "JWT_SECRET_KEY": secret}):
                with self.assertRaises(RuntimeError):
                    auth_utils._load_secret_key()

    def test_development_never_falls_back_to_known_secret(self):
        with patch.dict(os.environ, {"APP_ENV": "development", "JWT_SECRET_KEY": ""}):
            first, second = auth_utils._load_secret_key(), auth_utils._load_secret_key()
        self.assertNotEqual(first, "super-secret-key-change-it")
        self.assertNotEqual(first, second)

    def test_configured_strong_secret_is_used(self):
        strong = "x" * 40
        with patch.dict(os.environ, {"APP_ENV": "production", "JWT_SECRET_KEY": strong}):
            self.assertEqual(auth_utils._load_secret_key(), strong)


if __name__ == "__main__":
    unittest.main()
