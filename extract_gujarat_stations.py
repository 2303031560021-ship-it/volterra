import json
import csv
from pathlib import Path

from shapely.geometry import Point, shape
from shapely.ops import unary_union, transform
from pyproj import Transformer


# ============================================================
# FILES
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

OCM_FILE = BASE_DIR / "ocm_india_test.json"
BOUNDARY_FILE = BASE_DIR / "state_NWIC.GeoJSON"

OUTPUT_JSON = BASE_DIR / "ocm_gujarat_raw.json"
OUTPUT_CSV = BASE_DIR / "ocm_gujarat_raw.csv"


# ============================================================
# COORDINATE SYSTEMS
# ============================================================

# Government boundary file
SOURCE_CRS = "EPSG:7755"

# OCM coordinates are normal WGS84 longitude/latitude
TARGET_CRS = "EPSG:4326"


# ============================================================
# HELPERS
# ============================================================

def stop(message):
    print()
    print("=" * 70)
    print("ERROR")
    print("=" * 70)
    print(message)
    print()
    raise SystemExit(1)


def separator(title):
    print()
    print("=" * 70)
    print(title)
    print("=" * 70)


# ============================================================
# STEP 1 — CHECK FILES
# ============================================================

separator("STEP 1 — CHECK REQUIRED FILES")

if not OCM_FILE.exists():
    stop(
        f"Could not find:\n{OCM_FILE}\n\n"
        "Make sure ocm_india_test.json is in the project root."
    )

print(f"Found OCM data: {OCM_FILE}")


if not BOUNDARY_FILE.exists():
    stop(
        f"Could not find:\n{BOUNDARY_FILE}\n\n"
        "Make sure state_NWIC.GeoJSON is in the project root."
    )

print(f"Found boundary: {BOUNDARY_FILE}")


# ============================================================
# STEP 2 — LOAD OCM DATA
# ============================================================

separator("STEP 2 — LOAD OCM INDIA DATA")

try:
    with open(OCM_FILE, "r", encoding="utf-8") as file:
        ocm_data = json.load(file)

except Exception as error:
    stop(f"Could not read OCM JSON:\n{error}")


if not isinstance(ocm_data, list):
    stop(
        "ocm_india_test.json does not contain a list of OCM records."
    )


print(f"Total OCM records: {len(ocm_data)}")


# ============================================================
# STEP 3 — LOAD STATE BOUNDARY
# ============================================================

separator("STEP 3 — LOAD STATE BOUNDARY")

try:
    with open(BOUNDARY_FILE, "r", encoding="utf-8") as file:
        boundary_data = json.load(file)

except Exception as error:
    stop(f"Could not read state_NWIC.GeoJSON:\n{error}")


if boundary_data.get("type") != "FeatureCollection":
    stop(
        "The boundary file is not a GeoJSON FeatureCollection."
    )


features = boundary_data.get("features", [])

print(f"Total state/UT features: {len(features)}")


# ============================================================
# STEP 4 — FIND GUJARAT
# ============================================================

separator("STEP 4 — FIND GUJARAT BOUNDARY")

gujarat_features = []

for feature in features:

    properties = feature.get("properties") or {}

    state_name = properties.get("state_name")

    if str(state_name).strip().lower() == "gujarat":
        gujarat_features.append(feature)


if not gujarat_features:
    stop(
        'Could not find a feature where state_name = "Gujarat".'
    )


print(f"Gujarat features found: {len(gujarat_features)}")


# ============================================================
# STEP 5 — CREATE ORIGINAL GUJARAT GEOMETRY
# ============================================================

separator("STEP 5 — CREATE GUJARAT GEOMETRY")

geometries = []

for feature in gujarat_features:

    geometry = feature.get("geometry")

    if not geometry:
        continue

    try:
        geometries.append(shape(geometry))

    except Exception as error:
        print(f"Warning: could not read geometry: {error}")


if not geometries:
    stop("Gujarat feature has no usable geometry.")


gujarat_boundary_projected = unary_union(geometries)

print(
    f"Original geometry type: "
    f"{gujarat_boundary_projected.geom_type}"
)

print(
    f"Original geometry valid: "
    f"{gujarat_boundary_projected.is_valid}"
)

print(
    f"Original geometry empty: "
    f"{gujarat_boundary_projected.is_empty}"
)


# ============================================================
# STEP 6 — TRANSFORM EPSG:7755 → EPSG:4326
# ============================================================

separator("STEP 6 — TRANSFORM GUJARAT TO WGS84")

print(f"Source CRS : {SOURCE_CRS}")
print(f"Target CRS : {TARGET_CRS}")

try:

    transformer = Transformer.from_crs(
        SOURCE_CRS,
        TARGET_CRS,
        always_xy=True
    )

except Exception as error:
    stop(
        "Could not create CRS transformer.\n\n"
        f"Details: {error}"
    )


print("CRS transformer created successfully.")


try:

    gujarat_boundary = transform(
        transformer.transform,
        gujarat_boundary_projected
    )

except Exception as error:
    stop(
        "Could not transform Gujarat boundary.\n\n"
        f"Details: {error}"
    )


print(
    f"Transformed geometry type: "
    f"{gujarat_boundary.geom_type}"
)

print(
    f"Transformed geometry valid: "
    f"{gujarat_boundary.is_valid}"
)

print(
    f"Transformed geometry empty: "
    f"{gujarat_boundary.is_empty}"
)


if gujarat_boundary.is_empty:
    stop("Transformed Gujarat geometry is empty.")


# ============================================================
# STEP 7 — SANITY CHECK GUJARAT BOUNDARY
# ============================================================

separator("STEP 7 — SANITY CHECK COORDINATES")

min_x, min_y, max_x, max_y = gujarat_boundary.bounds

print("Gujarat WGS84 bounding box:")
print(f"Minimum longitude: {min_x}")
print(f"Minimum latitude : {min_y}")
print(f"Maximum longitude: {max_x}")
print(f"Maximum latitude : {max_y}")

print()
print("Expected Gujarat coordinates should be approximately:")
print("Longitude: around 68° to 75° E")
print("Latitude : around 20° to 25° N")


# ============================================================
# STEP 8 — FILTER OCM STATIONS
# ============================================================

separator("STEP 8 — FILTER STATIONS INSIDE GUJARAT")

inside_gujarat = []
outside_gujarat = 0
invalid_coordinates = 0


for station in ocm_data:

    address_info = station.get("AddressInfo") or {}

    latitude = address_info.get("Latitude")
    longitude = address_info.get("Longitude")

    # --------------------------------------------------------
    # Missing coordinates
    # --------------------------------------------------------

    if latitude is None or longitude is None:
        invalid_coordinates += 1
        continue

    # --------------------------------------------------------
    # Convert to numbers
    # --------------------------------------------------------

    try:
        latitude = float(latitude)
        longitude = float(longitude)

    except (TypeError, ValueError):
        invalid_coordinates += 1
        continue

    # --------------------------------------------------------
    # Validate coordinate ranges
    # --------------------------------------------------------

    if not (-90 <= latitude <= 90):
        invalid_coordinates += 1
        continue

    if not (-180 <= longitude <= 180):
        invalid_coordinates += 1
        continue

    # --------------------------------------------------------
    # Create WGS84 point
    #
    # Shapely uses:
    # X = longitude
    # Y = latitude
    # --------------------------------------------------------

    point = Point(longitude, latitude)

    # covers() includes points directly on the state boundary
    if gujarat_boundary.covers(point):

        inside_gujarat.append(station)

    else:

        outside_gujarat += 1


print(f"Inside Gujarat: {len(inside_gujarat)}")
print(f"Outside Gujarat: {outside_gujarat}")
print(f"Invalid coordinates: {invalid_coordinates}")


# ============================================================
# STEP 9 — DEDUPLICATE BY OCM ID
# ============================================================

separator("STEP 9 — REMOVE DUPLICATE OCM IDs")

unique_stations = {}
records_without_id = 0


for station in inside_gujarat:

    station_id = station.get("ID")

    if station_id is None:

        records_without_id += 1

        key = (
            "NO_ID_"
            + str(
                station.get("AddressInfo", {}).get("Title", "")
            )
            + "_"
            + str(
                station.get("AddressInfo", {}).get("Latitude", "")
            )
            + "_"
            + str(
                station.get("AddressInfo", {}).get("Longitude", "")
            )
        )

        if key not in unique_stations:
            unique_stations[key] = station

    else:

        if station_id not in unique_stations:
            unique_stations[station_id] = station


gujarat_stations = list(unique_stations.values())


print(f"Records inside Gujarat: {len(inside_gujarat)}")
print(f"Unique Gujarat records: {len(gujarat_stations)}")
print(f"Records without OCM ID: {records_without_id}")


# ============================================================
# STEP 10 — SAVE RAW JSON
# ============================================================

separator("STEP 10 — SAVE GUJARAT RAW JSON")

with open(
    OUTPUT_JSON,
    "w",
    encoding="utf-8"
) as file:

    json.dump(
        gujarat_stations,
        file,
        indent=2,
        ensure_ascii=False
    )


print(f"Saved:")
print(OUTPUT_JSON)


# ============================================================
# STEP 11 — CREATE CSV
# ============================================================

separator("STEP 11 — CREATE GUJARAT CSV")

csv_rows = []


for station in gujarat_stations:

    address = station.get("AddressInfo") or {}
    connections = station.get("Connections") or []

    connector_types = []
    power_values = []
    current_types = []

    for connection in connections:

        connection_type = connection.get("ConnectionType")

        if isinstance(connection_type, dict):

            title = connection_type.get("Title")

            if title:
                connector_types.append(str(title))


        power_kw = connection.get("PowerKW")

        if power_kw is not None:
            power_values.append(power_kw)


        current_type = connection.get("CurrentType")

        if isinstance(current_type, dict):

            title = current_type.get("Title")

            if title:
                current_types.append(str(title))


    operator_info = station.get("OperatorInfo") or {}

    if isinstance(operator_info, dict):
        operator = operator_info.get("Title")
    else:
        operator = None


    status_info = station.get("StatusType") or {}

    if isinstance(status_info, dict):
        status = status_info.get("Title")
    else:
        status = None


    country_info = address.get("Country")

    if isinstance(country_info, dict):
        country = country_info.get("Title")
    else:
        country = None


    row = {
        "ocm_id": station.get("ID"),
        "station_name": address.get("Title"),
        "latitude": address.get("Latitude"),
        "longitude": address.get("Longitude"),
        "address": address.get("AddressLine1"),
        "town": address.get("Town"),
        "state": address.get("StateOrProvince"),
        "postcode": address.get("Postcode"),
        "country": country,
        "operator": operator,
        "status": status,
        "usage_cost": station.get("UsageCost"),
        "connector_type": " | ".join(
            sorted(set(connector_types))
        ),
        "power_kw": " | ".join(
            str(value)
            for value in sorted(set(power_values))
        ),
        "ac_dc": " | ".join(
            sorted(set(current_types))
        ),
        "source": "Open Charge Map",
    }

    csv_rows.append(row)


csv_columns = [
    "ocm_id",
    "station_name",
    "latitude",
    "longitude",
    "address",
    "town",
    "state",
    "postcode",
    "country",
    "operator",
    "status",
    "usage_cost",
    "connector_type",
    "power_kw",
    "ac_dc",
    "source",
]


with open(
    OUTPUT_CSV,
    "w",
    newline="",
    encoding="utf-8-sig"
) as file:

    writer = csv.DictWriter(
        file,
        fieldnames=csv_columns
    )

    writer.writeheader()
    writer.writerows(csv_rows)


print(f"Saved:")
print(OUTPUT_CSV)


# ============================================================
# STEP 12 — FINAL RESULT
# ============================================================

separator("FINAL RESULT")

print(f"OCM India records             : {len(ocm_data)}")
print(f"Gujarat records               : {len(inside_gujarat)}")
print(f"Unique Gujarat records        : {len(gujarat_stations)}")
print(f"Outside Gujarat               : {outside_gujarat}")
print(f"Invalid/missing coordinates   : {invalid_coordinates}")

print()
print("OUTPUT FILES")
print("-" * 70)
print(f"JSON: {OUTPUT_JSON}")
print(f"CSV : {OUTPUT_CSV}")

print()
print("=" * 70)
print("SUCCESS — GUJARAT EXTRACTION COMPLETE")
print("=" * 70)