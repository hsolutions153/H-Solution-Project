"""Review submission and profile reads must use the same source of ratings."""

from copy import deepcopy
from types import SimpleNamespace
import time
import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.auth.utils import get_current_user
from app.repair_requests import service
from app.repair_requests.router import router as repairs_router
from app.technicians import ratings, repository as technician_repository
from app.technicians.router import router as technicians_router


class MemoryDatabase:
    def __init__(self):
        self.tables = {
            "reviews": [],
            "repair_reviews": [{"id": "LEGACY0001", "technician_id": "TECH000001", "rating": 5}],
            "technician_profiles": [{"user_id": "TECH000001", "rating_avg": 5, "total_jobs_done": 1}],
            "repair_requests": [{"id": "REPAIR0001", "technician_id": "TECH000001", "status": "COMPLETED"}],
            "users": [{"id": "TECH000001", "full_name": "Test Technician"}],
        }
        self.reads = []
        self.fail_profile_update = False

    def table(self, name):
        self.reads.append(name)
        return MemoryQuery(self, name)


class MemoryQuery:
    def __init__(self, database, name):
        self.database, self.name = database, name
        self.filters, self.sort_key, self.page_size = [], None, None
        self.single, self.payload, self.operation = False, None, "select"

    def select(self, *args, **kwargs):
        return self

    def eq(self, key, value):
        self.filters.append(lambda row: row.get(key) == value)
        return self

    def in_(self, key, values):
        self.filters.append(lambda row: row.get(key) in values)
        return self

    def gt(self, key, value):
        self.filters.append(lambda row: row[key] > value)
        return self

    def order(self, key):
        self.sort_key = key
        return self

    def limit(self, size):
        self.page_size = size
        return self

    def maybe_single(self):
        self.single = True
        return self

    def upsert(self, payload, **kwargs):
        self.payload, self.operation = payload, "upsert"
        return self

    def update(self, payload):
        self.payload, self.operation = payload, "update"
        return self

    def execute(self):
        rows = self.database.tables[self.name]
        if self.operation == "upsert":
            existing = next((r for r in rows if r["repair_id"] == self.payload["repair_id"]), None)
            if existing is None:
                rows.append(deepcopy(self.payload))
            else:
                existing.update(self.payload)
            return SimpleNamespace(data=[deepcopy(self.payload)])
        rows = [row for row in rows if all(predicate(row) for predicate in self.filters)]
        if self.operation == "update":
            if self.name == "technician_profiles" and self.database.fail_profile_update:
                raise RuntimeError("Profile update failed")
            for row in rows:
                row.update(self.payload)
        if self.sort_key:
            rows.sort(key=lambda row: row[self.sort_key])
        count = len(rows)
        if self.page_size is not None:
            rows = rows[:self.page_size]
        data = (rows[0] if rows else None) if self.single else rows
        return SimpleNamespace(data=deepcopy(data), count=count)


class TechnicianRatingTests(unittest.TestCase):
    def setUp(self):
        self.database = MemoryDatabase()
        for target in (
            "app.db.database.supabase",
            "app.repair_requests.repository.supabase",
            "app.technicians.repository.supabase",
            "app.technicians.ratings.supabase",
        ):
            patcher = patch(target, self.database)
            patcher.start()
            self.addCleanup(patcher.stop)
        patcher = patch("app.repair_requests.repository.get_repair_request_by_id", return_value={
            "id": "REPAIR0001", "customer_id": "CUSTOMER01", "technician_id": "TECH000001", "status": "COMPLETED",
        })
        patcher.start()
        self.addCleanup(patcher.stop)
        patcher = patch("app.technicians.service.auth_repository.get_role_by_code", side_effect=lambda code: {"id": code})
        patcher.start()
        self.addCleanup(patcher.stop)
        self.user = {"sub": "CUSTOMER01", "role": "CUSTOMER", "role_id": "CUSTOMER"}
        app = FastAPI()
        app.include_router(repairs_router)
        app.include_router(technicians_router)
        app.dependency_overrides[get_current_user] = lambda: self.user
        self.client = TestClient(app, raise_server_exceptions=False)
        self.addCleanup(self.client.close)
        self.addCleanup(service._TECH_CACHE.clear)
        service._TECH_CACHE.clear()

    def submit(self, score):
        self.user = {"sub": "CUSTOMER01", "role": "CUSTOMER", "role_id": "CUSTOMER"}
        response = self.client.post("/repair-requests/REPAIR0001/rating", json={"rating": score})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_one_star_lowers_profile_and_survives_repeated_reads(self):
        self.submit(1)
        self.user = {"sub": "TECH000001", "role": "TECHNICIAN", "role_id": "TECHNICIAN"}
        for _ in range(2):
            response = self.client.get("/technicians/me")
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(float(response.json()["rating_avg"]), 1)
        self.assertEqual(self.database.tables["technician_profiles"][0]["rating_avg"], 1)
        self.assertNotIn("repair_reviews", self.database.reads)

    def test_average_uses_all_customer_reviews_and_excludes_other_technicians(self):
        self.database.tables["reviews"] = [
            {"id": "REVIEW0001", "repair_id": "REPAIR0002", "technician_id": "TECH000001", "rating": 5},
            {"id": "REVIEW0002", "repair_id": "REPAIR0003", "technician_id": "OTHERTECH1", "rating": 5},
        ]
        self.submit(1)
        self.assertEqual(self.database.tables["technician_profiles"][0]["rating_avg"], 3)

    def test_editing_review_replaces_score_without_counting_it_twice(self):
        self.submit(5)
        review_id = self.database.tables["reviews"][0]["id"]
        self.submit(1)
        self.assertEqual(len(self.database.tables["reviews"]), 1)
        self.assertEqual(self.database.tables["reviews"][0]["id"], review_id)
        self.assertEqual(self.database.tables["technician_profiles"][0]["rating_avg"], 1)

    def test_submission_invalidates_cached_customer_facing_score(self):
        service._TECH_CACHE["TECH000001"] = (time.time(), {"rating": 5})
        self.submit(1)
        self.assertEqual(service._get_technicians_map({"TECH000001"})["TECH000001"]["rating"], 1)

    def test_profile_read_repairs_previously_stale_average(self):
        self.database.tables["reviews"] = [{"id": "REVIEW0001", "technician_id": "TECH000001", "rating": 1}]
        profile = technician_repository.get_technician_by_user_id("TECH000001")
        self.assertEqual(profile["rating_avg"], 1)
        self.assertEqual(self.database.tables["technician_profiles"][0]["rating_avg"], 1)

    def test_more_than_one_page_of_reviews_is_included(self):
        self.database.tables["reviews"] = [
            {"id": f"REVIEW{i:05d}", "technician_id": "TECH000001", "rating": 5 if i < 1000 else 1}
            for i in range(2000)
        ]
        self.assertEqual(ratings.sync_technician_rating("TECH000001"), 3)

    def test_no_reviews_preserves_initial_score(self):
        self.assertIsNone(ratings.sync_technician_rating("TECH000001"))
        self.assertEqual(self.database.tables["technician_profiles"][0]["rating_avg"], 5)

    def test_profile_read_preserves_two_decimal_average(self):
        self.database.tables["reviews"] = [
            {"id": f"REVIEW{i:05d}", "technician_id": "TECH000001", "rating": score}
            for i, score in enumerate((5, 5, 1))
        ]
        profile = technician_repository.get_technician_by_user_id("TECH000001")
        self.assertEqual(profile["rating_avg"], 3.67)

    def test_profile_update_failure_is_not_reported_as_success(self):
        self.database.fail_profile_update = True
        response = self.client.post("/repair-requests/REPAIR0001/rating", json={"rating": 1})
        self.assertGreaterEqual(response.status_code, 500)


if __name__ == "__main__":
    unittest.main()
