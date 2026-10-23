"""Input contracts and API rejection before writes; all external HTTP is blocked."""
import base64
from datetime import datetime, timedelta
from decimal import Decimal
from io import BytesIO
import unittest
from unittest.mock import patch

from tests.notification_isolation import setUpModule, tearDownModule  # noqa: F401

from fastapi import FastAPI, UploadFile
from fastapi.testclient import TestClient
from pydantic import ValidationError
from starlette.datastructures import Headers

from app.api.v1.api import api_router
from app.auth.schemas import SignupRequest, LoginRequest, ResetPasswordRequest
from app.auth.utils import get_current_user
from app.core.exceptions import AppException
from app.core.handlers import register_exception_handlers
from app.core.storage import validate_image_upload
from app.core.validation import VN_TZ
from app.customers.schemas import CustomerCreate, CustomerUpdate
from app.devices.schemas import DeviceCreate, DeviceUpdate
from app.orders.schemas import OrderStatusUpdate, CancelOrderRequest
from app.payments.schemas import CustomerPaymentSubmitRequest, MoMoWebhookPayload, SepayWebhookPayload
from app.repair_requests.schemas import (
    RepairRequestCreate, RepairRequestStatusUpdate, QuoteCreateRequest,
    QuoteItemCreate, TechnicianRatingRequest,
)
from app.technicians.schemas import (
    BankAccountUpsert, TechnicianCreate, TechnicianUpdate, TechnicianSelfUpdate,
    TechnicianPresenceUpdate,
)
from app.users.schemas import UserCreate, UserUpdate


class OfflineTest(unittest.TestCase):
    def setUp(self):
        for target in ("httpx.HTTPTransport.handle_request", "requests.sessions.Session.request"):
            mock = self.mock(target, side_effect=AssertionError("External HTTP is forbidden in validation tests"))
            self.addCleanup(mock.assert_not_called)

    def mock(self, target, **kwargs):
        patcher = patch(target, **kwargs)
        result = patcher.start()
        self.addCleanup(patcher.stop)
        return result


class InputContractTests(OfflineTest):
    def test_identity_fields_are_consistent_across_domains(self):
        common = {"full_name": "Test", "email": "test@example.com", "password": "12345678", "phone": "0912345678"}
        for schema, valid in (
            (CustomerCreate, common),
            (UserCreate, {**common, "role_id": "CUSTOMER"}),
            (TechnicianCreate, common),
            (SignupRequest, {"name": "Test", "otp_code": "123456", **{k: v for k, v in common.items() if k != "full_name"}}),
        ):
            schema.model_validate(valid)
            name = "name" if schema is SignupRequest else "full_name"
            for field, invalid in ((name, "   "), ("phone", "abc"), ("phone", "09١٢٣٤٥٦٧٨"),
                                   ("email", "not-email"), ("password", "1"),
                                   ("password", "😀" * 25), ("password", " " * 8)) + (
                                   (("otp_code", "12345"), ("otp_code", "abcdef")) if schema is SignupRequest else ()):
                with self.subTest(schema=schema.__name__, field=field, invalid=invalid), self.assertRaises(ValidationError):
                    schema.model_validate({**valid, field: invalid})

    def test_names_are_trimmed_and_passwords_are_preserved(self):
        model = SignupRequest(name="  Test  ", email="test@example.com", password="  secret  ", phone=" 0912345678 ", otp_code="123456")
        self.assertEqual(model.name, "Test")
        self.assertEqual(model.phone, "0912345678")
        self.assertEqual(model.password, "  secret  ")
        self.assertEqual(LoginRequest(email="0912345678", password="secret").email, "0912345678")
        self.assertEqual(ResetPasswordRequest(phone="0912345678", otp_code="123456", new_password="12345678").otp_code, "123456")

    def test_patch_omission_is_distinct_from_explicit_null(self):
        for schema in (CustomerUpdate, UserUpdate, TechnicianSelfUpdate, TechnicianUpdate):
            self.assertEqual(schema().model_dump(exclude_unset=True), {})
            for value in (None, "", "  "):
                with self.subTest(schema=schema.__name__, value=value), self.assertRaises(ValidationError):
                    schema(full_name=value)
        self.assertIsNone(CustomerUpdate(phone="").phone)
        for data in ({"email": None}, {"role_id": None}, {"is_active": None}, {"is_active": "false"}):
            with self.subTest(data=data), self.assertRaises(ValidationError):
                UserUpdate(**data)
        self.assertIsNone(TechnicianSelfUpdate(bank_account=None).bank_account)

    def test_unknown_fields_and_control_characters_are_rejected(self):
        for schema, data in ((TechnicianSelfUpdate, {"is_online": True}),
                             (CustomerUpdate, {"role_id": "ADMIN"}),
                             (UserUpdate, {"full_name": "a\x00b"}),
                             (DeviceUpdate, {"customer_id": "CUSTOMER01"})):
            with self.subTest(schema=schema.__name__), self.assertRaises(ValidationError):
                schema.model_validate(data)

    def test_technician_bank_and_kyc_identity(self):
        bank = dict(bank_code="MB", bank_name="MB Bank", account_number="0012345678", account_holder="Test")
        self.assertEqual(BankAccountUpsert(**bank).account_number, "0012345678")
        TechnicianSelfUpdate(bank_account=bank)
        TechnicianSelfUpdate(**bank)
        for data in ({**bank, "account_number": "abc!"}, {**bank, "bank_code": ""},
                     {**bank, "account_holder": " "}, {"account_number": "123"}):
            with self.subTest(data=data), self.assertRaises(ValidationError):
                BankAccountUpsert(**data)
        with self.assertRaises(ValidationError):
            TechnicianSelfUpdate(account_number="123")
        with self.assertRaises(ValidationError):
            TechnicianSelfUpdate(bank_account=bank, **bank)
        for data in ({"full_name": "Test"}, {"full_name": "Test", "phone": "0912345678", "password": "12345678", "id_card_number": "abc"}):
            with self.assertRaises(ValidationError):
                TechnicianCreate(**data)

    def test_coordinates_in_every_write_schema(self):
        for latitude, longitude in ((999, 106), (10, 999), ("NaN", 106), (True, 106), (10, None)):
            for schema, fields in (
                (RepairRequestCreate, dict(device_id="DEVICE0001", issue_type="BATTERY", latitude=latitude, longitude=longitude)),
                (TechnicianUpdate, dict(last_latitude=latitude, last_longitude=longitude)),
                (TechnicianPresenceUpdate, dict(is_online=False, last_latitude=latitude, last_longitude=longitude)),
            ):
                with self.subTest(schema=schema.__name__, latitude=latitude, longitude=longitude), self.assertRaises(ValidationError):
                    schema(**fields)
        with self.assertRaises(ValidationError):
            TechnicianPresenceUpdate(is_online=True)
        with self.assertRaises(ValidationError):
            RepairRequestCreate(device_id="DEVICE0001", issue_type="BATTERY", is_sos=True)
        TechnicianPresenceUpdate(is_online=True, last_latitude=0, last_longitude=0)

    def test_booking_formats_past_dates_and_legacy_aliases(self):
        tomorrow = (datetime.now(VN_TZ).date() + timedelta(days=1)).isoformat()
        yesterday = (datetime.now(VN_TZ).date() - timedelta(days=1)).isoformat()
        valid = dict(device_id="DEVICE0001", issue_type="GENERAL", booking_date=tomorrow, booking_slot="09:00")
        RepairRequestCreate(**valid)
        RepairRequestCreate(device_id="DEVICE0001", issue_type="GENERAL", appointment_date=tomorrow, appointment_slot="09:00")
        for changes in ({"booking_date": "not-date"}, {"booking_date": yesterday},
                        {"booking_date": "2099-02-30"}, {"booking_slot": "99:99"},
                        {"booking_slot": "9:00"}, {"booking_date": None},
                        {"appointment_date": "2099-01-01"}):
            with self.subTest(changes=changes), self.assertRaises(ValidationError):
                RepairRequestCreate(**{**valid, **changes})

    def test_urls_and_image_list_limits(self):
        for url in ("not-url", "javascript:alert(1)", "blob:test", "data:image/png,test", "https://user:pass@example.com/image"):
            with self.subTest(url=url), self.assertRaises(ValidationError):
                RepairRequestCreate(device_id="DEVICE0001", issue_type="BATTERY", images=[url])
        with self.assertRaises(ValidationError):
            RepairRequestCreate(device_id="DEVICE0001", issue_type="BATTERY", images=["https://example.com/image"] * 21)
        DeviceCreate(device_type="SCOOTER", manufacturer="Test", model_name="Test", image_url="https://example.com/image.png")

    def test_device_types_and_dates(self):
        valid = dict(device_type="ELECTRIC_BIKE", manufacturer="Test", model_name="Test", manufacturing_year=2020, purchase_date="2021-01-01")
        self.assertEqual(DeviceCreate(**valid).device_type, "SCOOTER")
        self.assertIsNone(DeviceCreate(**{**valid, "serial_number": " "}).serial_number)
        for field, value in (("device_type", "unknown"), ("manufacturer", " "),
                             ("manufacturing_year", True), ("manufacturing_year", 2100),
                             ("purchase_date", "2099-01-01"), ("purchase_date", "2019-01-01"),
                             ("purchase_date", 0), ("purchase_date", "2020-01-01T00:00:00")):
            with self.subTest(field=field), self.assertRaises(ValidationError):
                DeviceCreate(**{**valid, field: value})

    def test_money_rejects_negative_nonfinite_fractional_overflow_and_boolean(self):
        for value in (-1, "NaN", "Infinity", "0.01", "1000000000000", True):
            for field in ("labor_fee", "parts_cost", "laborCost", "partsCost", "estimated_price", "total_amount"):
                with self.subTest(field=field, value=value), self.assertRaises(ValidationError):
                    QuoteCreateRequest(**{field: value})
            for field in ("total_amount", "final_cost", "totalCost"):
                with self.subTest(field=field, value=value), self.assertRaises(ValidationError):
                    RepairRequestStatusUpdate(status="COMPLETED", **{field: value})
        QuoteCreateRequest(labor_fee=0, estimated_price=0)
        QuoteCreateRequest(estimated_price=1000)  # legacy total-only quote

    def test_quote_aliases_item_totals_and_overall_totals(self):
        item = dict(item_name="Part", item_type="SPARE_PART", quantity=2, unit_price=100, subtotal=200)
        quote = QuoteCreateRequest(items=[item], parts_cost=200, labor_fee=0, total_amount=200, estimated_price=200)
        self.assertEqual(quote.items[0].unit_price, Decimal(100))
        for changes in ({"parts_cost": 0}, {"total_amount": 201}, {"laborCost": 1}):
            with self.subTest(changes=changes), self.assertRaises(ValidationError):
                QuoteCreateRequest(**{**quote.model_dump(exclude_unset=True), **changes})
        for changes in ({"quantity": 0}, {"quantity": True}, {"quantity": "1.001"},
                        {"subtotal": 0}, {"price": 0}, {"item_type": "wrong"}, {"item_name": " "}):
            with self.subTest(changes=changes), self.assertRaises(ValidationError):
                QuoteItemCreate(**{**item, **changes})
        with self.assertRaises(ValidationError):
            QuoteCreateRequest(items=[dict(item_name="Part", quantity=1, price=999999999999)] * 2)
        with self.assertRaises(ValidationError):
            RepairRequestStatusUpdate(status="COMPLETED", total_amount=0, final_cost=100)
        with self.assertRaises(ValidationError):
            QuoteCreateRequest(labor_fee=0, total_amount=100)

    def test_payment_webhook_values_and_signed_strings(self):
        payload = dict(partnerCode="partner", orderId="order", requestId="request", amount=0,
                       orderInfo="  signed info  ", orderType="momo_wallet", transId=0,
                       resultCode=1006, message=" OK ", payType="atm", responseTime=1, signature="a" * 64)
        model = MoMoWebhookPayload(**payload, providerNewField="accepted")
        self.assertEqual(model.orderInfo, payload["orderInfo"])
        self.assertEqual(model.message, payload["message"])
        for key, value in (("amount", True), ("amount", -1), ("transId", -1), ("responseTime", "1")):
            with self.subTest(field=key), self.assertRaises(ValidationError):
                MoMoWebhookPayload(**{**payload, key: value})
        for value in (-1, "NaN", True, "1.5"):
            with self.assertRaises(ValidationError):
                SepayWebhookPayload(id=1, transferAmount=value)
        self.assertEqual(CustomerPaymentSubmitRequest(payment_method="cash").payment_method, "CASH")

    def test_orders_and_rating_reject_untyped_values(self):
        for schema, data in ((OrderStatusUpdate, {"status": ["CANCELLED"]}),
                             (CancelOrderRequest, {"reason": {"text": "cancel"}}),
                             (TechnicianRatingRequest, {"rating": True}),
                             (TechnicianRatingRequest, {"rating": 6}),
                             (TechnicianRatingRequest, {"rating": 5, "tags": [" "]})):
            with self.subTest(schema=schema.__name__), self.assertRaises(ValidationError):
                schema(**data)


class ApiValidationTests(OfflineTest):
    def setUp(self):
        super().setUp()
        from app.customers.service import require_admin as customer_admin, require_customer
        from app.technicians.service import require_admin as tech_admin, require_technician
        from app.users.service import require_admin as user_admin
        app = FastAPI()
        register_exception_handlers(app)
        app.include_router(api_router, prefix="/api/v1")
        # This module is currently not mounted by api_router; validate its contract too.
        from app.users.router import router as users_router
        app.include_router(users_router, prefix="/api/v1")
        identity = lambda: {"sub": "ADMIN00001", "role": "ADMIN", "role_id": "ADMIN"}
        for dependency in (get_current_user, customer_admin, tech_admin, user_admin, require_customer, require_technician):
            app.dependency_overrides[dependency] = identity
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def test_invalid_bodies_return_field_errors_without_calling_services(self):
        cases = [
            ("post", "/auth/signup", {"name": " ", "email": "test@example.com", "password": "12345678"}, "app.auth.router.register_customer"),
            ("post", "/users", {"full_name": "Test", "email": "test@example.com", "password": "12345678", "role_id": "ADMIN", "phone": "abc"}, "app.users.router.create_user"),
            ("patch", "/customers/me", {"full_name": None}, "app.customers.router.update_own_customer"),
            ("patch", "/technicians/me", {"phone": "abc"}, "app.technicians.router.update_technician"),
            ("patch", "/technicians/me/presence", {"is_online": True, "last_latitude": 999, "last_longitude": 0}, "app.technicians.router.update_my_presence"),
            ("post", "/devices", {"device_type": "SCOOTER", "manufacturer": " ", "model_name": "Test"}, "app.devices.router.create_device"),
            ("post", "/repair-requests", {"device_id": "DEVICE0001", "issue_type": "BATTERY", "latitude": 999, "longitude": 106}, "app.repair_requests.router.create_request"),
            ("post", "/repair-requests/REPAIR0001/quotes", {"labor_fee": -1}, "app.repair_requests.router.create_quote_for_request"),
            ("patch", "/repair-requests/REPAIR0001/status", {"status": "COMPLETED", "final_cost": True}, "app.repair_requests.router.update_request_status"),
            ("patch", "/orders/REPAIR0001/status", {"status": ["CANCELLED"]}, "app.orders.router.update_order_status"),
            ("patch", "/orders/REPAIR0001/cancel", {"reason": {"text": "cancel"}}, "app.orders.router.cancel_order"),
            ("post", "/payments/repair/REPAIR0001/customer-submit", {"payment_method": "unknown"}, "app.payments.router.customer_submit_payment"),
        ]
        for method, path, body, target in cases:
            with self.subTest(path=path), patch(target) as operation:
                response = self.client.request(method, "/api/v1" + path, json=body)
                self.assertEqual(response.status_code, 422, response.text)
                self.assertEqual(response.json()["code"], "VALIDATION_ERROR")
                self.assertTrue(response.json()["details"][0]["field"])
                operation.assert_not_called()

    def test_invalid_query_and_path_values_never_reach_services(self):
        cases = [
            ("/users/bad$id", "app.users.router.fetch_user"),
            ("/devices?customer_id=" + "X" * 11, "app.devices.router.fetch_all_devices"),
            ("/orders?status=unknown", "app.orders.router.fetch_orders"),
            ("/repair-requests/me?status=unknown", "app.repair_requests.router.fetch_my_requests"),
            ("/repair-requests/reverse-geocode?latitude=NaN&longitude=106", "app.repair_requests.router.reverse_geocode_location"),
            ("/technicians?kyc_status=unknown", "app.technicians.router.fetch_all_technicians"),
            ("/payments/repair/REPAIR0001/qr?method=unknown", "app.payments.router.fetch_qr"),
            ("/customers?page=0", "app.customers.router.fetch_customers"),
        ]
        for path, target in cases:
            with self.subTest(path=path), patch(target) as operation:
                response = self.client.get("/api/v1" + path)
                self.assertEqual(response.status_code, 422, response.text)
                operation.assert_not_called()

    def test_openapi_documents_all_routes_and_input_errors(self):
        response = self.client.get("/openapi.json")
        self.assertEqual(response.status_code, 200, response.text)
        schemas = response.json()["components"]["schemas"]
        self.assertIn("OrderStatusUpdate", schemas)
        self.assertIn("additionalProperties", schemas["TechnicianSelfUpdate"])

    def test_database_constraint_errors_are_client_errors(self):
        from postgrest import APIError
        for code, status in (("23505", 409), ("23503", 422), ("23502", 422), ("23514", 422),
                             ("22001", 422), ("22003", 422), ("22P02", 422), ("08006", 500)):
            with self.subTest(code=code), patch("app.orders.router.fetch_orders", side_effect=APIError({
                "code": code, "message": "internal database details", "details": "private input", "hint": None,
            })):
                response = self.client.get("/api/v1/orders")
                self.assertEqual(response.status_code, status, response.text)
                self.assertNotIn("private input", response.text)
                self.assertNotIn("internal database details", response.text)


class ServiceValidationTests(OfflineTest):
    def setUp(self):
        super().setUp()
        self.mock("app.repair_requests.service._role_id", side_effect=lambda code: code)

    def test_invalid_direct_quote_cannot_write(self):
        from app.repair_requests.service import create_quote_for_request
        self.mock("app.repair_requests.service.repository.get_repair_request_by_id", return_value={"id": "REPAIR0001", "status": "DIAGNOSING", "technician_id": "TECH000001"})
        self.mock("app.repair_requests.service.repository.get_quotes_by_repair_id", return_value=[])
        write = self.mock("app.repair_requests.service.repository.create_quote")
        with self.assertRaises(AppException) as error:
            create_quote_for_request("REPAIR0001", {"labor_fee": -100}, {"sub": "TECH000001", "role": "TECHNICIAN"})
        self.assertEqual(error.exception.status_code, 422)
        write.assert_not_called()

    def test_duplicate_technician_identity_is_rejected_before_insert(self):
        from app.technicians.service import create_technician
        self.mock("app.technicians.service.get_technician_by_id_card_number", return_value=None)
        self.mock("app.technicians.service.auth_repository.get_user_by_email", return_value=None)
        self.mock("app.technicians.service.auth_repository.get_user_by_phone", return_value={"id": "OTHERUSER"})
        database = self.mock("app.technicians.service.supabase")
        with self.assertRaises(AppException) as error:
            create_technician(dict(full_name="Test", phone="0912345678", password="12345678"))
        self.assertEqual(error.exception.status_code, 409)
        database.table.assert_not_called()

    def test_valid_technician_creation_uses_bounded_internal_placeholder(self):
        from app.technicians.service import create_technician
        self.mock("app.technicians.service.get_technician_by_id_card_number", return_value=None)
        self.mock("app.technicians.service.auth_repository.get_user_by_email", return_value=None)
        self.mock("app.technicians.service.auth_repository.get_user_by_phone", return_value=None)
        self.mock("app.technicians.service._role_id", return_value="TECHNICIAN")
        self.mock("app.technicians.service.supabase")
        self.mock("app.technicians.service.fetch_technician_by_user_id", return_value={})
        insert = self.mock("app.technicians.service.insert_technician")
        create_technician(dict(full_name="Test", phone="0912345678", password="12345678"))
        profile = insert.call_args.args[0]
        self.assertTrue(profile["id_card_number"].startswith("ID-"))
        self.assertLessEqual(len(profile["id_card_number"]), 12)

    def test_partial_device_dates_are_checked_against_existing_values(self):
        from app.devices.service import update_device
        self.mock("app.devices.service.fetch_device_by_id", return_value={"id": "DEVICE0001", "purchase_date": "2020-01-01", "manufacturing_year": 2019})
        write = self.mock("app.devices.service.update_device_in_db")
        with self.assertRaises(AppException) as error:
            update_device("DEVICE0001", DeviceUpdate(manufacturing_year=2021), {"sub": "CUSTOMER01"})
        self.assertEqual(error.exception.status_code, 422)
        write.assert_not_called()

    def test_admin_cannot_enable_technician_without_gps(self):
        from app.technicians.service import update_technician
        self.mock("app.technicians.service.fetch_technician_by_user_id", return_value={"is_online": False})
        write = self.mock("app.technicians.service.update_technician_in_db")
        with self.assertRaises(AppException) as error:
            update_technician("TECH000001", TechnicianUpdate(is_online=True))
        self.assertEqual(error.exception.status_code, 422)
        write.assert_not_called()

    def test_patch_preserves_omitted_fields_and_explicit_bank_delete(self):
        from app.technicians.service import update_technician
        self.mock("app.technicians.service.fetch_technician_by_user_id", return_value={"is_online": False})
        database = self.mock("app.technicians.service.supabase")
        profile_write = self.mock("app.technicians.service.update_technician_in_db")
        bank_delete = self.mock("app.technicians.service.delete_bank_account")
        update_technician("TECH000001", TechnicianSelfUpdate(full_name=" Test "))
        database.table.return_value.update.assert_called_once_with({"full_name": "Test"})
        profile_write.assert_not_called()
        bank_delete.assert_not_called()
        update_technician("TECH000001", TechnicianSelfUpdate(bank_account=None))
        bank_delete.assert_called_once_with("TECH000001")

    def test_customer_cannot_silently_replace_invalid_device(self):
        from app.repair_requests.service import create_request
        self.mock("app.repair_requests.service.repository.get_device_for_customer", return_value=None)
        create = self.mock("app.repair_requests.service.repository.create_default_device_for_customer")
        with self.assertRaises(AppException) as error:
            create_request({"sub": "CUSTOMER01", "role": "CUSTOMER"}, {"device_id": "FOREIGN", "issue_type": "BATTERY"})
        self.assertEqual(error.exception.status_code, 403)
        create.assert_not_called()


class ImageValidationTests(OfflineTest):
    png = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==")

    def upload(self, content, filename="image.png", mime="image/png"):
        return UploadFile(BytesIO(content), filename=filename, headers=Headers({"content-type": mime}))

    def test_format_size_empty_and_spoofed_files(self):
        file = self.upload(self.png)
        self.assertEqual(validate_image_upload(file, max_size=1000), "png")
        self.assertEqual(file.file.tell(), 0)
        for content, filename, mime, limit, status in (
            (b"", "image.png", "image/png", 1000, 422),
            (b"<script>bad</script>", "image.png", "image/png", 1000, 415),
            (self.png, "image.jpg", "image/jpeg", 1000, 415),
            (self.png, "image.png", "image/jpeg", 1000, 415),
            (self.png, "image.exe", "image/png", 1000, 415),
            (self.png, "image.png", "image/png", 10, 413),
        ):
            with self.subTest(filename=filename, mime=mime, limit=limit), self.assertRaises(AppException) as error:
                validate_image_upload(self.upload(content, filename, mime), max_size=limit)
            self.assertEqual(error.exception.status_code, status)


if __name__ == "__main__":
    unittest.main()
