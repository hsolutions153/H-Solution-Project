from copy import deepcopy
import json
import os
from pathlib import Path
import re
import sys
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from playwright.sync_api import sync_playwright, expect
from test_quote_approval import QuoteApprovalTests

TECH_ID = 'TECH000001'
USER_APP_URL = os.environ.get('USER_APP_URL', 'http://localhost:3002').rstrip('/')
TECHNICIAN_APP_URL = os.environ.get('TECHNICIAN_APP_URL', 'http://localhost:3001').rstrip('/')


def scenario(browser, mode, final_amount=1200000):
    harness = QuoteApprovalTests()
    harness.setUp()
    harness.prepare_repair()
    harness.request['repair_quotes'][0].update(labor_fee=200000, parts_cost=1000000, items=[
        {'id': 'BASEPART01', 'quote_id': 'INITIAL001', 'item_name': 'Linh kiện ban đầu', 'item_type': 'SPARE_PART', 'quantity': 1, 'unit_price': 1000000, 'subtotal': 1000000},
        {'id': 'BASELABR01', 'quote_id': 'INITIAL001', 'item_name': 'Tiền công kỹ thuật viên', 'item_type': 'LABOR', 'quantity': 1, 'unit_price': 200000, 'subtotal': 200000},
    ])
    harness.store_created_quotes()
    harness.start_patch('app.repair_requests.service.repository.get_repair_requests').side_effect = lambda **kwargs: ([deepcopy(harness.request)], 1)
    harness.start_patch('app.repair_requests.service.repository.get_repair_images_by_repair_ids').return_value = []
    harness.database.table.return_value.select.return_value.in_.return_value.order.return_value.execute.side_effect = lambda: SimpleNamespace(
        data=sorted(deepcopy(harness.request['repair_quotes']), key=lambda quote: quote['created_at'], reverse=True)
    )
    harness.start_patch('app.repair_requests.service.repository.get_quote_items').side_effect = lambda quote_id: deepcopy(next((quote.get('items', []) for quote in harness.request['repair_quotes'] if quote['id'] == quote_id), []))
    calls, errors, contexts = [], [], []

    def api_route(route):
        if route.request.method == 'OPTIONS':
            route.fulfill(status=204, headers={'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*'})
            return
        path = route.request.url.split('/api/v1', 1)[-1]
        is_tech = route.request.headers.get('authorization') == 'Bearer technician-test'
        harness.customer = {'sub': TECH_ID if is_tech else 'CUSTOMER01', 'role': 'TECHNICIAN' if is_tech else 'CUSTOMER'}
        if path.startswith('/repair-requests'):
            payload = route.request.post_data_json if route.request.post_data else None
            calls.append((route.request.method, path, payload))
            response = harness.client.request(route.request.method, path, json=payload)
            route.fulfill(status=response.status_code, content_type='application/json', body=response.text, headers={'Access-Control-Allow-Origin': '*'})
        else:
            route.fulfill(status=200, content_type='application/json', body=json.dumps({
                'id': TECH_ID if is_tech else 'CUSTOMER01', 'full_name': 'Test Account', 'phone': '0900000000', 'address': 'Test address', 'is_profile_complete': True, 'is_online': True,
            }), headers={'Access-Control-Allow-Origin': '*'})

    def new_page(is_tech):
        context = browser.new_context(viewport={'width': 430, 'height': 932})
        contexts.append(context)
        context.add_init_script('localStorage.setItem("access_token", ' + json.dumps('technician-test' if is_tech else 'customer-test') + '); localStorage.setItem("user_info", JSON.stringify(' + json.dumps({
            'id': TECH_ID if is_tech else 'CUSTOMER01', 'name': 'Test Account', 'role': 'TECHNICIAN' if is_tech else 'CUSTOMER', 'phone': '0900000000', 'address': 'Test address', 'is_profile_complete': True, 'is_new_user': False,
        }) + '));')
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.route('**/api/v1/**', api_route)
        return page

    user, tech = new_page(False), new_page(True)
    try:
        user.goto(USER_APP_URL + '/home/history/REPAIR0001', wait_until='networkidle')
        tech.goto(TECHNICIAN_APP_URL + '/', wait_until='networkidle')
        tech.get_by_role('button', name='Công việc', exact=True).click()
        expect(tech.get_by_text('REQUEST001', exact=False).first).to_be_visible(timeout=12000)
        tech.get_by_text('REQUEST001', exact=False).first.click()
        final_input = tech.get_by_label('Chi phí thực tế', exact=True)
        expect(final_input).to_be_enabled()
        expect(final_input).to_have_value('1200000')
        finish = tech.get_by_role('button', name='Hoàn tất sửa chữa', exact=True)
        expect(finish).to_be_enabled()
        if mode in ('equal', 'lower', 'higher', 'zero'):
            final_input.fill(str(final_amount))
            finish.click()
            if mode == 'higher':
                expect(tech.get_by_role('heading', name='Chưa thể hoàn tất đơn', exact=True)).to_be_visible()
                assert harness.request['status'] == 'REPAIRING'
                assert not any(payload and payload.get('status') == 'COMPLETED' for _, _, payload in calls)
                assert not errors, errors
                print('PASS: Final 1.500.000 > Estimate 1.200.000 is blocked; request stays REPAIRING', flush=True)
                return
        else:
            tech.get_by_role('button', name='Thêm hạng mục phát sinh', exact=True).click()
            if mode == 'service':
                tech.get_by_label('Loại hạng mục', exact=True).select_option('SERVICE')
            tech.get_by_label('Tên hạng mục', exact=True).fill('Linh kiện phát sinh 300k')
            tech.get_by_label('Đơn giá (đ)', exact=True).fill('300000')
            tech.get_by_role('button', name='Thêm hạng mục', exact=True).click()
            expect(final_input).to_have_value('1500000')
            tech.get_by_role('button', name=re.compile('^Tạo báo giá bổ sung')).click()
            tech.get_by_role('button', name='Gửi khách hàng', exact=True).click()
            expect(tech.get_by_role('heading', name='Đã gửi chi phí phát sinh tới khách hàng', exact=True)).to_be_visible(timeout=12000)
            quote_posts = [payload for method, path, payload in calls if method == 'POST' and path.endswith('/quotes')]
            assert len(quote_posts) == 1, quote_posts
            payload = quote_posts[0]
            assert payload['estimated_price'] == 300000, payload
            assert payload['parts_cost'] == 300000 and payload['labor_fee'] == 0, payload
            assert payload['items'][0]['item_type'] == ('SERVICE' if mode == 'service' else 'SPARE_PART'), payload
            assert len(payload['items']) == 1 and payload['items'][0]['subtotal'] == 300000, payload
            assert 'ban đầu' not in payload['items'][0]['item_name'], payload
            assert harness.request['status'] == 'WAITING_FOR_APPROVAL'
            assert harness.request['total_amount'] == 1200000
            user.bring_to_front()
            expect(user.get_by_role('heading', name='Yêu Cầu Duyệt Chi Phí Phát Sinh Bổ Sung', exact=True)).to_be_visible(timeout=20000)
            panel = user.get_by_role('heading', name='Yêu Cầu Duyệt Chi Phí Phát Sinh Bổ Sung', exact=True).locator('xpath=../../..')
            expect(panel).to_contain_text('1.200.000')
            expect(panel).to_contain_text('+300.000')
            expect(panel).to_contain_text('1.500.000')
            expect(panel).not_to_contain_text('Linh kiện ban đầu')
            expect(tech.get_by_role('button', name='Tiếp tục sửa chữa', exact=True)).to_be_disabled()
            if mode in ('create', 'service'):
                user.reload(wait_until='networkidle')
                tech.reload(wait_until='networkidle')
                tech.get_by_role('button', name='Công việc', exact=True).click()
                tech.get_by_text('REQUEST001', exact=False).first.click()
                expect(user.get_by_role('heading', name='Yêu Cầu Duyệt Chi Phí Phát Sinh Bổ Sung', exact=True)).to_be_visible()
                expect(tech.get_by_role('button', name='Tiếp tục sửa chữa', exact=True)).to_be_disabled()
                assert not errors, errors
                print(f'PASS: {mode} adds only 300.000 and waits for customer approval', flush=True)
                return
            if mode == 'approve':
                user.get_by_role('button', name=re.compile('^Duyệt phát sinh')).click()
                expect(tech.get_by_role('heading', name='Khách hàng đã duyệt chi phí phát sinh', exact=True)).to_be_visible(timeout=12000)
                tech.get_by_role('button', name='Tiếp tục sửa chữa', exact=True).click()
                final_amount = 1500000
                expect(final_input).to_be_enabled()
                expect(final_input).to_have_value('1500000')
                expect(tech.locator('body')).to_contain_text('Linh kiện phát sinh 300k')
            else:
                user.get_by_role('button', name='Từ chối phát sinh', exact=True).click()
                user.get_by_role('button', name='Xác nhận từ chối', exact=True).click()
                expect(tech.get_by_role('heading', name='Khách hàng từ chối chi phí phát sinh', exact=True)).to_be_visible(timeout=12000)
                assert harness.request['repair_quotes'][-1]['reject_reason'] == 'Không đồng ý với chi phí phát sinh này'
                tech.get_by_role('button', name='Tiếp tục sửa chữa', exact=True).click()
                final_amount = 1200000
                expect(final_input).to_be_enabled()
                expect(final_input).to_have_value('1200000')
                expect(tech.locator('body')).not_to_contain_text('Linh kiện phát sinh 300k')
            finish.click()
        expect(tech.locator('body')).to_contain_text('Lịch sử', timeout=12000)
        assert harness.request['status'] == 'COMPLETED', harness.request['status']
        assert harness.request['total_amount'] == final_amount, harness.request['total_amount']
        completions = [payload for _, _, payload in calls if payload and payload.get('status') == 'COMPLETED']
        assert len(completions) == 1, completions
        assert completions[0]['final_cost'] == final_amount, completions
        user.reload(wait_until='networkidle')
        expect(user.locator('.rd-status-pill')).to_contain_text('Hoàn thành')
        amount_text = f'{final_amount:,}'.replace(',', '.')
        final_row = user.get_by_text('Chi phí thực tế nghiệm thu (Final Cost):', exact=False).locator('xpath=..')
        expect(final_row).to_contain_text(amount_text)
        print(f'PASS: {mode} -> COMPLETED, final cost {amount_text}, one completion API call, matching customer receipt', flush=True)
        assert not errors, errors
    except Exception:
        print('STATE:', harness.request['status'], harness.request['total_amount'], 'ERRORS:', errors, flush=True)
        raise
    finally:
        for context in contexts:
            context.close()
        harness.doCleanups()


with sync_playwright() as p:
    browser_options = {'headless': True}
    if os.environ.get('REPAIR_TEST_BROWSER_EXECUTABLE'):
        browser_options['executable_path'] = os.environ['REPAIR_TEST_BROWSER_EXECUTABLE']
    browser = p.chromium.launch(**browser_options)
    try:
        scenario(browser, 'equal', 1200000)
        scenario(browser, 'lower', 1000000)
        scenario(browser, 'higher', 1500000)
        scenario(browser, 'create')
        scenario(browser, 'approve')
        scenario(browser, 'reject')
        scenario(browser, 'zero', 0)
        scenario(browser, 'service')
    finally:
        browser.close()

