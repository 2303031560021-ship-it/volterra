import json
import unittest
from unittest.mock import patch

from tornado.testing import AsyncHTTPTestCase

from backend import server as server_module
from backend.server import (
    RequestValidationError,
    make_app,
    parse_finite_float,
    parse_analysis_parameters,
    parse_int,
)


class ValidationHelperTests(unittest.TestCase):
    def test_parse_int(self):
        self.assertEqual(parse_int("12", "limit", minimum=1), 12)
        with self.assertRaises(RequestValidationError):
            parse_int("nope", "limit")
        with self.assertRaises(RequestValidationError):
            parse_int("0", "limit", minimum=1)
        with self.assertRaises(RequestValidationError):
            parse_int("-1", "offset", minimum=0)

    def test_parse_finite_float(self):
        self.assertEqual(parse_finite_float("12.5", "radius"), 12.5)
        for value in ("nope", "NaN", "inf", "-inf"):
            with self.subTest(value=value):
                with self.assertRaises(RequestValidationError):
                    parse_finite_float(value, "radius")

    def test_analysis_parameters_reject_invalid_focus_and_power(self):
        with self.assertRaises(RequestValidationError):
            parse_analysis_parameters({"focus": "unsupported"})
        with self.assertRaises(RequestValidationError):
            parse_analysis_parameters({"minPower": {"invalid": True}})

    def test_coordinate_ranges(self):
        self.assertEqual(parse_finite_float("90", "lat", minimum=-90, maximum=90), 90)
        self.assertEqual(parse_finite_float("-180", "lng", minimum=-180, maximum=180), -180)
        for value, minimum, maximum in (("-91", -90, 90), ("91", -90, 90), ("-181", -180, 180), ("181", -180, 180)):
            with self.subTest(value=value):
                with self.assertRaises(RequestValidationError):
                    parse_finite_float(value, "coordinate", minimum=minimum, maximum=maximum)
        with self.assertRaises(RequestValidationError):
            parse_finite_float("-1", "radius", minimum=0)


class FakeSearchEngine:
    def get_suggestions(self, query, limit):
        return []

    def resolve_query(self, query, limit):
        return {"query": query, "limit": limit}


class FakeLoader:
    search_engine = FakeSearchEngine()

    def filter_stations(self, **kwargs):
        return {"stations": [], "filters": kwargs}


class HandlerValidationTests(AsyncHTTPTestCase):
    def get_app(self):
        return make_app()

    @patch("backend.server.get_loader", return_value=FakeLoader())
    def test_invalid_limit_returns_400(self, _get_loader):
        response = self.fetch("/api/stations?limit=not-a-number")
        self.assertEqual(response.code, 400)
        self.assertEqual(json.loads(response.body)["error"], True)

    @patch("backend.server.get_loader", return_value=FakeLoader())
    def test_valid_station_request_remains_valid(self, _get_loader):
        response = self.fetch("/api/stations?limit=10&offset=2")
        self.assertEqual(response.code, 200)

    def test_malformed_json_returns_400(self):
        response = self.fetch(
            "/api/analyze-location",
            method="POST",
            body="{not-json",
            headers={"Content-Type": "application/json"},
        )
        self.assertEqual(response.code, 400)
        self.assertNotIn("Traceback", response.body.decode())

    def test_invalid_nearby_coordinates_return_400(self):
        response = self.fetch("/api/stations/nearby?lat=91&lng=72")
        self.assertEqual(response.code, 400)

    def test_invalid_nearby_filters_return_400(self):
        response = self.fetch("/api/stations/nearby?lat=0&lng=0&focus=invalid")
        self.assertEqual(response.code, 400)
        response = self.fetch("/api/stations/nearby?lat=0&lng=0&minPower=abc")
        self.assertEqual(response.code, 400)

    def test_long_search_returns_400(self):
        response = self.fetch("/api/search/resolve?q=" + ("a" * 201))
        self.assertEqual(response.code, 400)

    @patch("backend.server.get_loader", return_value=FakeLoader())
    def test_security_headers_and_allowed_cors(self, _get_loader):
        response = self.fetch(
            "/api/stations?limit=1",
            headers={"Origin": "http://localhost:5173"},
        )
        self.assertEqual(response.code, 200)
        self.assertEqual(response.headers["Access-Control-Allow-Origin"], "http://localhost:5173")
        self.assertEqual(response.headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(response.headers["X-Frame-Options"], "SAMEORIGIN")

    @patch("backend.server.get_loader", return_value=FakeLoader())
    def test_rate_limit_returns_429(self, _get_loader):
        old_limit = server_module.RATE_LIMITED_PATHS["/api/stations"]
        server_module.RATE_LIMITED_PATHS["/api/stations"] = 1
        server_module.RATE_LIMIT_STATE.clear()
        try:
            self.assertEqual(self.fetch("/api/stations?limit=1").code, 200)
            response = self.fetch("/api/stations?limit=1")
            self.assertEqual(response.code, 429)
        finally:
            server_module.RATE_LIMITED_PATHS["/api/stations"] = old_limit
            server_module.RATE_LIMIT_STATE.clear()

    def test_missing_nearby_coordinate_returns_400(self):
        response = self.fetch("/api/stations/nearby?lng=72")
        self.assertEqual(response.code, 400)


if __name__ == "__main__":
    unittest.main()