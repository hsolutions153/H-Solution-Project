# Kiểm tra hồi quy refresh token.

import hashlib
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from fastapi import Response

from tests.notification_isolation import setUpModule, tearDownModule  # noqa: F401

from app.auth import service
from app.auth.router import _clear_refresh_cookie, _cookie_name, _set_refresh_cookie
from app.core.exceptions import AppException, ErrorCode


class RefreshTokenFlowTests(unittest.TestCase):
    def setUp(self):
        self.user = {
            "id": "CUSTOMER01",
            "email": "customer@example.com",
            "is_active": True,
            "password_hash": "hash",
            "role": {"id": "ROLE-CUSTOMER", "code": "CUSTOMER"},
        }
        self.now = datetime.now(timezone.utc)
        self.raw = "raw-refresh-token"
        self.stored = {
            "id": "REFRESH001",
            "user_id": "CUSTOMER01",
            "token_hash": hashlib.sha256(self.raw.encode()).hexdigest(),
            "expires_at": (self.now + timedelta(days=1)).isoformat(),
            "revoked_at": None,
        }

    def assert_refresh_error(self, operation, code):
        with self.assertRaises(AppException) as error:
            operation()
        self.assertEqual(error.exception.code, code.value)
        return error.exception

    def test_new_refresh_tokens_are_hashed_at_rest(self):
        with patch.object(service, "create_refresh_token", return_value="jwt-refresh"), patch.object(
            service.repository, "create_refresh_token", return_value={"id": "REFRESH001"}
        ) as create:
            result = service._issue_refresh_token("CUSTOMER01", "customer@example.com", "ROLE-CUSTOMER", "CUSTOMER")

        self.assertEqual(result, "jwt-refresh")
        saved = create.call_args.args[0]
        self.assertEqual(saved["token_hash"], hashlib.sha256(b"jwt-refresh").hexdigest())
        self.assertNotEqual(saved["token_hash"], "jwt-refresh")

    def test_refresh_rotates_cookie_record_and_returns_new_access_token(self):
        lookup = patch.object(
            service.repository,
            "get_refresh_token_by_hash",
            side_effect=lambda value: self.stored if value == self.stored["token_hash"] else None,
        )
        with lookup, patch.object(service, "get_refresh_token_payload", return_value={"sub": "CUSTOMER01"}), patch.object(
            service.repository, "get_user_by_id", return_value=self.user
        ), patch.object(service.repository, "revoke_refresh_token") as revoke, patch.object(
            service, "_issue_refresh_token", return_value="new-refresh-token"
        ):
            result = service.refresh_access_token(self.raw)

        self.assertIn("access_token", result)
        self.assertEqual(result["refresh_token"], "new-refresh-token")
        revoke.assert_called_once()

    def test_refresh_rejects_unknown_token_without_reading_user(self):
        with patch.object(service, "get_refresh_token_payload", return_value={"sub": "CUSTOMER01"}), patch.object(
            service.repository, "get_refresh_token_by_hash", return_value=None
        ), patch.object(service.repository, "get_user_by_id") as get_user:
            self.assert_refresh_error(lambda: service.refresh_access_token(self.raw), ErrorCode.TOKEN_INVALID)
        get_user.assert_not_called()

    def test_refresh_rejects_token_bound_to_another_user(self):
        stored = dict(self.stored, user_id="ANOTHER01")
        with patch.object(service, "get_refresh_token_payload", return_value={"sub": "CUSTOMER01"}), patch.object(
            service.repository, "get_refresh_token_by_hash", return_value=stored
        ):
            self.assert_refresh_error(lambda: service.refresh_access_token(self.raw), ErrorCode.TOKEN_INVALID)

    def test_refresh_rejects_expired_database_record(self):
        expired = dict(self.stored, expires_at=(self.now - timedelta(seconds=1)).isoformat())
        with patch.object(service, "get_refresh_token_payload", return_value={"sub": "CUSTOMER01"}), patch.object(
            service.repository, "get_refresh_token_by_hash", return_value=expired
        ):
            self.assert_refresh_error(lambda: service.refresh_access_token(self.raw), ErrorCode.TOKEN_EXPIRED)

    def test_refresh_rejects_inactive_user(self):
        inactive = dict(self.user, is_active=False)
        with patch.object(service, "get_refresh_token_payload", return_value={"sub": "CUSTOMER01"}), patch.object(
            service.repository, "get_refresh_token_by_hash", return_value=self.stored
        ), patch.object(service.repository, "get_user_by_id", return_value=inactive):
            self.assert_refresh_error(lambda: service.refresh_access_token(self.raw), ErrorCode.USER_LOCKED)

    def test_refresh_rejects_user_without_configured_role(self):
        no_role = dict(self.user, role={})
        with patch.object(service, "get_refresh_token_payload", return_value={"sub": "CUSTOMER01"}), patch.object(
            service.repository, "get_refresh_token_by_hash", return_value=self.stored
        ), patch.object(service.repository, "get_user_by_id", return_value=no_role):
            self.assert_refresh_error(lambda: service.refresh_access_token(self.raw), ErrorCode.ROLE_NOT_CONFIGURED)

    def test_refresh_rejects_invalid_jwt_before_database_lookup(self):
        with patch.object(service, "get_refresh_token_payload", side_effect=AppException(ErrorCode.TOKEN_INVALID)), patch.object(
            service.repository, "get_refresh_token_by_hash"
        ) as lookup:
            self.assert_refresh_error(lambda: service.refresh_access_token("forged"), ErrorCode.TOKEN_INVALID)
        lookup.assert_not_called()

    def test_legacy_raw_token_can_rotate_once_for_migration(self):
        with patch.object(service, "get_refresh_token_payload", return_value={"sub": "CUSTOMER01"}), patch.object(
            service.repository, "get_refresh_token_by_hash", side_effect=[None, self.stored]
        ) as lookup, patch.object(service.repository, "get_user_by_id", return_value=self.user), patch.object(
            service.repository, "revoke_refresh_token"
        ), patch.object(service, "_issue_refresh_token", return_value="hashed-new-token"):
            result = service.refresh_access_token(self.raw)
        self.assertEqual(result["refresh_token"], "hashed-new-token")
        self.assertEqual(lookup.call_count, 2)

    def test_logout_revokes_active_refresh_token(self):
        with patch.object(service, "get_refresh_token_payload", return_value={"sub": "CUSTOMER01"}), patch.object(
            service.repository, "get_refresh_token_by_hash", return_value=self.stored
        ), patch.object(service.repository, "revoke_refresh_token") as revoke:
            result = service.logout_refresh_token(self.raw)
        self.assertEqual(result["message"], "Đăng xuất thành công")
        revoke.assert_called_once()

    def test_logout_is_idempotent_for_invalid_or_missing_token(self):
        with patch.object(service, "get_refresh_token_payload", side_effect=AppException(ErrorCode.TOKEN_INVALID)), patch.object(
            service.repository, "get_refresh_token_by_hash"
        ) as lookup:
            result = service.logout_refresh_token("invalid")
        self.assertEqual(result["message"], "Đăng xuất thành công")
        lookup.assert_not_called()

    def test_cookie_names_are_isolated_for_all_three_apps(self):
        self.assertEqual({_cookie_name(role) for role in ("customer", "technician", "admin")}, {
            "refresh_token_customer", "refresh_token_technician", "refresh_token_admin"
        })

    def test_cookie_rejects_unknown_role(self):
        self.assert_refresh_error(lambda: _cookie_name("customer-service"), ErrorCode.VALIDATION_ERROR)

    def test_logout_cookie_is_expired_on_public_backend_path(self):
        response = Response()
        _clear_refresh_cookie(response, "TECHNICIAN")
        set_cookie = response.headers["set-cookie"]
        self.assertIn("refresh_token_technician=", set_cookie)
        self.assertIn("Max-Age=0", set_cookie)
        self.assertIn("Path=/api/v1/auth", set_cookie)

    def test_reusing_rotated_token_revokes_all_user_sessions(self):
        revoked = dict(self.stored, revoked_at=self.now.isoformat())
        with patch.object(service, "get_refresh_token_payload", return_value={"sub": "CUSTOMER01"}), patch.object(
            service.repository, "get_refresh_token_by_hash", return_value=revoked
        ), patch.object(service.repository, "revoke_all_user_refresh_tokens") as revoke_all:
            with self.assertRaises(AppException) as error:
                service.refresh_access_token(self.raw)

        self.assertEqual(error.exception.status_code, 401)
        revoke_all.assert_called_once()

    def test_backend_login_sets_http_only_refresh_cookie_for_role(self):
        response = Response()
        _set_refresh_cookie(response, "refresh-token", "CUSTOMER")
        set_cookie = response.headers["set-cookie"]
        self.assertIn("refresh_token_customer=refresh-token", set_cookie)
        self.assertIn("HttpOnly", set_cookie)
        self.assertIn("Path=/api/v1/auth", set_cookie)


if __name__ == "__main__":
    unittest.main()
