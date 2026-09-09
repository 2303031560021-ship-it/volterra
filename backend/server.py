"""
VOLTERRA Backend Server
=======================
High-performance asynchronous REST API server for VOLTERRA location intelligence.
Serves real charging station data from final_india_dataset.csv.
"""

import json
import logging
import math
import os
import sys
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import tornado.ioloop
import tornado.web

# Ensure project root is in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.data_loader import get_loader
from backend.analysis_service import analyze_location, find_alternative_areas

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
LOGGER = logging.getLogger("volterra.api")

DEFAULT_CORS_ORIGINS = "http://127.0.0.1:5173,http://localhost:5173"
ALLOWED_CORS_ORIGINS = {
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", DEFAULT_CORS_ORIGINS).split(",")
    if origin.strip()
}
REQUEST_BODY_LIMIT = int(os.getenv("REQUEST_BODY_LIMIT_BYTES", str(1024 * 1024)))
SEARCH_QUERY_LIMIT = int(os.getenv("SEARCH_QUERY_MAX_LENGTH", "200"))
STRING_PARAMETER_LIMIT = int(os.getenv("STRING_PARAMETER_MAX_LENGTH", "100"))
SEARCH_RESOLVE_DEFAULT_LIMIT = int(os.getenv("SEARCH_RESOLVE_DEFAULT_LIMIT", "300"))
SEARCH_RESOLVE_MAX_LIMIT = int(os.getenv("SEARCH_RESOLVE_MAX_LIMIT", "3000"))
RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
RATE_LIMIT_DEFAULT = int(os.getenv("RATE_LIMIT_REQUESTS", "120"))
RATE_LIMIT_EXPENSIVE = int(os.getenv("RATE_LIMIT_EXPENSIVE_REQUESTS", "30"))
RATE_LIMITED_PATHS = {
    "/api/analyze-location": RATE_LIMIT_EXPENSIVE,
    "/api/alternative-areas": RATE_LIMIT_EXPENSIVE,
    "/api/search/resolve": RATE_LIMIT_DEFAULT,
    "/api/stations": RATE_LIMIT_DEFAULT,
    "/api/stations/nearby": RATE_LIMIT_DEFAULT,
}
RATE_LIMIT_STATE = {}
RATE_LIMIT_LOCK = threading.Lock()
EXECUTOR = ThreadPoolExecutor(max_workers=int(os.getenv("API_WORKERS", "4")))


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
        content_length = int(request.headers.get("Content-Length", "0"))
    except ValueError:
        raise RequestValidationError("Invalid Content-Length.") from None
    if content_length > REQUEST_BODY_LIMIT or len(request.body) > REQUEST_BODY_LIMIT:
        raise RequestValidationError("Request body is too large.")
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
    return validate_analysis_parameters(body.get("focus", "Any"), body.get("minPower", "Any"), body.get("radius"))


def validate_analysis_parameters(focus="Any", min_power="Any", radius=None):
    if not isinstance(focus, str) or focus not in {"Any", "AC", "DC", "High-Power DC"}:
        raise RequestValidationError("Invalid 'focus'.")

    if min_power != "Any":
        if isinstance(min_power, bool):
            raise RequestValidationError("Invalid 'minPower'.")
        parse_finite_float(min_power, "minPower", minimum=0, maximum=10000)
        min_power = str(min_power)

    return {
        "radius": parse_finite_float(radius, "radius", default=5, minimum=0, maximum=100),
        "focus": focus,
        "minPower": min_power
    }


def validate_string(value, name, maximum=STRING_PARAMETER_LIMIT):
    if len(value) > maximum:
        raise RequestValidationError(f"'{name}' is too long.")
    return value


def rate_limit_for(request):
    limit = RATE_LIMITED_PATHS.get(request.path)
    if limit is None:
        return None
    now = time.monotonic()
    client = request.remote_ip or "unknown"
    key = (client, request.path)
    with RATE_LIMIT_LOCK:
        window_start, count = RATE_LIMIT_STATE.get(key, (now, 0))
        if now - window_start >= RATE_LIMIT_WINDOW:
            window_start, count = now, 0
        count += 1
        RATE_LIMIT_STATE[key] = (window_start, count)
        if len(RATE_LIMIT_STATE) > 10000:
            RATE_LIMIT_STATE.clear()
        if count > limit:
            return max(1, int(RATE_LIMIT_WINDOW - (now - window_start)))
    return None


class BaseHandler(tornado.web.RequestHandler):
    def prepare(self):
        self._request_started = time.perf_counter()
        self.request_id = self.request.headers.get("X-Request-ID", str(uuid.uuid4()))[:80]
        self.set_header("X-Request-ID", self.request_id)
        origin = self.request.headers.get("Origin")
        if origin in ALLOWED_CORS_ORIGINS:
            self.set_header("Access-Control-Allow-Origin", origin)
            self.set_header("Vary", "Origin")
        retry_after = rate_limit_for(self.request)
        if retry_after is not None:
            self.set_header("Retry-After", str(retry_after))
            self.write_json({"error": True, "message": "Rate limit exceeded."}, 429)
            self.finish()

    def on_finish(self):
        LOGGER.info(
            "request_complete request_id=%s method=%s path=%s status=%s duration_ms=%.1f",
            getattr(self, "request_id", "unknown"),
            self.request.method,
            self.request.path,
            self.get_status(),
            (time.perf_counter() - getattr(self, "_request_started", time.perf_counter())) * 1000,
        )

    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Headers", "x-requested-with, content-type, authorization")
        self.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.set_header("X-Content-Type-Options", "nosniff")
        self.set_header("X-Frame-Options", "SAMEORIGIN")
        self.set_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.set_header("Permissions-Policy", "geolocation=(self)")
        self.set_header("Server", "")
        self.set_header("Content-Type", "application/json; charset=UTF-8")
        if os.getenv("ENABLE_HSTS", "0") == "1":
            self.set_header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

    def options(self, *args, **kwargs):
        if self.request.headers.get("Origin") not in ALLOWED_CORS_ORIGINS:
            self.set_status(403)
            self.finish()
            return
        self.set_status(204)
        self.finish()

    def write_json(self, data, status_code=200):
        self.set_status(status_code)
        self.write(json.dumps(data, ensure_ascii=False))

    def write_error(self, status_code, **kwargs):
        LOGGER.error("API error request_id=%s path=%s status=%s", getattr(self, "request_id", "unknown"), self.request.path, status_code, exc_info=kwargs.get("exc_info") if status_code >= 500 else None)
        if status_code >= 500:
            error_msg = "Internal server error."
        elif status_code == 400:
            error_msg = "Invalid request."
        elif status_code == 413:
            error_msg = "Request body is too large."
        elif status_code == 429:
            error_msg = "Rate limit exceeded."
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
        try:
            search = validate_string(self.get_argument("search", self.get_argument("q", "")), "search", SEARCH_QUERY_LIMIT)
            state = validate_string(self.get_argument("state", ""), "state")
            type_filter = validate_string(self.get_argument("type", "All"), "type")
            limit = parse_int(self.get_argument("limit", "1500"), "limit", minimum=1, maximum=3000)
            offset = parse_int(self.get_argument("offset", "0"), "offset", minimum=0, maximum=100000)
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
        try:
            q = validate_string(self.get_argument("q", "").strip(), "q", SEARCH_QUERY_LIMIT)
            limit = parse_int(self.get_argument("limit", "8"), "limit", minimum=1, maximum=20)
        except RequestValidationError as error:
            self.write_json({"error": True, "message": str(error)}, 400)
            return
        loader = get_loader()
        suggestions = loader.search_engine.get_suggestions(q, limit=limit)
        self.write_json({"query": q, "suggestions": suggestions})


class SearchResolveHandler(BaseHandler):
    def get(self):
        try:
            q = validate_string(self.get_argument("q", "").strip(), "q", SEARCH_QUERY_LIMIT)
            limit = parse_int(self.get_argument("limit", str(SEARCH_RESOLVE_DEFAULT_LIMIT)), "limit", minimum=1, maximum=SEARCH_RESOLVE_MAX_LIMIT)
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

        try:
            focus = validate_string(self.get_argument("focus", "Any"), "focus")
            min_power = validate_string(self.get_argument("minPower", "Any"), "minPower")
            parameters = validate_analysis_parameters(focus, min_power, radius)
        except RequestValidationError as error:
            self.write_json({"error": True, "message": str(error)}, 400)
            return

        loader = get_loader()

        nearby_stations, relevant_stations = loader.query_radius(
            lat=lat,
            lon=lng,
            radius_km=parameters["radius"],
            focus=parameters["focus"],
            min_power=parameters["minPower"]
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
    async def post(self):
        try:
            body = parse_json_body(self.request)
            candidate = parse_candidate(body)
            parameters = parse_analysis_parameters(body)
        except RequestValidationError as error:
            self.write_json({"error": True, "message": str(error)}, 400)
            return

        analysis = await tornado.ioloop.IOLoop.current().run_in_executor(EXECUTOR, analyze_location, candidate, parameters)
        self.write_json(analysis)


class AlternativeAreasHandler(BaseHandler):
    async def post(self):
        try:
            body = parse_json_body(self.request)
            candidate = parse_candidate(body)
            parameters = parse_analysis_parameters(body)
        except RequestValidationError as error:
            self.write_json({"error": True, "message": str(error)}, 400)
            return

        alternatives = await tornado.ioloop.IOLoop.current().run_in_executor(
            EXECUTOR,
            lambda: find_alternative_areas(candidate, parameters)
        )
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
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    print("[VOLTERRA] Initializing backend data layer...")
    # Pre-warm loader
    get_loader()

    app = make_app()
    app.listen(port, address=host, max_body_size=REQUEST_BODY_LIMIT)
    print(f"[VOLTERRA] API Server running on http://{host}:{port}")
    print("[VOLTERRA] Ready to serve location intelligence requests.")
    tornado.ioloop.IOLoop.current().start()
