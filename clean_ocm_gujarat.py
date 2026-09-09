import csv
from pathlib import Path


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

INPUT_FILE = BASE_DIR / "ocm_gujarat_raw.csv"
OUTPUT_FILE = BASE_DIR / "ocm_gujarat_clean.csv"


# ============================================================
# RECORDS CONFIRMED AS DUPLICATES / ERRONEOUS
# ============================================================

# 502298 and 502299 are the same MobiLane A K Tyre location.
# Keep 502299 and remove 502298.
DUPLICATE_IDS = {
    "502298",
}


# These OCM records were identified as clearly inconsistent:
#
# 502270:
#   Town/state/address describe Maharashtra while coordinates
#   are at the same location as other clearly unrelated records.
#
# 502268:
#   Bengaluru, Karnataka
#
# 502267:
#   Bengaluru, Karnataka
#
# They should not be included in the Gujarat station dataset.
ERRONEOUS_IDS = {
    "502270",
    "502268",
    "502267",
}


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def clean_text(value):
    """
    Clean ordinary text fields.

    - Convert None/empty values to empty string.
    - Remove leading/trailing whitespace.
    - Collapse repeated whitespace.
    """
    if value is None:
        return ""

    value = str(value).strip()

    if not value:
        return ""

    return " ".join(value.split())


def clean_state(value):
    """
    Standardize Gujarat state labels.

    Examples:
        Gujarat
        Gujarat 
        GJ
    become:
        Gujarat
    """

    value = clean_text(value)

    if value.lower() in {"gujarat", "gj"}:
        return "Gujarat"

    return value


def clean_town(value):
    """
    Standardize town names where we have an obvious correction.
    """

    value = clean_text(value)

    # Clear typo found in the source:
    # Sueat -> Surat
    if value.lower() == "sueat":
        return "Surat"

    return value


def clean_operator(value):
    """
    Clean operator text without inventing missing operators.
    """

    value = clean_text(value)

    if not value:
        return ""

    # OCM uses this as an unknown operator marker.
    if value.lower() in {
        "(unknown operator)",
        "unknown operator",
    }:
        return ""

    return value


def clean_status(value):
    """
    Standardize status text while preserving its meaning.
    """

    value = clean_text(value)

    if not value:
        return ""

    normalized = value.lower()

    if normalized == "operational":
        return "Operational"

    if normalized == "not operational":
        return "Not Operational"

    return value


def clean_source(value):
    """
    Standardize source name.
    """

    value = clean_text(value)

    if value.lower() == "open charge map":
        return "Open Charge Map"

    return value


def clean_power(value):
    """
    Clean power values without inventing missing values.

    Examples:
        80          -> 80
        30 | 60     -> 30 | 60
        3.4 | 3.6   -> 3.4 | 3.6

    We deliberately do NOT:
        missing -> 0
        missing -> estimated value
    """

    value = clean_text(value)

    if not value:
        return ""

    return value


def clean_usage_cost(value):
    """
    Clean pricing text but do not interpret or modify the
    actual pricing information.
    """

    return clean_text(value)


def clean_connector(value):
    """
    Clean connector text while preserving multiple connector
    types.
    """

    value = clean_text(value)

    if not value:
        return ""

    return value


def clean_ac_dc(value):
    """
    Clean AC/DC classification without guessing missing values.
    """

    value = clean_text(value)

    if not value:
        return ""

    normalized = value.lower()

    if normalized == "dc":
        return "DC"

    if normalized == "ac":
        return "AC"

    if normalized == "ac (single-phase)":
        return "AC (Single-Phase)"

    return value


# ============================================================
# STEP 1 — CHECK INPUT
# ============================================================

print("=" * 70)
print("STEP 1 — CHECK INPUT FILE")
print("=" * 70)

if not INPUT_FILE.exists():
    print()
    print("ERROR:")
    print(f"Could not find:")
    print(INPUT_FILE)
    print()
    print("Make sure ocm_gujarat_raw.csv is in the project root.")
    raise SystemExit(1)

print(f"Input file found:")
print(INPUT_FILE)


# ============================================================
# STEP 2 — LOAD DATA
# ============================================================

print()
print("=" * 70)
print("STEP 2 — LOAD OCM GUJARAT DATA")
print("=" * 70)

with open(
    INPUT_FILE,
    "r",
    encoding="utf-8-sig",
    newline=""
) as file:

    reader = csv.DictReader(file)

    rows = list(reader)

    fieldnames = reader.fieldnames


if not fieldnames:
    print("ERROR: CSV has no columns.")
    raise SystemExit(1)


print(f"Records loaded: {len(rows)}")
print(f"Columns found: {len(fieldnames)}")


# ============================================================
# STEP 3 — REMOVE CONFIRMED BAD RECORDS
# ============================================================

print()
print("=" * 70)
print("STEP 3 — REMOVE CONFIRMED DUPLICATES / ERRONEOUS RECORDS")
print("=" * 70)


cleaned_rows = []

removed_duplicates = []
removed_erroneous = []


for row in rows:

    ocm_id = clean_text(row.get("ocm_id"))

    # --------------------------------------------------------
    # Definite duplicate
    # --------------------------------------------------------

    if ocm_id in DUPLICATE_IDS:

        removed_duplicates.append(ocm_id)

        print(
            f"Removed duplicate OCM ID: {ocm_id} "
            f"({row.get('station_name', '')})"
        )

        continue

    # --------------------------------------------------------
    # Clearly erroneous record
    # --------------------------------------------------------

    if ocm_id in ERRONEOUS_IDS:

        removed_erroneous.append(ocm_id)

        print(
            f"Removed erroneous OCM ID: {ocm_id} "
            f"({row.get('station_name', '')})"
        )

        continue

    cleaned_rows.append(row)


print()
print(f"Duplicate records removed : {len(removed_duplicates)}")
print(f"Erroneous records removed : {len(removed_erroneous)}")


# ============================================================
# STEP 4 — CLEAN TEXT / STANDARDIZE FIELDS
# ============================================================

print()
print("=" * 70)
print("STEP 4 — STANDARDIZE FIELDS")
print("=" * 70)


for row in cleaned_rows:

    # --------------------------------------------------------
    # Station information
    # --------------------------------------------------------

    row["ocm_id"] = clean_text(
        row.get("ocm_id")
    )

    row["station_name"] = clean_text(
        row.get("station_name")
    )

    row["address"] = clean_text(
        row.get("address")
    )

    # --------------------------------------------------------
    # Location
    # --------------------------------------------------------

    row["town"] = clean_town(
        row.get("town")
    )

    row["state"] = clean_state(
        row.get("state")
    )

    row["postcode"] = clean_text(
        row.get("postcode")
    )

    row["country"] = clean_text(
        row.get("country")
    )

    # --------------------------------------------------------
    # Operator / status
    # --------------------------------------------------------

    row["operator"] = clean_operator(
        row.get("operator")
    )

    row["status"] = clean_status(
        row.get("status")
    )

    # --------------------------------------------------------
    # Technical information
    # --------------------------------------------------------

    row["connector_type"] = clean_connector(
        row.get("connector_type")
    )

    row["power_kw"] = clean_power(
        row.get("power_kw")
    )

    row["ac_dc"] = clean_ac_dc(
        row.get("ac_dc")
    )

    # --------------------------------------------------------
    # Pricing
    # --------------------------------------------------------

    row["usage_cost"] = clean_usage_cost(
        row.get("usage_cost")
    )

    # --------------------------------------------------------
    # Source
    # --------------------------------------------------------

    row["source"] = clean_source(
        row.get("source")
    )


print("Text and field standardization complete.")


# ============================================================
# STEP 5 — CHECK FOR DUPLICATE OCM IDS AGAIN
# ============================================================

print()
print("=" * 70)
print("STEP 5 — VERIFY OCM ID UNIQUENESS")
print("=" * 70)


seen_ids = set()
duplicate_ids_after_cleaning = []


for row in cleaned_rows:

    ocm_id = row.get("ocm_id", "")

    if not ocm_id:
        continue

    if ocm_id in seen_ids:

        duplicate_ids_after_cleaning.append(
            ocm_id
        )

    else:

        seen_ids.add(ocm_id)


if duplicate_ids_after_cleaning:

    print("WARNING:")
    print("Duplicate OCM IDs still exist:")

    for ocm_id in duplicate_ids_after_cleaning:
        print(f"  {ocm_id}")

else:

    print("No duplicate OCM IDs remain.")


# ============================================================
# STEP 6 — CHECK REQUIRED LOCATION DATA
# ============================================================

print()
print("=" * 70)
print("STEP 6 — CHECK COORDINATES")
print("=" * 70)


missing_coordinates = []
invalid_coordinates = []


for row in cleaned_rows:

    ocm_id = row.get("ocm_id", "")

    latitude = clean_text(
        row.get("latitude")
    )

    longitude = clean_text(
        row.get("longitude")
    )

    if not latitude or not longitude:

        missing_coordinates.append(ocm_id)
        continue

    try:

        lat = float(latitude)
        lon = float(longitude)

    except ValueError:

        invalid_coordinates.append(ocm_id)
        continue

    if not (-90 <= lat <= 90):

        invalid_coordinates.append(ocm_id)
        continue

    if not (-180 <= lon <= 180):

        invalid_coordinates.append(ocm_id)
        continue


print(
    f"Missing coordinates : "
    f"{len(missing_coordinates)}"
)

print(
    f"Invalid coordinates : "
    f"{len(invalid_coordinates)}"
)


# ============================================================
# STEP 7 — CHECK IMPORTANT FIELDS
# ============================================================

print()
print("=" * 70)
print("STEP 7 — DATA COMPLETENESS REPORT")
print("=" * 70)


total = len(cleaned_rows)


def count_missing(column):
    return sum(
        1
        for row in cleaned_rows
        if not clean_text(row.get(column))
    )


fields_to_check = [
    "station_name",
    "latitude",
    "longitude",
    "operator",
    "status",
    "connector_type",
    "power_kw",
    "ac_dc",
    "usage_cost",
]


for column in fields_to_check:

    missing = count_missing(column)

    available = total - missing

    print(
        f"{column:18} "
        f"available: {available:3} | "
        f"missing: {missing:3}"
    )


# ============================================================
# STEP 8 — SAVE CLEAN CSV
# ============================================================

print()
print("=" * 70)
print("STEP 8 — SAVE CLEAN CSV")
print("=" * 70)


with open(
    OUTPUT_FILE,
    "w",
    encoding="utf-8-sig",
    newline=""
) as file:

    writer = csv.DictWriter(
        file,
        fieldnames=fieldnames
    )

    writer.writeheader()

    writer.writerows(cleaned_rows)


print()
print("Clean dataset saved:")
print(OUTPUT_FILE)


# ============================================================
# STEP 9 — FINAL SUMMARY
# ============================================================

print()
print("=" * 70)
print("FINAL CLEANING SUMMARY")
print("=" * 70)

print(
    f"Raw records                  : {len(rows)}"
)

print(
    f"Duplicate records removed    : "
    f"{len(removed_duplicates)}"
)

print(
    f"Erroneous records removed    : "
    f"{len(removed_erroneous)}"
)

print(
    f"Final clean records          : "
    f"{len(cleaned_rows)}"
)

print()
print("Removed duplicate IDs:")

if removed_duplicates:

    for ocm_id in removed_duplicates:
        print(f"  {ocm_id}")

else:

    print("  None")


print()
print("Removed erroneous IDs:")

if removed_erroneous:

    for ocm_id in removed_erroneous:
        print(f"  {ocm_id}")

else:

    print("  None")


print()
print("=" * 70)
print("SUCCESS — OCM GUJARAT CLEANING COMPLETE")
print("=" * 70)