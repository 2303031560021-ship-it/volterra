import json
import unittest
from unittest.mock import patch

from tornado.testing import AsyncHTTPTestCase

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

    def test_missing_nearby_coordinate_returns_400(self):
        response = self.fetch("/api/stations/nearby?lng=72")
        self.assertEqual(response.code, 400)


if __name__ == "__main__":
    unittest.main()