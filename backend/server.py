"""
VOLTERRA Backend Server
=======================
High-performance asynchronous REST API server for VOLTERRA location intelligence.
Serves real charging station data from final_india_dataset.csv.
"""

import json
import logging
import math
import sys
from pathlib import Path
import tornado.ioloop
import tornado.web

# Ensure project root is in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.data_loader import get_loader
from backend.analysis_service import analyze_location, find_alternative_areas

LOGGER = logging.getLogger(__name__)


class RequestValidationError(ValueError):
    """Raised when a request parameter cannot be safely accepted."""


def parse_int(value, name, default=None, minimum=None, maximum=None):
    if value is None:
        if default is not None:
            return default
        raise RequestValidationError(f"Missing or invalid '{name}'.")
    try:
        result = int(value)
    except (TypeError, ValueError):
        raise RequestValidationError(f"Invalid '{name}'.") from None
    if minimum is not None and result < minimum:
        raise RequestValidationError(f"'{name}' must be at least {minimum}.")
    if maximum is not None and result > maximum:
        raise RequestValidationError(f"'{name}' must be at most {maximum}.")
    return result


def parse_finite_float(value, name, default=None, minimum=None, maximum=None):
    if value is None:
        if default is not None:
            return default
        raise RequestValidationError(f"Missing or invalid '{name}'.")
    try:
        result = float(value)
    except (TypeError, ValueError):
        raise RequestValidationError(f"Invalid '{name}'.") from None
    if not math.isfinite(result):
        raise RequestValidationError(f"Invalid '{name}'.")
    if minimum is not None and result < minimum:
        raise RequestValidationError(f"'{name}' must be at least {minimum}.")
    if maximum is not None and result > maximum:
        raise RequestValidationError(f"'{name}' must be at most {maximum}.")
    return result


def parse_json_body(request):
    try:
        body = json.loads(request.body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise RequestValidationError("Invalid JSON body.") from None
    if not isinstance(body, dict):
        raise RequestValidationError("JSON body must be an object.")
    return body


def parse_candidate(body):
    candidate = body.get("candidate")
    if not isinstance(candidate, dict):
        raise RequestValidationError("Missing candidate {lat, lng}.")
    lat = parse_finite_float(candidate.get("lat"), "candidate.lat", minimum=-90, maximum=90)
    lng = parse_finite_float(candidate.get("lng"), "candidate.lng", minimum=-180, maximum=180)
    return {**candidate, "lat": lat, "lng": lng}


def parse_analysis_parameters(body):
    focus = body.get("focus", "Any")
    if not isinstance(focus, str) or focus not in {"Any", "AC", "DC", "High-Power DC"}:
        raise RequestValidationError("Invalid 'focus'.")

    min_power = body.get("minPower", "Any")
    if min_power != "Any":
        if isinstance(min_power, bool):
            raise RequestValidationError("Invalid 'minPower'.")
        parse_finite_float(min_power, "minPower", minimum=0, maximum=10000)
        min_power = str(min_power)

    return {
        "radius": parse_finite_float(body.get("radius"), "radius", default=5, minimum=0, maximum=100),
        "focus": focus,
        "minPower": min_power
    }


class BaseHandler(tornado.web.RequestHandler):
    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "*")
        self.set_header("Access-Control-Allow-Headers", "x-requested-with, content-type, authorization")
        self.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.set_header("Content-Type", "application/json; charset=UTF-8")

    def options(self, *args, **kwargs):
        self.set_status(204)
        self.finish()

    def write_json(self, data, status_code=200):
        self.set_status(status_code)
        self.write(json.dumps(data, ensure_ascii=False))

    def write_error(self, status_code, **kwargs):
        if status_code >= 500:
            LOGGER.error("Unhandled API error", exc_info=kwargs.get("exc_info"))
            error_msg = "Internal server error."
        elif status_code == 400:
            error_msg = "Invalid request."
        else:
            error_msg = "Request failed."
        self.set_status(status_code)
        self.write(json.dumps({
            "error": True,
            "status_code": status_code,
            "message": error_msg
        }))


class HealthHandler(BaseHandler):
    def get(self):
        loader = get_loader()
        self.write_json({
            "status": "healthy",
            "service": "VOLTERRA Location Intelligence API",
            "dataset": "final_india_dataset.csv",
            "total_stations": loader.summary.get("total_stations", 0),
            "data_date": loader.summary.get("data_date")
        })


class NetworkSummaryHandler(BaseHandler):
    def get(self):
        loader = get_loader()
        self.write_json(loader.summary)


class StationsHandler(BaseHandler):
    def get(self):
        search = self.get_argument("search", self.get_argument("q", ""))
        state = self.get_argument("state", "")
        type_filter = self.get_argument("type", "All")
        try:
            limit = parse_int(self.get_argument("limit", "1500"), "limit", minimum=1, maximum=3000)
            offset = parse_int(self.get_argument("offset", "0"), "offset", minimum=0)
        except RequestValidationError as error:
            self.write_json({"error": True, "message": str(error)}, 400)
            return

        bounds_arg = self.get_argument("bounds", None)
        bounds = None
        if bounds_arg:
            try:
                parts = [parse_finite_float(p.strip(), "bounds") for p in bounds_arg.split(",")]
                if len(parts) != 4:
                    raise RequestValidationError("'bounds' must contain four numbers.")
                if not (-90 <= parts[0] <= parts[2] <= 90 and -180 <= parts[1] <= parts[3] <= 180):
                    raise RequestValidationError("'bounds' contains invalid coordinates.")
                bounds = parts  # [min_lat, min_lon, max_lat, max_lon]
            except RequestValidationError as error:
                self.write_json({"error": True, "message": str(error)}, 400)
                return

        loader = get_loader()
        result = loader.filter_stations(
            search=search,
            state=state,
            type_filter=type_filter,
            limit=limit,
            offset=offset,
            bounds=bounds
        )
        self.write_json(result)


class SearchSuggestionsHandler(BaseHandler):
    def get(self):
        q = self.get_argument("q", "").strip()
        try:
            limit = parse_int(self.get_argument("limit", "8"), "limit", minimum=1, maximum=20)
        except RequestValidationError as error:
            self.write_json({"error": True, "message": str(error)}, 400)
            return
        loader = get_loader()
        suggestions = loader.search_engine.get_suggestions(q, limit=limit)
        self.write_json({"query": q, "suggestions": suggestions})


class SearchResolveHandler(BaseHandler):
    def get(self):
        q = self.get_argument("q", "").strip()
        try:
            limit = parse_int(self.get_argument("limit", "1500"), "limit", minimum=1, maximum=3000)
        except RequestValidationError as error:
            self.write_json({"error": True, "message": str(error)}, 400)
            return
        loader = get_loader()
        result = loader.search_engine.resolve_query(q, limit=limit)
        self.write_json(result)


class NearbyStationsHandler(BaseHandler):
    def get(self):
        try:
            lat = parse_finite_float(self.get_argument("lat", None), "lat", minimum=-90, maximum=90)
            lng = parse_finite_float(self.get_argument("lng", None), "lng", minimum=-180, maximum=180)
            radius = parse_finite_float(self.get_argument("radius", "5.0"), "radius", minimum=0, maximum=100)
        except (tornado.web.MissingArgumentError, RequestValidationError) as error:
            message = str(error) if isinstance(error, RequestValidationError) else "Missing or invalid 'lat' and 'lng' query parameters."
            self.write_json({"error": True, "message": message}, 400)
            return

        loader = get_loader()
        focus = self.get_argument("focus", "Any")
        min_power = self.get_argument("minPower", "Any")

        nearby_stations, relevant_stations = loader.query_radius(
            lat=lat,
            lon=lng,
            radius_km=radius,
            focus=focus,
            min_power=min_power
        )

        self.write_json({
            "candidate": {"lat": lat, "lng": lng},
            "radius": radius,
            "nearbyCount": len(relevant_stations),
            "allNearbyCount": len(nearby_stations),
            "relevantStations": relevant_stations,
            "allNearbyStations": nearby_stations
        })


class AnalyzeLocationHandler(BaseHandler):
    def post(self):
        try:
            body = parse_json_body(self.request)
            candidate = parse_candidate(body)
            parameters = parse_analysis_parameters(body)
        except RequestValidationError as error:
            self.write_json({"error": True, "message": str(error)}, 400)
            return

        analysis = analyze_location(candidate, parameters)
        self.write_json(analysis)


class AlternativeAreasHandler(BaseHandler):
    def post(self):
        try:
            body = parse_json_body(self.request)
            candidate = parse_candidate(body)
            parameters = parse_analysis_parameters(body)
        except RequestValidationError as error:
            self.write_json({"error": True, "message": str(error)}, 400)
            return

        alternatives = find_alternative_areas(candidate, parameters)
        self.write_json({"alternatives": alternatives})


def make_app():
    return tornado.web.Application([
        (r"/api/health", HealthHandler),
        (r"/api/network-summary", NetworkSummaryHandler),
        (r"/api/stations", StationsHandler),
        (r"/api/stations/nearby", NearbyStationsHandler),
        (r"/api/search/suggest", SearchSuggestionsHandler),
        (r"/api/search/resolve", SearchResolveHandler),
        (r"/api/analyze-location", AnalyzeLocationHandler),
        (r"/api/alternative-areas", AlternativeAreasHandler),
    ])


if __name__ == "__main__":
    port = 8000
    print("[VOLTERRA] Initializing backend data layer...")
    # Pre-warm loader
    get_loader()

    app = make_app()
    app.listen(port, address="127.0.0.1")
    print(f"[VOLTERRA] API Server running on http://127.0.0.1:{port}")
    print("[VOLTERRA] Ready to serve location intelligence requests.")
    tornado.ioloop.IOLoop.current().start()
