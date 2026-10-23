# Cô lập thao tác thông báo khỏi Supabase thật khi chạy test.

from unittest.mock import MagicMock, patch

_patchers = []


def setUpModule():
    fake = MagicMock(name="notifications_supabase")
    fake.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    for target in ("app.notifications.repository.supabase", "app.db.database.supabase"):
        patcher = patch(target, fake)
        patcher.start()
        _patchers.append(patcher)


def tearDownModule():
    while _patchers:
        _patchers.pop().stop()
