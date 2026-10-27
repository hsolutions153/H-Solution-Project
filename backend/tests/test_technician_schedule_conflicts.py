import unittest
from unittest.mock import patch

from app.core.exceptions import AppException
from app.repair_requests.service import _ensure_technician_not_busy, _scheduled_window


class TechnicianScheduleConflictTests(unittest.TestCase):
    def test_scheduled_key_is_treated_as_one_hour_window(self):
        window = _scheduled_window({"appointment_key": "2026-10-27|09:00"})
        self.assertIsNotNone(window)
        self.assertEqual(window[1].hour, 10)

    @patch("app.repair_requests.service.repository.get_technician_open_requests")
    @patch("app.repair_requests.service.repository.get_technician_requests_in_statuses")
    def test_assigned_request_blocks_same_slot(self, get_in_progress, get_open):
        get_open.return_value = [
            {"id": "OLD", "status": "ASSIGNED", "appointment_key": "2026-10-27|09:00"}
        ]
        get_in_progress.return_value = []

        with self.assertRaises(AppException):
            _ensure_technician_not_busy(
                "TECH-1",
                {"id": "NEW", "appointment_key": "2026-10-27|09:00"},
            )

    @patch("app.repair_requests.service.repository.get_technician_open_requests")
    @patch("app.repair_requests.service.repository.get_technician_requests_in_statuses")
    def test_overlapping_legacy_time_range_is_blocked(self, get_in_progress, get_open):
        get_open.return_value = [
            {
                "id": "OLD",
                "status": "ASSIGNED",
                "issue_description": "[Hẹn: 2026-10-27 09:00 - 10:00]",
            }
        ]
        get_in_progress.return_value = []

        with self.assertRaises(AppException):
            _ensure_technician_not_busy(
                "TECH-1",
                {
                    "id": "NEW",
                    "issue_description": "[Hẹn: 2026-10-27 09:30 - 10:30]",
                },
            )


if __name__ == "__main__":
    unittest.main()
