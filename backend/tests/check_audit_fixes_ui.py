"""Browser regressions for the three apps; all API traffic uses test fixtures."""
import json
import os
import re
import sys
from copy import deepcopy
from datetime import datetime, timezone
from urllib.parse import parse_qs, urlsplit
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi import FastAPI
from fastapi.testclient import TestClient
from playwright.sync_api import expect, sync_playwright

from app.auth.router import router as auth_router
from test_audit_fixes import PasswordResetTests
from test_quote_approval import QuoteApprovalTests

ADMIN_URL = os.getenv("ADMIN_APP_URL", "http://localhost:3000")
USER_URL = os.getenv("USER_APP_URL", "http://localhost:3002")
TECH_URL = os.getenv("TECHNICIAN_APP_URL", "http://localhost:3001")
HEADERS = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*"}


def respond(route, data, status=200):
    route.fulfill(status=status, content_type="application/json", body=json.dumps(data), headers=HEADERS)


def preflight(route):
    if route.request.method == "OPTIONS":
        route.fulfill(status=204, headers=HEADERS)
        return True
    return False


def context_for(browser, role=None):
    context = browser.new_context(viewport={"width": 1440 if role == "ADMIN" else 430, "height": 1000})
    errors = []
    context.on("page", lambda page: page.on("pageerror", lambda error: errors.append(str(error))))
    def assert_no_errors(_):
        assert not errors, errors
    context.on("close", assert_no_errors)
    if role:
        user = {"id": "ADMIN00001" if role == "ADMIN" else "TECH000001" if role == "TECHNICIAN" else "CUSTOMER01", "name": "Test Account", "role": role, "phone": "0901234567", "address": "Test address", "is_profile_complete": True}
        app_url = ADMIN_URL if role == "ADMIN" else TECH_URL if role == "TECHNICIAN" else USER_URL
        app_origin = urlsplit(app_url)
        origin = f"{app_origin.scheme}://{app_origin.netloc}"
        context.add_init_script('if (location.origin === ' + json.dumps(origin) + ') { localStorage.setItem("access_token", "test-token");localStorage.setItem("isLoggedIn", "true");localStorage.setItem("user_info", JSON.stringify(' + json.dumps(user) + ')); }')
    return context


def check_lists_and_admin_creation(browser):
    harness = QuoteApprovalTests(); harness.setUp()
    harness.customer = {"sub": "ADMIN00001", "role": "ADMIN"}
    harness.start_patch("app.repair_requests.service.repository.get_device_for_customer").return_value = {"id": "DEVICE0001"}
    harness.start_patch("app.repair_requests.service.auth_repository.get_user_by_id").return_value = {"id": "CUSTOMER01", "role_id": "CUSTOMER"}
    def insert(record):
        harness.request.update(record)
        return deepcopy(harness.request)
    harness.start_patch("app.repair_requests.service.repository.create_repair_request").side_effect = insert
    created = []
    now = datetime.now(timezone.utc).isoformat()
    records = [{"id": f"REPAIR{i:04d}", "request_code": f"ORDER{i:04d}", "status": "COMPLETED", "created_at": now, "total_amount": 100000, "issue_type": "BATTERY", "issue_description": "Battery repair", "customer": {"full_name": "Test Customer"}, "device": {"model_name": "Test scooter"}} for i in range(101)]
    records[-1].update(request_code="OLDERORDER", status="ASSIGNED", customer={"full_name": "Older Customer"}, booking_date="TOMORROW", booking_slot="18:00")
    calls = []
    def api(route):
        if preflight(route): return
        url = urlsplit(route.request.url); path = url.path.split("/api/v1")[-1]
        if path == "/repair-requests" and route.request.method == "POST":
            created.append(route.request.post_data_json)
            response = harness.client.post(path, json=created[-1])
            route.fulfill(status=response.status_code, content_type="application/json", body=response.text, headers=HEADERS)
        elif path in ("/orders", "/repair-requests/me", "/repair-requests/technician/me"):
            params = parse_qs(url.query); page = int(params.get("page", [1])[0]); limit = int(params.get("limit", [20])[0]); calls.append((path, page))
            respond(route, {"items": deepcopy(records[(page - 1) * limit:page * limit]), "total": len(records), "page": page, "limit": limit})
        elif path == "/customers": respond(route, {"items": [{"id": "CUSTOMER01", "full_name": "Test Customer", "phone": "0901234567"}], "total": 1})
        elif path == "/devices": respond(route, [{"id": "DEVICE0001", "customer_id": "CUSTOMER01", "model_name": "Test scooter", "device_type": "SCOOTER", "manufacturer": "Test"}])
        elif path == "/technicians": respond(route, [])
        elif path.endswith("/me"): respond(route, {"id": "TECH000001", "full_name": "Test Account", "is_online": True, "is_profile_complete": True})
        else: respond(route, {"total_orders": 101, "by_status": {"COMPLETED": 100, "ASSIGNED": 1}})
    contexts = []
    try:
        context = context_for(browser, "ADMIN"); contexts.append(context)
        page = context.new_page(); page.route("**/api/v1/**", api)
        page.goto(ADMIN_URL + "/dashboard", wait_until="networkidle")
        page.get_by_role("button", name="Tạo đơn mới", exact=True).click()
        page.get_by_placeholder("VD: 123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM").fill("Test address")
        page.get_by_role("button", name="Tạo đơn ngay", exact=True).click()
        expect(page.get_by_text("Tạo đơn sửa chữa thành công!", exact=False).first).to_be_visible()
        assert created[0]["customer_id"] == "CUSTOMER01"
        print("PASS: Admin creates an order through the real API", flush=True)
        page.get_by_role("button", name="Yêu cầu sửa chữa", exact=True).click()
        page.get_by_placeholder(re.compile("Tìm theo mã đơn")).fill("OLDERORDER")
        expect(page.get_by_text("#OLDERORDER", exact=True)).to_be_visible()
        assert ("/orders", 2) in calls
        print("PASS: Admin search includes orders from server page 2", flush=True)
        for record in records: record["status"] = "REQUESTED"
        page.get_by_role("button", name="Lịch sử sửa chữa", exact=True).click()
        expect(page.get_by_text("Chưa có lịch sử đơn hoàn thành nào.", exact=True)).to_be_visible()
        print("PASS: Admin history excludes open orders when history is empty", flush=True)

        context = context_for(browser, "CUSTOMER"); contexts.append(context)
        page = context.new_page(); page.route("**/api/v1/**", api)
        page.goto(USER_URL + "/home/history", wait_until="networkidle")
        expect(page.get_by_text("OLDERORDER", exact=False).first).to_be_visible()
        assert ("/repair-requests/me", 2) in calls
        print("PASS: User history loads older orders beyond page 1", flush=True)

        records[-1]["status"] = "ACCEPTED"
        context = context_for(browser, "TECHNICIAN"); contexts.append(context)
        page = context.new_page(); page.route("**/api/v1/**", api)
        page.goto(TECH_URL, wait_until="networkidle")
        page.get_by_role("button", name="Công việc", exact=True).click()
        expect(page.get_by_text("OLDERORDER", exact=False).first).to_be_visible()
        assert ("/repair-requests/technician/me", 2) in calls
        page.get_by_role("button", name="Lịch hẹn", exact=True).click()
        expect(page.get_by_text("Older Customer", exact=False).first).to_be_visible()
        records[-1]["status"] = "COMPLETED"
        page.get_by_role("button", name="Lịch sử", exact=True).click()
        page.get_by_placeholder("Mã công việc hoặc tên khách hàng").fill("OLDERORDER")
        expect(page.get_by_text("OLDERORDER", exact=False).first).to_be_visible()
        print("PASS: Technician tasks, schedule and history include server page 2", flush=True)
    finally:
        for context in contexts: context.close()
        harness.doCleanups()


def check_payment_and_review(browser):
    harness = QuoteApprovalTests(); harness.setUp(); harness.prepare_repair()
    harness.customer = {"sub": "CUSTOMER01", "role": "CUSTOMER"}
    harness.request["status"] = "COMPLETED"
    harness.start_patch("app.repair_requests.service.auth_repository.get_user_by_id").return_value = {"id": "TECH000001", "full_name": "Test Technician", "phone": "0901234567"}
    harness.start_patch("app.repair_requests.service.repository.get_technician_profile").return_value = {"rating_avg": 5, "total_jobs_done": 1}
    save = harness.start_patch("app.repair_requests.service.repository.save_review")
    save.side_effect = RuntimeError("Database unavailable")
    paid = False
    def api(route):
        nonlocal paid
        if preflight(route): return
        path = urlsplit(route.request.url).path.split("/api/v1")[-1]
        if path.startswith("/repair-requests/"):
            response = harness.client.request(route.request.method, path, json=route.request.post_data_json if route.request.post_data else None)
            data = response.json()
            if route.request.method == "GET": data["payment_status"] = "PAID" if paid else "UNPAID"
            respond(route, data, response.status_code)
        elif path.endswith("/qr"):
            respond(route, {"qr_url": "https://example.com/qr.png", "bank_name": "Configured Bank", "bank_account": "123456789", "bank_account_name": "Configured Owner", "payment": {"amount": 1200000, "payment_code": "HSTEST"}})
        elif path.endswith("/momo"):
            respond(route, {"success": True, "order_id": "HSTEST", "amount": 1200000, "pay_url": "https://example.com/payment"})
        elif path.endswith("/momo-confirm"):
            respond(route, {"success": paid, "payment_status": "PAID" if paid else "PENDING", "message": "Chưa ghi nhận thanh toán thành công."})
        else: respond(route, {"is_profile_complete": True})
    context = context_for(browser, "CUSTOMER")
    try:
        page = context.new_page(); page.route("**/api/v1/**", api)
        page.goto(USER_URL + "/home/history/REPAIR0001", wait_until="networkidle")
        expect(page.get_by_role("button", name=re.compile("Thanh toán ngay"))).to_be_visible()
        page.get_by_role("button", name=re.compile("Gửi đánh giá kỹ thuật viên")).click()
        expect(page.get_by_role("alert").filter(has_text="Lỗi truy vấn cơ sở dữ liệu")).to_be_visible()
        assert page.evaluate('localStorage.getItem("emobi_rating_REPAIR0001")') is None
        save.side_effect = None; save.return_value = {"id": "REVIEW0001"}
        page.get_by_role("button", name=re.compile("Gửi đánh giá kỹ thuật viên")).click()
        expect(page.get_by_text("Đã gửi đánh giá", exact=False).first).to_be_visible()
        print("PASS: Rating API failure stays retryable and success is saved", flush=True)
        page.get_by_role("button", name=re.compile("Thanh toán ngay")).click()
        expect(page.get_by_text("Configured Bank", exact=True)).to_be_visible()
        expect(page.get_by_text("123456789", exact=True)).to_be_visible()
        page.get_by_role("button", name=re.compile(r"MoMo \(ATM\)")).click()
        page.get_by_role("button", name="Kiểm tra kết quả thanh toán", exact=True).click()
        expect(page.get_by_text("Chưa ghi nhận thanh toán thành công.", exact=True)).to_be_visible()
        expect(page.get_by_text("Thanh toán MoMo thành công!", exact=False)).to_have_count(0)
        paid = True
        page.get_by_role("button", name="Kiểm tra kết quả thanh toán", exact=True).click()
        expect(page.get_by_text("Thanh toán MoMo thành công!", exact=False)).to_be_visible(timeout=2000)
        page.get_by_role("button", name="Đóng", exact=True).click()
        expect(page.get_by_role("button", name=re.compile("Thanh toán ngay"))).to_have_count(0)
        print("PASS: Completed unpaid order is payable; pending MoMo is not reported as paid", flush=True)
    finally:
        context.close(); harness.doCleanups()


def check_password_reset(browser, technician=False):
    harness = PasswordResetTests(); harness.setUp()
    harness.mock("app.auth.service.OTP_EXPOSE_IN_RESPONSE", new=True)
    harness.mock("app.auth.service.secrets.randbelow", return_value=654321)
    app = FastAPI(); app.include_router(auth_router)
    client = TestClient(app)
    calls = []
    def api(route):
        if preflight(route): return
        path = urlsplit(route.request.url).path.split("/api/v1")[-1]
        calls.append(path)
        response = client.request(route.request.method, path, json=route.request.post_data_json if route.request.post_data else None)
        route.fulfill(status=response.status_code, content_type="application/json", body=response.text, headers=HEADERS)
    context = context_for(browser)
    try:
        page = context.new_page(); page.route("**/api/v1/**", api)
        page.on("dialog", lambda dialog: dialog.accept())
        if technician:
            page.goto(TECH_URL, wait_until="networkidle")
            page.get_by_role("button", name="Quên mật khẩu?", exact=True).click()
            page.get_by_placeholder("Nhập thông tin của bạn").fill("0901234567")
            page.get_by_role("button", name="Gửi mã xác thực", exact=True).click()
        else:
            page.goto(USER_URL + "/forgot-password", wait_until="networkidle")
            page.get_by_label("SỐ ĐIỆN THOẠI", exact=True).fill("0901234567")
            page.get_by_role("button", name="Gửi mã xác minh", exact=True).click()
        expect(page.get_by_text("654321", exact=False)).to_be_visible()
        inputs = page.locator('input[inputmode="numeric"]')
        for i, digit in enumerate("123456"): inputs.nth(i).fill(digit)
        page.get_by_role("button", name="Xác nhận", exact=True).click()
        if technician:
            expect(page.get_by_role("alert").filter(has_text=re.compile("OTP")).first).to_be_visible()
            page.get_by_role("button", name=re.compile("Thử lại")).click()
        else: expect(page.locator(".reset-error")).to_be_visible()
        for i, digit in enumerate("654321"): inputs.nth(i).fill(digit)
        page.get_by_role("button", name="Xác nhận", exact=True).click()
        if technician: page.get_by_role("button", name="Đặt lại mật khẩu", exact=True).click()
        page.get_by_placeholder("Nhập mật khẩu mới", exact=True).fill("NewPassword1!")
        page.get_by_placeholder("Nhập lại mật khẩu mới" if not technician else "Xác nhận mật khẩu", exact=True).fill("NewPassword1!")
        page.get_by_role("button", name="Cập nhật mật khẩu" if not technician else "Lưu mật khẩu & Đăng nhập", exact=True).click()
        expect(page.get_by_role("button", name="Đăng nhập", exact=True)).to_be_visible()
        harness.password.assert_called_once(); harness.used.assert_called_once()
        assert calls.count("/auth/verify-otp") == 2
        print("PASS: " + ("Technician" if technician else "User") + " OTP rejects wrong code, verifies real code and resets through backend", flush=True)
    finally:
        context.close(); client.close(); harness.doCleanups()


if __name__ == "__main__":
    with sync_playwright() as playwright:
        options = {"headless": True}
        if os.getenv("REPAIR_TEST_BROWSER_EXECUTABLE"): options["executable_path"] = os.environ["REPAIR_TEST_BROWSER_EXECUTABLE"]
        browser = playwright.chromium.launch(**options)
        try:
            check_lists_and_admin_creation(browser)
            check_payment_and_review(browser)
            check_password_reset(browser)
            check_password_reset(browser, technician=True)
        finally: browser.close()
