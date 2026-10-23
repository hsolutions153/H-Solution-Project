"""Regression coverage for customer estimate approval and additional costs.

Run from backend: python -m unittest discover -s tests -v
"""

from copy import deepcopy
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from tests.notification_isolation import setUpModule, tearDownModule  # noqa: F401

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.auth.utils import get_current_user
from app.repair_requests.router import router


class QuoteApprovalTests(unittest.TestCase):
    def setUp(self):
        self.customer = {"sub": "CUSTOMER01", "role": "CUSTOMER"}
        self.request = {
            "id": "REPAIR0001",
            "request_code": "REQUEST001",
            "customer_id": self.customer["sub"],
            "device_id": "DEVICE0001",
            "issue_type": "BATTERY",
            "issue_description": "Battery repair",
            "location_address": "Test address",
            "is_sos": False,
            "status": "WAITING_FOR_APPROVAL",
            "total_amount": 450000,
            "payment_method": "COD",
            "created_at": "2026-10-03T01:00:00+00:00",
            "created_by": self.customer["sub"],
            "updated_at": "2026-10-03T01:00:00+00:00",
            "updated_by": self.customer["sub"],
            "repair_requests_images": [],
            "customer_devices": {"id": "DEVICE0001"},
            "repair_quotes": [self.quote("INITIAL001", "PENDING", 450000)],
        }

        database = self.start_patch("app.db.database.supabase")
        self.database = database
        self.payment_lookup = self.start_patch("app.payments.repository.get_payment_by_repair_id")
        self.payment_lookup.return_value = None
        database.table.return_value.select.return_value.or_.return_value.maybe_single.return_value.execute.side_effect = (
            lambda: SimpleNamespace(data=deepcopy(self.request))
        )

        def update_quotes():
            fields = database.table.return_value.update.call_args.args[0]
            for quote in self.request["repair_quotes"]:
                if quote["status"] == "PENDING":
                    quote.update(fields)
            return SimpleNamespace(data=deepcopy(self.request["repair_quotes"]))

        database.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.side_effect = update_quotes
        self.start_patch("app.repair_requests.service.auth_repository.get_role_by_code").side_effect = (
            lambda code: {"id": code}
        )
        self.start_patch("app.repair_requests.service.auth_repository.get_user_by_id").return_value = None
        self.start_patch("app.repair_requests.service.repository.get_repair_request_by_id").side_effect = (
            lambda request_id: deepcopy(self.request)
        )
        self.start_patch("app.repair_requests.service.repository.get_quotes_by_repair_id").side_effect = (
            lambda request_id: deepcopy(self.request["repair_quotes"])
        )
        self.start_patch("app.repair_requests.service.repository.get_quote_items").return_value = []
        def update_request(request_id, fields):
            self.request.update(fields)
            return deepcopy(self.request)

        self.update_request = self.start_patch("app.repair_requests.service.repository.update_repair_request")
        self.update_request.side_effect = update_request
        self.history = self.start_patch("app.repair_requests.service.repository.add_status_history")

        app = FastAPI()
        app.include_router(router)
        app.dependency_overrides[get_current_user] = lambda: self.customer
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def start_patch(self, target):
        patcher = patch(target)
        mock = patcher.start()
        self.addCleanup(patcher.stop)
        return mock

    @staticmethod
    def quote(quote_id, status, price, created_at="2026-10-03T01:00:00+00:00"):
        return {
            "id": quote_id,
            "repair_id": "REPAIR0001",
            "status": status,
            "estimated_price": price,
            "created_at": created_at,
        }

    def fetch(self):
        response = self.client.get("/repair-requests/REPAIR0001")
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def respond(self, status, reason=None):
        response = self.client.patch(
            "/repair-requests/REPAIR0001/status",
            json={"status": status, "cancel_reason": reason},
        )
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()
        self.assertEqual(data["status"], status)
        self.assertEqual(self.history.call_args.args[0]["status"], status)
        return data

    def test_initial_pending_quote_has_no_approved_amount(self):
        data = self.fetch()
        self.assertEqual(float(data["initial_estimate"]), 450000)
        self.assertEqual(float(data["approved_estimate"]), 0)
        self.assertEqual(data["quotes"][0]["status"], "PENDING")

    def test_pending_quote_preserves_display_amount_when_total_is_missing(self):
        self.request["total_amount"] = None
        data = self.fetch()
        self.assertEqual(float(data["total_amount"]), 450000)
        self.assertEqual(float(data["approved_estimate"]), 0)

    def test_customer_approves_initial_quote(self):
        data = self.respond("ESTIMATE_APPROVED")
        self.assertEqual(data["quotes"][0]["status"], "ACCEPTED")
        self.assertEqual(float(data["approved_estimate"]), 450000)
        self.assertEqual(float(data["total_amount"]), 450000)

    def test_customer_rejects_initial_quote_with_reason(self):
        data = self.respond("ESTIMATE_REJECTED", "Không đồng ý giá")
        self.assertEqual(data["quotes"][0]["status"], "REJECTED")
        self.assertEqual(float(data["approved_estimate"]), 0)
        self.assertEqual(self.request["repair_quotes"][0]["reject_reason"], "Không đồng ý giá")
        self.assertEqual(data["quote"]["reject_reason"], "Không đồng ý giá")
        self.assertEqual(self.history.call_args.args[0]["note"], "Không đồng ý giá")

    def test_replacement_for_rejected_quote_has_no_approved_amount(self):
        self.request["repair_quotes"][0]["status"] = "REJECTED"
        self.request["repair_quotes"].append(
            self.quote("REVISED001", "PENDING", 350000, "2026-10-03T02:00:00+00:00")
        )
        data = self.fetch()
        self.assertEqual(data["quote"]["id"], "REVISED001")
        self.assertEqual(float(data["approved_estimate"]), 0)

    def add_supplementary_quote(self):
        self.request["repair_quotes"][0]["status"] = "ACCEPTED"
        self.request["repair_quotes"].append(
            self.quote("EXTRA00001", "PENDING", 100000, "2026-10-03T02:00:00+00:00")
        )

    def test_pending_supplementary_quote_does_not_increase_approved_amount(self):
        self.add_supplementary_quote()
        self.request["repair_quotes"].append(self.quote("REJECTED01", "REJECTED", 75000))
        data = self.fetch()
        self.assertEqual(float(data["approved_estimate"]), 450000)

    def test_customer_approves_supplementary_quote(self):
        self.add_supplementary_quote()
        data = self.respond("ESTIMATE_APPROVED")
        self.assertEqual(float(data["approved_estimate"]), 550000)
        self.assertEqual(float(data["total_amount"]), 550000)
        self.assertTrue(all(quote["status"] == "ACCEPTED" for quote in data["quotes"]))

    def test_customer_rejects_supplementary_quote(self):
        self.add_supplementary_quote()
        data = self.respond("ESTIMATE_REJECTED", "Không cần thiết")
        self.assertEqual(float(data["approved_estimate"]), 450000)
        self.assertEqual(float(data["total_amount"]), 450000)
        self.assertEqual(data["quote"]["status"], "REJECTED")

    def as_technician(self):
        self.customer = {"sub": "TECH000001", "role": "TECHNICIAN"}
        self.request["technician_id"] = self.customer["sub"]
        self.start_patch("app.repair_requests.service._get_technicians_map").return_value = {}

    def test_rejected_initial_quote_cannot_start_repair(self):
        self.respond("ESTIMATE_REJECTED", "Không đồng ý giá")
        self.as_technician()
        response = self.client.patch(
            "/repair-requests/REPAIR0001/status", json={"status": "REPAIRING"}
        )
        self.assertEqual(response.status_code, 409, response.text)
        self.assertEqual(self.request["status"], "ESTIMATE_REJECTED")

    def test_rejected_supplementary_quote_can_continue_approved_repair(self):
        self.add_supplementary_quote()
        self.respond("ESTIMATE_REJECTED", "Không cần thiết")
        self.as_technician()
        data = self.respond("REPAIRING")
        self.assertEqual(float(data["approved_estimate"]), 450000)
        self.assertEqual(float(data["total_amount"]), 450000)

    def test_quote_rejection_database_error_preserves_request_status(self):
        self.database.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.side_effect = RuntimeError("Database unavailable")
        response = self.client.patch(
            "/repair-requests/REPAIR0001/status",
            json={"status": "ESTIMATE_REJECTED", "cancel_reason": "Không đồng ý giá"},
        )
        self.assertEqual(response.status_code, 500, response.text)
        self.assertEqual(self.request["status"], "WAITING_FOR_APPROVAL")
        self.history.assert_not_called()

    def test_quote_rejection_without_pending_quote_preserves_request_status(self):
        self.request["repair_quotes"] = []
        response = self.client.patch(
            "/repair-requests/REPAIR0001/status", json={"status": "ESTIMATE_REJECTED"}
        )
        self.assertEqual(response.status_code, 404, response.text)
        self.assertEqual(self.request["status"], "WAITING_FOR_APPROVAL")
        self.history.assert_not_called()

    def create_revised_quote(self):
        def store_quote(fields):
            quote = {**fields, "created_at": "2026-10-03T03:00:00+00:00"}
            self.request["repair_quotes"].append(quote)
            return deepcopy(quote)

        self.start_patch("app.repair_requests.service.repository.create_quote").side_effect = store_quote
        response = self.client.post(
            "/repair-requests/REPAIR0001/quotes",
            json={"estimated_price": 350000, "labor_fee": 350000},
        )
        self.assertEqual(response.status_code, 201, response.text)
        self.assertEqual(response.json()["status"], "PENDING")
        self.assertEqual(self.request["status"], "WAITING_FOR_APPROVAL")
        return self.fetch()

    def test_technician_can_resubmit_rejected_initial_quote(self):
        self.respond("ESTIMATE_REJECTED", "Không đồng ý giá")
        self.as_technician()
        data = self.create_revised_quote()
        self.assertEqual(float(data["approved_estimate"]), 0)
        self.assertEqual(float(data["total_amount"]), 350000)
        self.assertEqual(data["quote"]["diagnosis_note"], "Báo giá sửa chữa")

    def test_resubmitted_supplementary_quote_preserves_approved_amount(self):
        self.add_supplementary_quote()
        self.respond("ESTIMATE_REJECTED", "Không cần thiết")
        self.as_technician()
        data = self.create_revised_quote()
        self.assertEqual(float(data["approved_estimate"]), 450000)
        self.assertEqual(float(data["total_amount"]), 450000)
        self.assertEqual(data["quote"]["diagnosis_note"], "Báo giá bổ sung / Chi phí phát sinh")

    def test_technician_list_returns_quote_history_and_rejection_reason(self):
        self.add_supplementary_quote()
        self.respond("ESTIMATE_REJECTED", "Không cần thiết")
        self.as_technician()
        self.start_patch("app.repair_requests.service.repository.get_repair_requests").return_value = ([deepcopy(self.request)], 1)
        self.start_patch("app.repair_requests.service.repository.get_repair_images_by_repair_ids").return_value = []
        self.database.table.return_value.select.return_value.in_.return_value.order.return_value.execute.return_value = SimpleNamespace(
            data=sorted(deepcopy(self.request["repair_quotes"]), key=lambda quote: quote["created_at"], reverse=True)
        )
        response = self.client.get("/repair-requests/technician/me")
        self.assertEqual(response.status_code, 200, response.text)
        item = response.json()["items"][0]
        self.assertEqual(float(item["approved_estimate"]), 450000)
        self.assertEqual(item["quote"]["reject_reason"], "Không cần thiết")
        self.assertEqual(len(item["quotes"]), 2)

    def prepare_repair(self, estimate=1200000):
        self.request["status"] = "REPAIRING"
        self.request["total_amount"] = estimate
        self.request["repair_quotes"][0].update(status="ACCEPTED", estimated_price=estimate)
        self.as_technician()

    def pay(self, amount, status="PAID"):
        self.payment_lookup.return_value = {"id": "PAYMENT001", "repair_id": "REPAIR0001", "amount": amount, "payment_status": status}

    def finish(self, amount, paid=True):
        # Đơn có phí chỉ hoàn tất được sau khi thanh toán đã được xác nhận
        if paid and self.payment_lookup.return_value is None:
            self.pay(amount)
        return self.client.patch(
            "/repair-requests/REPAIR0001/status",
            json={"status": "COMPLETED", "final_cost": amount},
        )

    def test_final_cost_equal_to_estimate_completes(self):
        self.prepare_repair()
        response = self.finish(1200000)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["status"], "COMPLETED")
        self.assertEqual(float(response.json()["total_amount"]), 1200000)
        self.assertIsNotNone(self.request.get("completed_at"))

    def test_final_cost_below_estimate_completes_with_actual_amount(self):
        self.prepare_repair()
        response = self.finish(1000000)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["status"], "COMPLETED")
        self.assertEqual(float(response.json()["total_amount"]), 1000000)
        self.assertEqual(float(response.json()["approved_estimate"]), 1200000)

    def test_completed_paid_repair_cannot_change_final_cost(self):
        self.prepare_repair()
        response1 = self.finish(1200000)
        self.assertEqual(response1.status_code, 200, response1.text)
        self.assertEqual(self.request["status"], "COMPLETED")
        self.assertEqual(float(response1.json()["total_amount"]), 1200000)

        # Đã thu 1.200.000 đ nên không được đổi chi phí thực tế khác số tiền đã thanh toán
        response2 = self.finish(1000000)
        self.assertEqual(response2.status_code, 422, response2.text)
        self.assertEqual(self.request["total_amount"], 1200000)

    def test_final_cost_above_estimate_preserves_repairing_status(self):
        self.prepare_repair()
        response = self.finish(1500000)
        self.assertEqual(response.status_code, 422, response.text)
        self.assertEqual(self.request["status"], "REPAIRING")
        self.assertEqual(self.request["total_amount"], 1200000)
        self.history.assert_not_called()

    def test_zero_final_cost_is_saved_without_falling_back_to_estimate(self):
        self.prepare_repair()
        response = self.finish(0)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(float(response.json()["total_amount"]), 0)

    def test_free_approved_estimate_does_not_allow_unapproved_additional_cost(self):
        self.prepare_repair(0)
        response = self.finish(300000)
        self.assertEqual(response.status_code, 422, response.text)
        self.assertEqual(self.request["status"], "REPAIRING")

    def test_pending_supplementary_quote_blocks_completion(self):
        self.prepare_repair()
        self.request["repair_quotes"].append(self.quote("EXTRA00001", "PENDING", 300000))
        response = self.finish(1200000)
        self.assertEqual(response.status_code, 409, response.text)
        self.assertEqual(self.request["status"], "REPAIRING")

    def test_rejected_quote_is_not_an_approved_completion_limit(self):
        self.prepare_repair()
        self.request["repair_quotes"][0]["status"] = "REJECTED"
        response = self.finish(1000000)
        self.assertEqual(response.status_code, 409, response.text)
        self.assertEqual(self.request["status"], "REPAIRING")

    def test_cannot_complete_when_quote_lookup_fails(self):
        self.prepare_repair()
        self.start_patch("app.repair_requests.service.repository.get_quotes_by_repair_id").side_effect = RuntimeError("Database unavailable")
        response = self.finish(1500000)
        self.assertEqual(response.status_code, 500, response.text)
        self.assertEqual(self.request["status"], "REPAIRING")

    def test_completion_is_not_reported_when_request_update_fails(self):
        self.prepare_repair()
        self.update_request.side_effect = None
        self.update_request.return_value = None
        response = self.finish(1200000)
        self.assertEqual(response.status_code, 500, response.text)
        self.assertEqual(self.request["status"], "REPAIRING")
        self.history.assert_not_called()

    def test_negative_final_cost_is_rejected(self):
        self.prepare_repair()
        response = self.finish(-1)
        self.assertEqual(response.status_code, 422, response.text)
        self.assertEqual(self.request["status"], "REPAIRING")

    def store_created_quotes(self):
        def store_quote(fields):
            quote = {**fields, "created_at": "2026-10-03T03:00:00+00:00", "items": []}
            self.request["repair_quotes"].append(quote)
            return deepcopy(quote)

        def store_item(fields):
            quote = next(quote for quote in self.request["repair_quotes"] if quote["id"] == fields["quote_id"])
            quote["items"].append(deepcopy(fields))
            return deepcopy(fields)

        self.start_patch("app.repair_requests.service.repository.create_quote").side_effect = store_quote
        self.start_patch("app.repair_requests.service.repository.create_quote_item").side_effect = store_item

    def submit_additional_cost(self):
        response = self.client.post("/repair-requests/REPAIR0001/quotes", json={
            "items": [{"item_name": "Linh kiện phát sinh", "item_type": "SPARE_PART", "quantity": 1, "unit_price": 300000, "subtotal": 300000}],
            "parts_cost": 300000, "labor_fee": 0, "estimated_price": 300000, "total_amount": 300000,
        })
        self.assertEqual(response.status_code, 201, response.text)
        self.assertEqual(self.request["status"], "WAITING_FOR_APPROVAL")
        self.assertEqual(self.request["total_amount"], 1200000)
        return response.json()

    def test_approve_additional_cost_then_complete_at_new_limit(self):
        self.prepare_repair()
        self.store_created_quotes()
        quote = self.submit_additional_cost()
        self.assertEqual(sum(item["subtotal"] for item in quote["items"]), 300000)
        self.customer = {"sub": "CUSTOMER01", "role": "CUSTOMER"}
        approved = self.respond("ESTIMATE_APPROVED")
        self.assertEqual(float(approved["approved_estimate"]), 1500000)
        self.as_technician()
        self.respond("REPAIRING")
        response = self.finish(1500000)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(float(response.json()["total_amount"]), 1500000)

    def test_reject_additional_cost_preserves_original_completion_limit(self):
        self.prepare_repair()
        self.store_created_quotes()
        self.submit_additional_cost()
        self.customer = {"sub": "CUSTOMER01", "role": "CUSTOMER"}
        rejected = self.respond("ESTIMATE_REJECTED", "Không đồng ý")
        self.assertEqual(float(rejected["approved_estimate"]), 1200000)
        self.as_technician()
        self.respond("REPAIRING")
        denied = self.finish(1500000, paid=False)
        self.assertEqual(denied.status_code, 422, denied.text)
        response = self.finish(1200000)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(float(response.json()["total_amount"]), 1200000)

    def test_supplementary_quote_cannot_include_old_costs_under_a_smaller_total(self):
        self.prepare_repair()
        response = self.client.post("/repair-requests/REPAIR0001/quotes", json={
            "items": [{"item_name": "Toàn bộ linh kiện", "item_type": "SPARE_PART", "quantity": 1, "unit_price": 1500000}],
            "parts_cost": 1500000, "estimated_price": 300000, "total_amount": 300000,
        })
        self.assertEqual(response.status_code, 422, response.text)
        self.assertEqual(self.request["status"], "REPAIRING")

    def test_second_pending_supplementary_quote_is_rejected(self):
        self.prepare_repair()
        self.store_created_quotes()
        self.submit_additional_cost()
        response = self.client.post("/repair-requests/REPAIR0001/quotes", json={"labor_fee": 300000, "estimated_price": 300000})
        self.assertEqual(response.status_code, 409, response.text)
        self.assertEqual(len(self.request["repair_quotes"]), 2)



    def store_quote_updates(self):
        def update_pending(quote_id, fields):
            quote = next((q for q in self.request["repair_quotes"] if q["id"] == quote_id and q["status"] == "PENDING"), None)
            if not quote:
                return None
            quote.update(fields)
            return deepcopy(quote)

        self.start_patch("app.repair_requests.service.repository.update_pending_quote").side_effect = update_pending
        self.start_patch("app.repair_requests.service.repository.create_quote_item").side_effect = lambda fields: deepcopy(fields)
        self.deleted_items = self.start_patch("app.repair_requests.service.repository.delete_quote_items_by_ids")
        self.quote_history = self.start_patch("app.repair_requests.service.repository.add_quote_history")

    def edit_quote(self, quote_id, price):
        return self.client.put(f"/repair-requests/REPAIR0001/quotes/{quote_id}", json={
            "items": [{"item_name": "Bo mạch", "item_type": "SPARE_PART", "quantity": 1, "unit_price": price, "subtotal": price}],
            "parts_cost": price, "labor_fee": 0, "estimated_price": price, "total_amount": price,
        })

    def test_technician_edits_pending_quote_in_place(self):
        self.as_technician()
        self.store_quote_updates()
        self.start_patch("app.repair_requests.service.repository.get_quote_items").return_value = [{"id": "OLDITEM001"}]
        response = self.edit_quote("INITIAL001", 300000)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["id"], "INITIAL001")
        self.assertEqual(response.json()["status"], "PENDING")
        self.assertEqual(len(self.request["repair_quotes"]), 1)
        self.assertEqual(self.request["repair_quotes"][0]["estimated_price"], 300000)
        self.assertEqual(self.request["total_amount"], 300000)
        self.deleted_items.assert_called_once_with(["OLDITEM001"])
        self.assertEqual(self.quote_history.call_args.args[0]["action"], "UPDATED")
        self.assertIn("450,000 đ → 300,000 đ", self.history.call_args.args[0]["note"])

    def test_editing_supplementary_quote_preserves_approved_total(self):
        self.prepare_repair()
        self.request["repair_quotes"].append(self.quote("EXTRA00001", "PENDING", 300000))
        self.request["status"] = "WAITING_FOR_APPROVAL"
        self.store_quote_updates()
        response = self.edit_quote("EXTRA00001", 200000)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self.request["total_amount"], 1200000)
        self.assertEqual(self.request["repair_quotes"][1]["estimated_price"], 200000)

    def test_answered_quote_cannot_be_edited(self):
        self.request["repair_quotes"][0]["status"] = "ACCEPTED"
        self.as_technician()
        self.store_quote_updates()
        response = self.edit_quote("INITIAL001", 300000)
        self.assertEqual(response.status_code, 409, response.text)
        self.assertEqual(self.request["repair_quotes"][0]["estimated_price"], 450000)

    def test_other_technician_cannot_edit_quote(self):
        self.as_technician()
        self.request["technician_id"] = "TECH000002"
        self.store_quote_updates()
        response = self.edit_quote("INITIAL001", 300000)
        self.assertEqual(response.status_code, 403, response.text)

    def test_customer_cannot_approve_quote_edited_after_viewing(self):
        self.request["repair_quotes"][0]["updated_at"] = "2026-10-03T05:00:00+00:00"
        response = self.client.patch("/repair-requests/REPAIR0001/status", json={
            "status": "ESTIMATE_APPROVED", "quote_id": "INITIAL001", "quote_updated_at": "2026-10-03T01:00:00+00:00",
        })
        self.assertEqual(response.status_code, 409, response.text)
        self.assertEqual(self.request["status"], "WAITING_FOR_APPROVAL")
        self.assertEqual(self.request["repair_quotes"][0]["status"], "PENDING")

    def test_customer_approves_viewed_quote_version(self):
        self.request["repair_quotes"][0]["updated_at"] = "2026-10-03T05:00:00+00:00"
        chain = self.database.table.return_value.update.return_value.eq.return_value.eq.return_value
        chain.eq.return_value.eq.return_value.execute.side_effect = chain.execute.side_effect
        response = self.client.patch("/repair-requests/REPAIR0001/status", json={
            "status": "ESTIMATE_APPROVED", "quote_id": "INITIAL001", "quote_updated_at": "2026-10-03T05:00:00Z",
        })
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["quotes"][0]["status"], "ACCEPTED")

    def test_unpaid_repair_cannot_be_completed(self):
        self.prepare_repair()
        for status in (None, "UNPAID", "PENDING"):
            if status:
                self.pay(1200000, status)
            response = self.finish(1200000, paid=False)
            self.assertEqual(response.status_code, 400, response.text)
            self.assertEqual(self.request["status"], "REPAIRING")
        self.history.assert_not_called()

    def test_free_repair_completes_without_payment(self):
        self.prepare_repair()
        response = self.finish(0, paid=False)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self.request["status"], "COMPLETED")

    def submit_final_cost(self, amount):
        return self.client.post("/repair-requests/REPAIR0001/final-cost", json={"final_cost": amount})

    def test_final_cost_is_saved_without_completing(self):
        self.prepare_repair()
        response = self.submit_final_cost(1000000)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self.request["status"], "REPAIRING")
        self.assertEqual(self.request["total_amount"], 1000000)
        self.history.assert_not_called()

    def test_final_cost_cannot_exceed_approved_estimate(self):
        self.prepare_repair()
        response = self.submit_final_cost(1500000)
        self.assertEqual(response.status_code, 422, response.text)
        self.assertEqual(self.request["total_amount"], 1200000)

    def test_final_cost_cannot_change_after_customer_reported_payment(self):
        self.prepare_repair()
        self.pay(1200000, "PENDING")
        response = self.submit_final_cost(1000000)
        self.assertEqual(response.status_code, 400, response.text)
        self.assertEqual(self.request["total_amount"], 1200000)
        self.assertEqual(self.submit_final_cost(1200000).status_code, 200)

    def test_customer_cannot_submit_final_cost(self):
        self.prepare_repair()
        self.customer = {"sub": "CUSTOMER01", "role": "CUSTOMER"}
        response = self.submit_final_cost(1000000)
        self.assertEqual(response.status_code, 403, response.text)

    def as_assigned_technician(self):
        self.request["technician_id"] = "TECH000001"
        self.customer = {"sub": "TECH000001", "role": "TECHNICIAN"}

    def test_technician_cannot_approve_or_reject_quote_for_customer(self):
        self.as_assigned_technician()
        for status in ("ESTIMATE_APPROVED", "ESTIMATE_REJECTED"):
            response = self.client.patch("/repair-requests/REPAIR0001/status", json={"status": status})
            self.assertEqual(response.status_code, 400, response.text)
        self.assertEqual(self.request["repair_quotes"][0]["status"], "PENDING")
        self.assertEqual(self.request["status"], "WAITING_FOR_APPROVAL")

    def test_repair_cannot_start_from_arrived_or_diagnosing_without_accepted_quote(self):
        self.as_assigned_technician()
        for status in ("ARRIVED", "DIAGNOSING"):
            self.request.update(status=status, repair_quotes=[])
            with patch("app.repair_requests.service._ensure_technician_not_busy"):
                response = self.client.patch("/repair-requests/REPAIR0001/status", json={"status": "REPAIRING"})
            self.assertEqual(response.status_code, 409, response.text)
            self.assertEqual(self.request["status"], status)

    def test_repair_starts_after_customer_accepted_quote(self):
        self.as_assigned_technician()
        self.request.update(status="ESTIMATE_APPROVED", repair_quotes=[self.quote("INITIAL001", "ACCEPTED", 450000)])
        response = self.client.patch("/repair-requests/REPAIR0001/status", json={"status": "REPAIRING"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self.request["status"], "REPAIRING")

    def test_quotes_are_hidden_from_unrelated_users(self):
        for user in ({"sub": "CUSTOMER02", "role": "CUSTOMER"}, {"sub": "TECH000009", "role": "TECHNICIAN"}):
            self.customer = user
            response = self.client.get("/repair-requests/REPAIR0001/quotes")
            self.assertEqual(response.status_code, 403, response.text)

    def test_quotes_visible_to_owner_and_assigned_technician(self):
        self.assertEqual(self.client.get("/repair-requests/REPAIR0001/quotes").status_code, 200)
        self.as_assigned_technician()
        self.assertEqual(self.client.get("/repair-requests/REPAIR0001/quotes").status_code, 200)


if __name__ == "__main__":
    unittest.main()
