"""Browser regressions for rejection text and live technician rating updates.

Run with the User and Technician dev servers; uses no live database.
"""

from copy import deepcopy
import json
import os
from pathlib import Path
import sys
from types import SimpleNamespace
from urllib.parse import urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from playwright.sync_api import sync_playwright, expect
from test_quote_approval import QuoteApprovalTests
from test_technician_ratings import TechnicianRatingTests

USER_URL = os.environ.get("USER_APP_URL", "http://localhost:3002").rstrip("/")
TECH_URL = os.environ.get("TECHNICIAN_APP_URL", "http://localhost:3001").rstrip("/")


def respond(route, data, status=200):
    route.fulfill(status=status, content_type="application/json", body=json.dumps(data), headers=cors_headers(route))


def cors_headers(route):
    return {
        "Access-Control-Allow-Origin": route.request.headers.get("origin", USER_URL),
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Headers": "authorization,content-type",
        "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    }


def preflight(route):
    if route.request.method != "OPTIONS":
        return False
    route.fulfill(status=204, headers=cors_headers(route))
    return True


def page_for(browser, technician, api, errors):
    context = browser.new_context(viewport={"width": 390, "height": 844})
    user = {"id": "TECH000001" if technician else "CUSTOMER01", "name": "Test Account", "role": "TECHNICIAN" if technician else "CUSTOMER", "phone": "0900000000", "address": "Test address", "is_profile_complete": True, "is_new_user": False}
    context.add_init_script("localStorage.setItem('access_token', " + json.dumps("technician-test" if technician else "customer-test") + "); localStorage.setItem('user_info', JSON.stringify(" + json.dumps(user) + "));")
    page = context.new_page()
    page.set_default_timeout(12000)
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.route("**/api/v1/**", api)
    return context, page


def check_rejection(browser, selected, expected_reason):
    harness = QuoteApprovalTests()
    harness.setUp()
    harness.request["technician_id"] = "TECH000001"
    harness.add_supplementary_quote()
    harness.start_patch("app.repair_requests.service._get_technicians_map").return_value = {}
    harness.start_patch("app.repair_requests.service.repository.get_repair_requests").side_effect = lambda **kwargs: ([deepcopy(harness.request)], 1)
    harness.start_patch("app.repair_requests.service.repository.get_repair_images_by_repair_ids").return_value = []
    harness.database.table.return_value.select.return_value.in_.return_value.order.return_value.execute.side_effect = lambda: SimpleNamespace(data=sorted(deepcopy(harness.request["repair_quotes"]), key=lambda quote: quote["created_at"], reverse=True))
    errors, contexts, payloads = [], [], []

    def api(route):
        if preflight(route):
            return
        path = urlsplit(route.request.url).path.split("/api/v1")[-1]
        technician = route.request.headers.get("authorization") == "Bearer technician-test"
        harness.customer = {"sub": "TECH000001" if technician else "CUSTOMER01", "role": "TECHNICIAN" if technician else "CUSTOMER"}
        if path.startswith("/repair-requests"):
            payload = route.request.post_data_json if route.request.post_data else None
            if payload:
                payloads.append(payload)
            response = harness.client.request(route.request.method, path, json=payload)
            if response.status_code >= 400:
                print("API ERROR:", path, response.status_code, response.text, flush=True)
            respond(route, response.json(), response.status_code)
        else:
            respond(route, {"is_profile_complete": True, "is_online": False, "rating_avg": 5})

    try:
        context, user = page_for(browser, False, api, errors)
        contexts.append(context)
        context, tech = page_for(browser, True, api, errors)
        contexts.append(context)
        user.goto(USER_URL + "/home/history/REPAIR0001", wait_until="networkidle")
        user.get_by_role("button", name="Từ chối phát sinh", exact=True).click()
        user.get_by_role("radio", name=selected, exact=True).check()
        confirm = user.get_by_role("button", name="Xác nhận từ chối", exact=True)
        if selected == "Lý do khác (nhập bên dưới)":
            expect(confirm).to_be_disabled()
            user.get_by_placeholder("Nhập lý do từ chối cụ thể...").fill("  " + expected_reason + "  ")
        confirm.click()
        expect(user.get_by_role("button", name="Xác nhận từ chối", exact=True)).to_have_count(0)
        assert payloads[-1]["reject_reason"] == expected_reason, payloads
        assert harness.request["repair_quotes"][-1]["reject_reason"] == expected_reason
        tech.goto(TECH_URL, wait_until="networkidle")
        tech.get_by_role("button", name="Công việc", exact=True).click()
        tech.get_by_text("REQUEST001", exact=False).first.click()
        expect(tech.get_by_text("Lý do từ chối: " + expected_reason, exact=True)).to_be_visible()
        tech.reload(wait_until="networkidle")
        tech.get_by_role("button", name="Công việc", exact=True).click()
        tech.get_by_text("REQUEST001", exact=False).first.click()
        expect(tech.get_by_text("Lý do từ chối: " + expected_reason, exact=True)).to_be_visible()
        assert not errors, errors
        print("PASS: rejection reason survives API, technician display and reload: " + expected_reason, flush=True)
    except Exception:
        print("BROWSER STATE:", user.url, user.locator("body").inner_text()[:4000], "ERRORS:", errors, flush=True)
        raise
    finally:
        for context in contexts:
            context.close()
        harness.doCleanups()


def check_ratings(browser):
    harness = TechnicianRatingTests()
    harness.setUp()
    errors, contexts = [], []
    profile = harness.database.tables["technician_profiles"][0]

    def api(route):
        if preflight(route):
            return
        path = urlsplit(route.request.url).path.split("/api/v1")[-1]
        technician = route.request.headers.get("authorization") == "Bearer technician-test"
        role = "TECHNICIAN" if technician else "CUSTOMER"
        harness.user = {"sub": "TECH000001" if technician else "CUSTOMER01", "role": role, "role_id": role}
        if path == "/technicians/me" or path.endswith("/rating"):
            response = harness.client.request(route.request.method, path, json=route.request.post_data_json if route.request.post_data else None)
            respond(route, response.json(), response.status_code)
        elif path == "/repair-requests/REPAIR0001":
            respond(route, {
                "id": "REPAIR0001", "request_code": "REQUEST001", "status": "COMPLETED", "payment_status": "PAID",
                "total_amount": 450000, "location_address": "Test address", "created_at": "2026-10-19T01:00:00Z",
                "technician": {"id": "TECH000001", "name": "Test Technician", "rating": profile["rating_avg"], "reviews": 1},
            })
        elif path.startswith("/repair-requests"):
            respond(route, {"items": [], "total": 0, "page": 1, "limit": 20})
        else:
            respond(route, {"is_profile_complete": True, "is_online": False})

    try:
        context, tech = page_for(browser, True, api, errors)
        contexts.append(context)
        tech.goto(TECH_URL, wait_until="networkidle")
        expect(tech.get_by_text("5.0 / 5", exact=True)).to_be_visible()
        context, user = page_for(browser, False, api, errors)
        contexts.append(context)
        user.goto(USER_URL + "/home/history/REPAIR0001", wait_until="networkidle")
        user.get_by_title("1 sao", exact=True).click()
        user.locator("#rating-section button[type=submit]").click()
        expect(user.get_by_text("Cảm ơn bạn đã gửi đánh giá kỹ thuật viên!", exact=True)).to_be_visible()
        expect(user.locator(".rd-tech-rating")).to_contain_text("1 (1 đánh giá)")
        tech.bring_to_front()
        expect(tech.get_by_text("1.0 / 5", exact=True)).to_be_visible(timeout=20000)
        tech.get_by_role("button", name="Cá nhân", exact=True).click()
        expect(tech.get_by_text("1.0 / 5", exact=True)).to_be_visible()
        # Edit the existing review while the technician profile stays open.
        harness.submit(3)
        expect(tech.get_by_text("3.0 / 5", exact=True)).to_be_visible(timeout=20000)
        assert len(harness.database.tables["reviews"]) == 1
        assert not errors, errors
        print("PASS: 1-star submission updates customer card and open technician home; edited rating updates open profile", flush=True)
    finally:
        for context in contexts:
            context.close()
        harness.doCleanups()


if __name__ == "__main__":
    with sync_playwright() as playwright:
        options = {"headless": True}
        if os.environ.get("REPAIR_TEST_BROWSER_EXECUTABLE"):
            options["executable_path"] = os.environ["REPAIR_TEST_BROWSER_EXECUTABLE"]
        browser = playwright.chromium.launch(**options)
        try:
            for reason in (
                "Không đồng ý với chi phí phát sinh này",
                "Chi phí vượt quá khả năng / dự toán ngân sách",
                "Chưa cần thay thế các hạng mục linh kiện này",
            ):
                check_rejection(browser, reason, reason)
            check_rejection(browser, "Lý do khác (nhập bên dưới)", "Tôi muốn thay linh kiện vào lần bảo dưỡng sau")
            check_ratings(browser)
        finally:
            browser.close()
