"""Security, payment and password reset regressions; no live services or database."""
import json
import os
import time
import unittest
from copy import deepcopy
from types import SimpleNamespace
from unittest.mock import patch

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.auth import google, service as auth, sms
from app.auth.router import router as auth_router
from app.auth.schemas import GoogleAuthRequest
from app.core.exceptions import AppException
from app.payments import service as payments
from app.payments.schemas import MoMoWebhookPayload, SepayWebhookPayload
from app.orders import repository as orders_repository
from app.repair_requests import service as repairs


class MockedTest(unittest.TestCase):
    def mock(self, target, **kwargs):
        patcher = patch(target, **kwargs)
        result = patcher.start()
        self.addCleanup(patcher.stop)
        return result

    def rejects(self, status, operation, *args):
        with self.assertRaises(AppException) as error:
            operation(*args)
        self.assertEqual(error.exception.status_code, status)


class GoogleIdentityTests(MockedTest):
    @classmethod
    def setUpClass(cls):
        cls.key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    def setUp(self):
        environment = patch.dict(os.environ, {"GOOGLE_CLIENT_ID": "test-client"})
        environment.start(); self.addCleanup(environment.stop)
        self.mock("app.auth.google._jwks.get_signing_key_from_jwt", return_value=SimpleNamespace(key=self.key.public_key()))
        self.claims = {"sub": "google-user", "aud": "test-client", "iss": "https://accounts.google.com", "exp": int(time.time()) + 600, "email": "verified@example.com", "email_verified": True}

    def token(self, **claims):
        return jwt.encode({**self.claims, **claims}, self.key, algorithm="RS256")

    def test_valid_identity(self):
        self.assertEqual(google.verify_google_id_token(self.token())["sub"], "google-user")

    def test_wrong_audience_issuer_expiry_or_unverified_email(self):
        for claims in ({"aud": "attacker"}, {"iss": "attacker"}, {"exp": 1}, {"email_verified": False}):
            with self.subTest(claims=claims):
                self.rejects(401, google.verify_google_id_token, self.token(**claims))

    def test_forged_signature(self):
        other = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        self.rejects(401, google.verify_google_id_token, jwt.encode(self.claims, other, algorithm="RS256"))

    def test_email_only_login_rejected_before_database(self):
        lookup = self.mock("app.auth.service.repository.get_user_by_email")
        app = FastAPI(); app.include_router(auth_router)
        with TestClient(app) as client:
            response = client.post("/auth/google", json={"email": "admin@example.com"})
        self.assertEqual(response.status_code, 422)
        lookup.assert_not_called()

    def test_database_identity_comes_from_verified_token(self):
        self.mock("app.auth.service.verify_google_id_token", return_value=self.claims)
        lookup = self.mock("app.auth.service.repository.get_user_by_email", return_value={"id": "CUSTOMER01", "email": self.claims["email"], "role_id": "CUSTOMER", "role": {"id": "CUSTOMER", "code": "CUSTOMER"}, "is_active": True})
        self.mock("app.auth.service.repository.get_role_by_code", return_value={"id": "CUSTOMER"})
        auth.authenticate_or_register_google_user(GoogleAuthRequest(id_token=self.token()))
        lookup.assert_called_once_with(self.claims["email"])


class PaymentVerificationTests(MockedTest):
    def setUp(self):
        self.customer = {"sub": "CUSTOMER01", "role": "CUSTOMER"}
        self.repair = {"id": "REPAIR0001", "customer_id": "CUSTOMER01", "technician_id": "TECH000001", "status": "COMPLETED", "total_amount": 1200000}
        self.payment = {"id": "PAYMENT001", "repair_id": "REPAIR0001", "payment_code": "HS12345678", "amount": 1200000, "payment_method": "BANK_TRANSFER", "payment_status": "UNPAID"}
        self.mock("app.payments.service.repository.get_repair_request", side_effect=lambda _: deepcopy(self.repair))
        self.mock("app.payments.service.repository.get_payment_by_repair_id", side_effect=lambda _: deepcopy(self.payment))
        self.mock("app.payments.service.repository.get_payment_by_code", side_effect=lambda _: deepcopy(self.payment))
        self.mock("app.payments.service.repository.get_payment_by_transaction_code", return_value=None)
        self.writes = self.mock("app.payments.service.repository.update_unpaid_payment", side_effect=self.update)
        self.begin = self.mock("app.payments.service.repository.begin_momo_payment", side_effect=self.update)
        self.history = self.mock("app.payments.service.repository.add_payment_history")
        self.mock("app.payments.service.SEPAY_API_KEY", new="test-key")
        self.mock("app.payments.service.SEPAY_BANK_ACCOUNT", new="123456789")
        self.config = {"partner_code": "partner", "access_key": "access", "secret_key": "secret", "create_url": "https://example.com/create", "query_url": "https://example.com/query"}
        self.mock("app.payments.service._momo_config", return_value=self.config)
        self.gateway = self.mock("app.payments.service._momo_post")

    def update(self, payment_id, data):
        self.payment.update(data)
        return deepcopy(self.payment)

    def sepay(self, amount, **kwargs):
        return SepayWebhookPayload(id=1, code=self.payment["payment_code"], accountNumber="123456789", transferType="in", transferAmount=amount, **kwargs)

    def momo(self):
        self.payment.update(payment_method="QR", payment_status="PENDING", note=json.dumps({"provider": "MOMO", "request_id": "request"}))

    def test_foreign_customer_cannot_confirm_or_create_payments(self):
        foreign = {"sub": "CUSTOMER02", "role": "CUSTOMER"}
        for operation in (payments.confirm_momo_payment, payments.create_momo_payment, payments.fetch_qr):
            self.rejects(403, operation, "REPAIR0001", foreign)
        self.writes.assert_not_called(); self.gateway.assert_not_called()

    def test_unassigned_technician_cannot_pay(self):
        self.rejects(403, payments.fetch_qr, "REPAIR0001", {"sub": "TECH000002", "role": "TECHNICIAN"})

    def test_customer_submit_payment_moves_to_pending(self):
        result = payments.customer_submit_payment("REPAIR0001", self.customer, "BANK_TRANSFER")
        self.assertTrue(result["success"])
        self.assertEqual(self.payment["payment_status"], "PENDING")
        self.assertEqual(self.payment["payment_method"], "BANK_TRANSFER")

    def test_technician_confirm_payment_moves_to_paid(self):
        assigned_tech = {"sub": "TECH000001", "role": "TECHNICIAN"}
        result = payments.technician_confirm_payment("REPAIR0001", assigned_tech, "CASH")
        self.assertTrue(result["success"])
        self.assertEqual(self.payment["payment_status"], "PAID")
        self.assertEqual(self.payment["payment_method"], "CASH")

    def test_unassigned_or_admin_cannot_confirm_technician_payment(self):
        foreign_tech = {"sub": "TECH000002", "role": "TECHNICIAN"}
        admin = {"sub": "ADMIN00001", "role": "ADMIN"}
        customer = {"sub": "CUSTOMER01", "role": "CUSTOMER"}
        self.rejects(403, payments.technician_confirm_payment, "REPAIR0001", foreign_tech)
        self.rejects(403, payments.technician_confirm_payment, "REPAIR0001", admin)
        self.rejects(403, payments.technician_confirm_payment, "REPAIR0001", customer)

    def test_partial_sepay_transfer_does_not_settle_invoice(self):
        self.assertTrue(payments.handle_sepay_webhook(self.sepay(1), "Apikey test-key")["success"])
        self.writes.assert_not_called(); self.history.assert_not_called()

    def test_sepay_exact_amount_settles_once(self):
        payload = self.sepay(1200000)
        payments.handle_sepay_webhook(payload, "Apikey test-key")
        payments.handle_sepay_webhook(payload, "Apikey test-key")
        self.assertEqual(self.payment["payment_status"], "PAID")
        self.assertEqual(self.writes.call_count, 1); self.assertEqual(self.history.call_count, 1)

    def test_outgoing_or_wrong_account_transfer_is_ignored(self):
        for field, value in (("transferType", "out"), ("accountNumber", "attacker")):
            payload = self.sepay(1200000).model_copy(update={field: value})
            payments.handle_sepay_webhook(payload, "Apikey test-key")
        self.writes.assert_not_called()

    def test_sepay_requires_authentication(self):
        self.rejects(401, payments.handle_sepay_webhook, self.sepay(1200000), "Apikey wrong")

    def test_zero_cost_qr_does_not_fall_back_to_estimate(self):
        self.repair["total_amount"] = 0
        result = payments.fetch_qr("REPAIR0001", self.customer)
        self.assertEqual(float(result["payment"]["amount"]), 0)
        self.assertEqual(result["payment"]["payment_status"], "PAID")
        self.assertIsNone(result["qr_url"])

    def test_bank_transfer_requires_assigned_technician_bank_account(self):
        self.mock("app.technicians.repository.get_bank_account", return_value=None)
        self.rejects(503, payments.fetch_qr, "REPAIR0001", self.customer)
        self.writes.assert_not_called()

    def test_zero_cost_momo_never_contacts_gateway(self):
        self.repair["total_amount"] = 0
        result = payments.create_momo_payment("REPAIR0001", self.customer)
        self.assertEqual(result["amount"], 0); self.assertIsNone(result["pay_url"])
        self.gateway.assert_not_called()

    def test_unfinished_order_or_missing_final_amount_cannot_pay(self):
        for changes in ({"status": "CANCELLED"}, {"total_amount": None}):
            self.repair.update(status="COMPLETED", total_amount=1200000); self.repair.update(changes)
            self.rejects(409, payments.fetch_qr, "REPAIR0001", self.customer)
        self.writes.assert_not_called()

    def test_cod_maps_to_supported_cash_method(self):
        result = payments.fetch_qr("REPAIR0001", self.customer, "COD")
        self.assertEqual(result["payment"]["payment_method"], "CASH"); self.assertIsNone(result["qr_url"])
        self.assertEqual(self.payment["payment_status"], "UNPAID")

    def test_momo_pending_query_cannot_mark_paid(self):
        self.momo()
        self.gateway.return_value = {"partnerCode": "partner", "orderId": "HS12345678", "amount": 1200000, "resultCode": 1000, "transId": 0}
        result = payments.confirm_momo_payment("REPAIR0001", self.customer)
        self.assertFalse(result["success"]); self.writes.assert_not_called()

    def test_momo_verified_query_settles_without_changing_repair(self):
        self.momo()
        original = deepcopy(self.repair)
        self.gateway.return_value = {"partnerCode": "partner", "orderId": "HS12345678", "amount": 1200000, "resultCode": 0, "transId": 123}
        result = payments.confirm_momo_payment("REPAIR0001", self.customer)
        self.assertTrue(result["success"]); self.assertEqual(self.payment["transaction_code"], "MOMO:123")
        self.assertEqual(self.repair, original)

    def test_momo_mismatched_invoice_query_is_rejected(self):
        self.momo()
        for changes in ({"amount": 1}, {"orderId": "foreign"}, {"partnerCode": "foreign"}):
            self.gateway.return_value = {"partnerCode": "partner", "orderId": "HS12345678", "amount": 1200000, "resultCode": 0, "transId": 123, **changes}
            self.rejects(401, payments.confirm_momo_payment, "REPAIR0001", self.customer)
        self.writes.assert_not_called()

    def test_momo_create_uses_gateway_invoice_and_supported_method(self):
        self.gateway.return_value = {"resultCode": 0, "payUrl": "https://example.com/pay"}
        result = payments.create_momo_payment("REPAIR0001", self.customer)
        payload = self.gateway.call_args.args[1]
        self.assertEqual(payload["orderId"], self.payment["payment_code"])
        self.assertEqual(payload["amount"], 1200000)
        self.assertEqual(self.payment["payment_method"], "QR")
        self.assertEqual(self.payment["payment_status"], "PENDING")
        self.assertEqual(result["pay_url"], "https://example.com/pay")

    def test_gateway_rejection_cannot_return_fake_payment_link(self):
        self.gateway.return_value = {"resultCode": 99}
        self.rejects(503, payments.create_momo_payment, "REPAIR0001", self.customer)
        self.assertEqual(self.payment["payment_status"], "FAILED")

    def test_momo_timeout_keeps_callback_mapping_and_reuses_request(self):
        from app.core.exceptions import ErrorCode
        self.gateway.side_effect = AppException(ErrorCode.SERVICE_UNAVAILABLE)
        self.rejects(503, payments.create_momo_payment, "REPAIR0001", self.customer)
        first = deepcopy(self.gateway.call_args.args[1])
        self.assertEqual(self.payment["payment_status"], "PENDING")
        self.assertEqual(json.loads(self.payment["note"])["request_id"], first["requestId"])
        self.gateway.side_effect = None
        self.gateway.return_value = {"resultCode": 0, "payUrl": "https://example.com/pay"}
        payments.create_momo_payment("REPAIR0001", self.customer)
        self.assertEqual(first, self.gateway.call_args.args[1])

    def test_cancelled_momo_can_retry_with_a_new_gateway_invoice(self):
        self.momo()
        self.gateway.return_value = {"partnerCode": "partner", "orderId": "HS12345678", "amount": 1200000, "resultCode": 1006, "transId": 0}
        result = payments.confirm_momo_payment("REPAIR0001", self.customer)
        self.assertEqual(result["payment_status"], "FAILED")
        self.gateway.return_value = {"resultCode": 0, "payUrl": "https://example.com/pay"}
        payments.create_momo_payment("REPAIR0001", self.customer)
        self.assertNotEqual(self.gateway.call_args.args[1]["orderId"], "HS12345678")
        self.assertEqual(self.payment["payment_status"], "PENDING")

    def test_momo_final_failure_callback_does_not_lock_payment_pending(self):
        self.momo()
        payments.handle_momo_webhook(self.callback(resultCode=1005))
        self.assertEqual(self.payment["payment_status"], "FAILED")
        payments.fetch_qr("REPAIR0001", self.customer, "COD")
        self.assertEqual(self.payment["payment_method"], "CASH")
        self.assertEqual(self.payment["payment_status"], "UNPAID")

    def test_concurrent_momo_initialization_uses_existing_claim_without_second_gateway_call(self):
        def claimed_elsewhere(*args):
            self.momo()
            return None
        self.begin.side_effect = claimed_elsewhere
        result = payments.create_momo_payment("REPAIR0001", self.customer)
        self.assertTrue(result["success"])
        self.gateway.assert_not_called()

    def callback(self, **changes):
        data = {"partnerCode": "partner", "orderId": "HS12345678", "requestId": "request", "amount": 1200000, "orderInfo": "test", "orderType": "momo_wallet", "transId": 123, "resultCode": 0, "message": "OK", "payType": "atm", "responseTime": 1, "extraData": "", **changes}
        data["signature"] = payments._signature({"accessKey": "access", **data}, "secret")
        return MoMoWebhookPayload(**data)

    def test_momo_signed_callback_is_idempotent(self):
        self.momo(); payload = self.callback()
        payments.handle_momo_webhook(payload); payments.handle_momo_webhook(payload)
        self.assertEqual(self.payment["payment_status"], "PAID"); self.assertEqual(self.writes.call_count, 1)

    def test_momo_bad_signature_amount_request_or_failure_never_settles(self):
        self.momo()
        for changes in ({"amount": 1}, {"requestId": "foreign"}):
            self.rejects(401, payments.handle_momo_webhook, self.callback(**changes))
        self.rejects(401, payments.handle_momo_webhook, self.callback().model_copy(update={"signature": "bad"}))
        payments.handle_momo_webhook(self.callback(resultCode=1000))
        self.writes.assert_not_called()


class AccessAndReviewTests(MockedTest):
    def setUp(self):
        self.mock("app.repair_requests.service.auth_repository.get_role_by_code", side_effect=lambda code: {"id": code})
        self.database = self.mock("app.db.database.supabase")
        self.mock("app.repair_requests.service.repository.supabase")
        self.repair = {"id": "REPAIR0001", "customer_id": "CUSTOMER01", "technician_id": "TECH000001", "status": "COMPLETED"}
        self.mock("app.repair_requests.service.repository.get_repair_request_by_id", return_value=self.repair)

    def test_unassigned_technician_cannot_create_quote(self):
        create = self.mock("app.repair_requests.service.repository.create_quote")
        self.rejects(403, repairs.create_quote_for_request, "REPAIR0001", {"estimated_price": 1}, {"sub": "TECH000002", "role": "TECHNICIAN"})
        create.assert_not_called()

    def test_unassigned_technician_cannot_read_repair(self):
        self.database.table.return_value.select.return_value.or_.return_value.maybe_single.return_value.execute.return_value = SimpleNamespace(data=self.repair)
        self.rejects(403, repairs.fetch_request, "REPAIR0001", {"sub": "TECH000002", "role": "TECHNICIAN"})

    def test_admin_can_create_for_customer_and_owns_audit_fields(self):
        self.mock("app.repair_requests.service.auth_repository.get_user_by_id", return_value={"id": "CUSTOMER01", "role_id": "CUSTOMER"})
        self.mock("app.repair_requests.service.repository.get_device_for_customer", return_value={"id": "DEVICE0001"})
        insert = self.mock("app.repair_requests.service.repository.create_repair_request", side_effect=lambda data: data)
        self.mock("app.repair_requests.service.repository.add_status_history")
        self.mock("app.repair_requests.service.fetch_request", return_value=self.repair)
        repairs.create_request({"sub": "ADMIN00001", "role": "ADMIN"}, {"customer_id": "CUSTOMER01", "device_id": "DEVICE0001", "issue_type": "BATTERY", "location_address": "Test"})
        record = insert.call_args.args[0]
        self.assertEqual(record["customer_id"], "CUSTOMER01"); self.assertEqual(record["created_by"], "ADMIN00001")

    def test_admin_cannot_choose_another_customers_device(self):
        self.mock("app.repair_requests.service.auth_repository.get_user_by_id", return_value={"role_id": "CUSTOMER"})
        self.mock("app.repair_requests.service.repository.get_device_for_customer", return_value=None)
        insert = self.mock("app.repair_requests.service.repository.create_repair_request")
        self.rejects(403, repairs.create_request, {"sub": "ADMIN00001", "role": "ADMIN"}, {"customer_id": "CUSTOMER01", "device_id": "FOREIGN"})
        insert.assert_not_called()

    def test_review_requires_owner_and_completed_order(self):
        save = self.mock("app.repair_requests.service.repository.save_review")
        self.rejects(403, repairs.submit_technician_rating, "REPAIR0001", {"rating": 5}, {"sub": "CUSTOMER02"})
        self.repair["status"] = "REPAIRING"
        self.rejects(400, repairs.submit_technician_rating, "REPAIR0001", {"rating": 5}, {"sub": "CUSTOMER01"})
        save.assert_not_called()

    def test_review_database_failure_does_not_report_success(self):
        self.mock("app.repair_requests.service.repository.save_review", side_effect=RuntimeError("Database unavailable"))
        self.rejects(500, repairs.submit_technician_rating, "REPAIR0001", {"rating": 5}, {"sub": "CUSTOMER01"})

    def test_review_success_is_persisted(self):
        save = self.mock("app.repair_requests.service.repository.save_review", return_value={"id": "REVIEW0001"})
        self.assertTrue(repairs.submit_technician_rating("REPAIR0001", {"rating": 4, "comment": "Good"}, {"sub": "CUSTOMER01"})["success"])
        self.assertEqual(save.call_args.args[0]["comment"], "Good")

    def test_admin_order_enrichment_reads_payment_status_column(self):
        database = self.mock("app.orders.repository.supabase")
        payment_query = database.table.return_value.select.return_value.in_.return_value.order.return_value
        payment_query.execute.return_value = SimpleNamespace(data=[{"repair_id": "REPAIR0001", "payment_method": "BANK_TRANSFER", "payment_status": "PAID", "amount": 1200000}])
        database.table.return_value.select.return_value.in_.return_value.execute.return_value = SimpleNamespace(data=[])
        order = {"id": "REPAIR0001"}
        enriched = orders_repository._enrich_orders([order])
        self.assertEqual(enriched[0]["payment_status"], "PAID")
        selections = [call.args[0] for call in database.table.return_value.select.call_args_list]
        self.assertIn("repair_id,payment_method,payment_status,amount", selections)


class PasswordResetTests(MockedTest):
    def setUp(self):
        self.mock("app.auth.service.repository.get_user_by_phone", return_value={"id": "TECH000001"})
        self.mock("app.auth.service.repository.get_latest_otp", return_value=None)
        self.mock("app.auth.service.repository.invalidate_unused_otps")
        self.mock("app.auth.service.repository.create_otp", return_value={"id": "OTP0000001"})
        self.used = self.mock("app.auth.service.repository.mark_otp_used")
        self.sender = self.mock("app.auth.service.send_password_reset_code")
        self.otp = self.mock("app.auth.service.repository.get_valid_otp", return_value={"id": "OTP0000001", "otp_code": "654321"})
        self.password = self.mock("app.auth.service.repository.update_user_password", return_value={"id": "TECH000001"})

    def test_reset_request_delivers_generated_code(self):
        auth.request_password_reset("0901234567")
        self.assertEqual(self.sender.call_args.args[0], "0901234567")
        self.assertEqual(len(self.sender.call_args.args[1]), 6)

    def test_delivery_failure_invalidates_unsent_code(self):
        from app.core.exceptions import ErrorCode
        self.sender.side_effect = AppException(ErrorCode.SERVICE_UNAVAILABLE)
        self.rejects(503, auth.request_password_reset, "0901234567")
        self.used.assert_called_once()

    def test_wrong_or_expired_code_cannot_change_password(self):
        self.rejects(400, auth.verify_password_reset_code, "0901234567", "123456")
        self.otp.return_value = None
        self.rejects(400, auth.reset_password, "0901234567", "654321", "NewPassword1")
        self.password.assert_not_called()

    def test_verify_then_reset_consumes_code_and_hashes_password(self):
        auth.verify_password_reset_code("0901234567", "654321")
        self.used.assert_not_called()
        auth.reset_password("0901234567", "654321", "NewPassword1")
        self.used.assert_called_once()
        self.assertNotEqual(self.password.call_args.args[1], "NewPassword1")

    def test_production_response_never_exposes_otp(self):
        self.mock("app.auth.service.OTP_EXPOSE_IN_RESPONSE", new=True)
        with patch.dict(os.environ, {"APP_ENV": "production"}):
            self.assertNotIn("otp_code", auth.request_password_reset("0901234567"))

    def test_sms_adapter_posts_code_to_configured_delivery_service(self):
        sender = self.mock("app.auth.sms.requests.post")
        with patch.dict(os.environ, {"SMS_WEBHOOK_URL": "https://example.com/sms", "SMS_WEBHOOK_TOKEN": "test-token"}):
            sms.send_password_reset_code("0901234567", "654321")
        self.assertEqual(sender.call_args.kwargs["json"]["code"], "654321")
        self.assertEqual(sender.call_args.kwargs["headers"]["Authorization"], "Bearer test-token")
        sender.return_value.raise_for_status.assert_called_once()

    def test_sms_production_without_delivery_service_does_not_fake_success(self):
        with patch.dict(os.environ, {"SMS_WEBHOOK_URL": "", "APP_ENV": "production", "OTP_EXPOSE_IN_RESPONSE": "true"}):
            self.rejects(503, sms.send_password_reset_code, "0901234567", "654321")


if __name__ == "__main__":
    unittest.main()
