"""
VOLTERRA - Final India Master Dataset Builder
==============================================

Input:
    EV_PCS_Data_29277.pdf

Output:
    final_master_india.csv

Purpose:
    Build a clean India-wide public EV charging station master
    dataset from the BEE station-level PDF.

Important principles:
    - Raw source information is preserved as much as possible.
    - Missing values remain missing.
    - No artificial power/operator/status/pricing values are created.
    - Exact duplicate source records are removed.
    - Multiple charger records at the same physical coordinates
      are combined into one physical station.
    - Different charger types at the same station are preserved.
    - Nearby stations are NOT merged merely because they are close.
"""

from pathlib import Path
import re
import sys
import math

import fitz
import pandas as pd
import numpy as np


# ============================================================
# FILES
# ============================================================

ROOT = Path(__file__).resolve().parent

PDF_FILE = ROOT / "EV_PCS_Data_29277.pdf"
OUTPUT_FILE = ROOT / "final_master_india.csv"


# ============================================================
# SOURCE
# ============================================================

SOURCE = "BEE EV Public Charging Stations Data till 26 October 2025"
DATA_DATE = "2025-10-26"


# ============================================================
# PDF COLUMN POSITIONS
# ============================================================

COLUMN_STARTS = [
    50,
    80,
    115,
    170,
    230,
    295,
    500,
    537,
    570,
    650,
    675,
    705,
]

RAW_COLUMNS = [
    "cpo_name",
    "govt_private",
    "state",
    "district",
    "city_village",
    "location",
    "latitude",
    "longitude",
    "charger_type",
    "charger_rating",
    "connector_rating",
    "num_connectors",
]


# ============================================================
# VALID INDIAN STATES / UTs
# ============================================================

VALID_STATES = {
    "Andaman and Nicobar Islands",
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chandigarh",
    "Chhattisgarh",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jammu and Kashmir",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Ladakh",
    "Lakshadweep",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Puducherry",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
}


# ============================================================
# STATE NORMALIZATION
# ============================================================

STATE_ALIASES = {
    "ANDAMAN & NICOBAR": "Andaman and Nicobar Islands",
    "ANDAMAN AND NICOBAR": "Andaman and Nicobar Islands",
    "ANDAMAN & NICOBAR ISLANDS": "Andaman and Nicobar Islands",
    "ANDAMAN AND NICOBAR ISLANDS": "Andaman and Nicobar Islands",

    "ANDHRA PRADESH": "Andhra Pradesh",

    "ARUNACHAL PRADESH": "Arunachal Pradesh",

    "ASSAM": "Assam",

    "BIHAR": "Bihar",

    "CHANDIGARH": "Chandigarh",

    "CHHATTISGARH": "Chhattisgarh",

    "DADRA AND NAGAR HAVELI AND DAMAN AND DIU":
        "Dadra and Nagar Haveli and Daman and Diu",

    "DADRA & NAGAR HAVELI AND DAMAN & DIU":
        "Dadra and Nagar Haveli and Daman and Diu",

    "UT OF D&NH AND D&D":
        "Dadra and Nagar Haveli and Daman and Diu",

    "UT OF DNH AND D&D":
        "Dadra and Nagar Haveli and Daman and Diu",

    "DELHI": "Delhi",

    "GOA": "Goa",

    "GUJARAT": "Gujarat",
    "GJ": "Gujarat",

    "HARYANA": "Haryana",

    "HIMACHAL PRADESH": "Himachal Pradesh",

    "J&K": "Jammu and Kashmir",
    "J & K": "Jammu and Kashmir",
    "JAMMU & KASHMIR": "Jammu and Kashmir",
    "JAMMU AND KASHMIR": "Jammu and Kashmir",

    "JHARKHAND": "Jharkhand",

    "KARNATAKA": "Karnataka",

    "KERALA": "Kerala",

    "LADAKH": "Ladakh",

    "LAKSHADWEEP": "Lakshadweep",

    "MADHYA PRADESH": "Madhya Pradesh",

    "MAHARASHTRA": "Maharashtra",

    "MANIPUR": "Manipur",

    "MEGHALAYA": "Meghalaya",

    "MIZORAM": "Mizoram",

    "NAGALAND": "Nagaland",

    "ODISHA": "Odisha",
    "ORISSA": "Odisha",

    "PUDUCHERRY": "Puducherry",
    "PONDICHERRY": "Puducherry",

    "PUNJAB": "Punjab",

    "RAJASTHAN": "Rajasthan",

    "SIKKIM": "Sikkim",

    "TAMIL NADU": "Tamil Nadu",

    "TELANGANA": "Telangana",

    "TRIPURA": "Tripura",

    "UTTAR PRADESH": "Uttar Pradesh",

    "UTTRAKHAND": "Uttarakhand",
    "UTTARAKHAND": "Uttarakhand",

    "WEST BENGAL": "West Bengal",
}


# ============================================================
# TEXT CLEANING
# ============================================================

def clean_text(value):
    if value is None:
        return ""

    if pd.isna(value):
        return ""

    value = str(value)

    value = value.replace("\x00", " ")
    value = value.replace("\r", " ")
    value = value.replace("\n", " ")

    value = re.sub(r"\s+", " ", value)

    return value.strip()


# ============================================================
# NUMBER CLEANING
# ============================================================

def parse_number(value):
    value = clean_text(value)

    if not value:
        return np.nan

    value = value.replace(",", "")

    match = re.search(
        r"-?\d+(?:\.\d+)?",
        value
    )

    if not match:
        return np.nan

    try:
        return float(match.group())
    except ValueError:
        return np.nan


# ============================================================
# STATE NORMALIZATION
# ============================================================

def normalize_state(value):

    value = clean_text(value)

    if not value:
        return ""

    upper = value.upper()

    if upper in STATE_ALIASES:
        return STATE_ALIASES[upper]

    # Exact match against known canonical states.
    for state in VALID_STATES:

        if upper == state.upper():
            return state

    return ""


# ============================================================
# CHARGER TYPE NORMALIZATION
# ============================================================

def normalize_charger_type(value):

    value = clean_text(value)

    if not value:
        return ""

    # Normalize common spacing.
    value = re.sub(
        r"\s+",
        " ",
        value
    ).strip()

    # Normalize separators.
    value = re.sub(
        r"\s*\+\s*",
        " + ",
        value
    )

    value = re.sub(
        r"\s*;\s*",
        "; ",
        value
    )

    # Normalize capitalization of known terms.
    replacements = {
        "LEV AC charge point": "LEV AC Charge point",
        "LEV DC charge point (IS-17017-2-7)":
            "LEV DC Charge Point (IS-17017-2-7)",
        "LEV DC charge point (IS-17017-2-6)":
            "LEV DC Charge Point (IS-17017-2-6)",
        "bharat ac-001": "Bharat AC-001",
        "bharat dc-001": "Bharat DC-001",
        "type-ii ac": "Type-II AC",
        "type ii ac": "Type-II AC",
        "ccs-ii": "CCS-II",
        "chademo": "CHAdeMO",
    }

    for old, new in replacements.items():
        value = re.sub(
            re.escape(old),
            new,
            value,
            flags=re.IGNORECASE
        )

    return value


# ============================================================
# DEDUPLICATE VALUES INSIDE A FIELD
# ============================================================

def unique_values(values):

    output = []

    seen = set()

    for value in values:

        value = clean_text(value)

        if not value:
            continue

        # Charger fields can contain semicolon-separated values.
        pieces = [
            clean_text(x)
            for x in value.split(";")
        ]

        for piece in pieces:

            if not piece:
                continue

            key = piece.casefold()

            if key not in seen:
                seen.add(key)
                output.append(piece)

    return output


# ============================================================
# CANONICAL CHARGER TYPE LIST
# ============================================================

def canonical_charger_types(values):

    values = unique_values(values)

    result = []

    seen = set()

    for value in values:

        value = normalize_charger_type(value)

        if not value:
            continue

        # ----------------------------------------------------
        # If a value contains multiple charger types joined
        # by spaces, preserve legitimate combined records.
        #
        # We DO NOT blindly split because BEE itself uses
        # combo names.
        # ----------------------------------------------------

        key = value.casefold()

        if key not in seen:
            seen.add(key)
            result.append(value)

    return result


# ============================================================
# AC/DC CLASSIFICATION
# ============================================================

def classify_ac_dc(charger_types):

    text = " | ".join(charger_types).upper()

    if not text:
        return ""

    has_ac = False
    has_dc = False

    # AC.
    if any(
        term in text
        for term in [
            "TYPE-II AC",
            "TYPE II AC",
            "BHARAT AC",
            "LEV AC",
        ]
    ):
        has_ac = True

    # Type II without AC can still represent AC charging.
    if "TYPE II" in text:
        has_ac = True

    # DC.
    if any(
        term in text
        for term in [
            "CCS",
            "CHADEMO",
            "BHARAT DC",
            "LEV DC",
        ]
    ):
        has_dc = True

    if has_ac and has_dc:
        return "AC+DC"

    if has_ac:
        return "AC"

    if has_dc:
        return "DC"

    return ""


# ============================================================
# EXTRACT PDF
# ============================================================

def get_column_index(x):

    selected = 0

    for i, start in enumerate(COLUMN_STARTS):

        if x >= start:
            selected = i
        else:
            break

    return selected


def is_header_block(block_words):
    """Check whether a set of words represents a table header."""

    text = " ".join(
        clean_text(w[4])
        for w in block_words
    ).lower()

    return (
        "cpo name" in text
        and "latitude" in text
        and "longitude" in text
    )


# ============================================================
# Y-GAP ROW SPLITTING
# ============================================================
#
# The PDF contains two kinds of pages:
#
# 1. Pages where each logical row is its own PDF block
#    (1–3 Y-values per block, gap ~3.8pt between wrapped
#    lines within the row).
#
# 2. Pages where PyMuPDF groups MULTIPLE logical rows into
#    one large PDF block (up to 77 Y-values / ~24 rows).
#
# Measured across the entire PDF:
#
#   Intra-row Y gaps:  0.20 – 3.80 pt
#   Inter-row Y gaps:  7.80 – 7.90 pt
#
# A threshold of 4.0 pt cleanly separates them with zero
# ambiguous cases.
#
# Within each logical row there are typically 2 Y-lines
# ~0.2pt apart containing identical data (a PDF rendering
# artifact). We deduplicate text per-column within each row.
# ============================================================

ROW_Y_GAP_THRESHOLD = 4.0


def extract_pdf():

    if not PDF_FILE.exists():

        print()
        print("ERROR: BEE PDF not found.")
        print()
        print(PDF_FILE)
        print()

        sys.exit(1)

    print("=" * 70)
    print("VOLTERRA - INDIA MASTER DATASET")
    print("=" * 70)
    print()

    print("Input:")
    print(PDF_FILE)
    print()

    document = fitz.open(
        str(PDF_FILE)
    )

    records = []

    total_pages = len(document)

    print(
        f"PDF pages: {total_pages:,}"
    )

    print(
        "Extracting records..."
    )

    print()

    for page_number in range(
        total_pages
    ):

        page = document[
            page_number
        ]

        words = page.get_text(
            "words"
        )

        # ------------------------------------------------
        # Separate header words from data words.
        # ------------------------------------------------

        blocks = {}

        for word in words:

            block_number = word[5]

            blocks.setdefault(
                block_number,
                []
            ).append(word)

        data_words = []

        for block_words in blocks.values():

            if not block_words:
                continue

            if is_header_block(block_words):
                continue

            data_words.extend(block_words)

        if not data_words:
            continue

        # ------------------------------------------------
        # Sort all data words by Y then X.
        # ------------------------------------------------

        data_words.sort(
            key=lambda w: (w[1], w[0])
        )

        # ------------------------------------------------
        # Group words into logical rows using Y gaps.
        #
        # All words with Y-gap < ROW_Y_GAP_THRESHOLD
        # belong to the same logical row.
        # ------------------------------------------------

        row_groups = []
        current_group = [data_words[0]]

        for i in range(
            1, len(data_words)
        ):

            y_gap = (
                data_words[i][1]
                - data_words[i - 1][1]
            )

            if y_gap > ROW_Y_GAP_THRESHOLD:

                row_groups.append(
                    current_group
                )

                current_group = [
                    data_words[i]
                ]

            else:

                current_group.append(
                    data_words[i]
                )

        row_groups.append(
            current_group
        )

        # ------------------------------------------------
        # Merge-forward pass.
        #
        # Some rows span 3 Y-lines where line 1
        # (state/district/location/charger_type) is in a
        # different block from lines 2-3 (CPO/lat/lon),
        # with a gap of ~7.6pt between them.  This causes
        # the Y-gap split to create an orphan group
        # (line 1 alone, no latitude) followed by the
        # data group (lines 2-3 with latitude).
        #
        # We detect orphan groups by checking whether
        # any word falls in the latitude column
        # (x ≈ 500–520).  If not, merge the group's
        # words forward into the next group.
        # ------------------------------------------------

        LAT_X_MIN = 495
        LAT_X_MAX = 530

        merged_groups = []
        pending = None

        for group in row_groups:

            has_lat = any(
                LAT_X_MIN <= w[0] <= LAT_X_MAX
                for w in group
            )

            if has_lat:

                if pending is not None:

                    # Merge pending orphan into
                    # this group.
                    group = pending + group

                merged_groups.append(group)
                pending = None

            else:

                if pending is not None:

                    # Two consecutive orphans:
                    # keep the first as-is (will
                    # be dropped later since it
                    # has no latitude), start new
                    # pending.
                    merged_groups.append(pending)

                pending = group

        if pending is not None:
            merged_groups.append(pending)

        row_groups = merged_groups

        # ------------------------------------------------
        # Convert each logical row group into a record.
        # ------------------------------------------------

        for row_index, row_words in enumerate(
            row_groups
        ):

            columns = [
                []
                for _ in range(12)
            ]

            # Track text already seen in each column
            # to deduplicate paired Y-lines (~0.2pt
            # apart with identical data).
            seen = [
                set()
                for _ in range(12)
            ]

            for word in row_words:

                x = word[0]
                text = clean_text(
                    word[4]
                )

                if not text:
                    continue

                column = get_column_index(
                    x
                )

                if 0 <= column < 12:

                    if text not in seen[
                        column
                    ]:

                        columns[
                            column
                        ].append(text)

                        seen[
                            column
                        ].add(text)

            row = [
                clean_text(
                    " ".join(values)
                )
                for values in columns
            ]

            latitude = parse_number(
                row[6]
            )

            longitude = parse_number(
                row[7]
            )

            if pd.isna(latitude):
                continue

            if pd.isna(longitude):
                continue

            if not (
                -90 <= latitude <= 90
            ):
                continue

            if not (
                -180 <= longitude <= 180
            ):
                continue

            records.append(
                row + [
                    page_number + 1,
                    row_index,
                ]
            )

        if (
            (page_number + 1) % 100 == 0
            or page_number + 1 == total_pages
        ):

            print(
                f"Processed "
                f"{page_number + 1:,}/"
                f"{total_pages:,} pages | "
                f"Records: "
                f"{len(records):,}"
            )

    document.close()

    return pd.DataFrame(
        records,
        columns=RAW_COLUMNS + [
            "source_page",
            "source_row_index",
        ]
    )


# ============================================================
# CLEAN SOURCE RECORDS
# ============================================================

def clean_source_dataframe(df):

    df = df.copy()

    text_columns = [
        "cpo_name",
        "govt_private",
        "state",
        "district",
        "city_village",
        "location",
        "charger_type",
        "connector_rating",
    ]

    for column in text_columns:

        df[column] = (
            df[column]
            .map(clean_text)
        )

    # Numeric.
    df["latitude"] = (
        df["latitude"]
        .map(parse_number)
    )

    df["longitude"] = (
        df["longitude"]
        .map(parse_number)
    )

    df["charger_rating"] = (
        df["charger_rating"]
        .map(parse_number)
    )

    df["num_connectors"] = (
        df["num_connectors"]
        .map(parse_number)
    )

    # State.
    df["state_raw"] = df["state"]

    df["state"] = (
        df["state"]
        .map(normalize_state)
    )

    # Charger type.
    df["charger_type"] = (
        df["charger_type"]
        .map(normalize_charger_type)
    )

    # Operator.
    df["cpo_name"] = (
        df["cpo_name"]
        .map(clean_text)
    )

    # Remove rows with no useful information.
    useful_columns = [
        "cpo_name",
        "district",
        "city_village",
        "location",
        "charger_type",
        "charger_rating",
        "connector_rating",
        "num_connectors",
    ]

    useful = (
        df[useful_columns]
        .fillna("")
        .astype(str)
        .apply(
            lambda col:
            col.str.strip().ne("")
        )
        .any(axis=1)
    )

    df = df[
        useful
    ].copy()

    return df


# ============================================================
# STATE RECOVERY
# ============================================================

def state_from_location(location):

    location = clean_text(
        location
    )

    if not location:
        return ""

    upper = location.upper()

    # Exact canonical states first.
    for state in sorted(
        VALID_STATES,
        key=len,
        reverse=True
    ):

        if state.upper() in upper:
            return state

    # Aliases.
    for alias, state in sorted(
        STATE_ALIASES.items(),
        key=lambda x: len(x[0]),
        reverse=True
    ):

        if alias in upper:
            return state

    return ""


def recover_states(df):

    df = df.copy()

    df["state_inferred"] = False

    # --------------------------------------------------------
    # 1. Explicit location evidence.
    # --------------------------------------------------------

    inferred_location = (
        df["location"]
        .map(state_from_location)
    )

    mask = (
        df["state"].eq("")
        & inferred_location.ne("")
    )

    df.loc[
        mask,
        "state"
    ] = inferred_location[
        mask
    ]

    df.loc[
        mask,
        "state_inferred"
    ] = True

    # --------------------------------------------------------
    # 2. Safe page inference.
    #
    # Only infer when a page has exactly ONE known state.
    # --------------------------------------------------------

    page_state_sets = (
        df[
            df["state"].ne("")
        ]
        .groupby(
            "source_page"
        )["state"]
        .agg(
            lambda x:
            set(x)
        )
    )

    page_state_map = {}

    for page, states in page_state_sets.items():

        if len(states) == 1:

            state = next(
                iter(states)
            )

            if state in VALID_STATES:
                page_state_map[
                    page
                ] = state

    if page_state_map:

        page_inferred = (
            df["source_page"]
            .map(page_state_map)
        )

        mask = (
            df["state"].eq("")
            & page_inferred.notna()
        )

        df.loc[
            mask,
            "state"
        ] = page_inferred[
            mask
        ]

        df.loc[
            mask,
            "state_inferred"
        ] = True

    # --------------------------------------------------------
    # 3. Unique district -> state.
    #
    # Only when the district occurs in exactly one state.
    # --------------------------------------------------------

    district_state_sets = (
        df[
            df["state"].ne("")
            & df["district"].ne("")
        ]
        .groupby(
            "district"
        )["state"]
        .agg(
            lambda x:
            set(x)
        )
    )

    district_map = {}

    for district, states in (
        district_state_sets.items()
    ):

        if len(states) == 1:

            state = next(
                iter(states)
            )

            if state in VALID_STATES:
                district_map[
                    district
                ] = state

    if district_map:

        district_inferred = (
            df["district"]
            .map(district_map)
        )

        mask = (
            df["state"].eq("")
            & district_inferred.notna()
        )

        df.loc[
            mask,
            "state"
        ] = district_inferred[
            mask
        ]

        df.loc[
            mask,
            "state_inferred"
        ] = True

    return df


# ============================================================
# EXACT DUPLICATES
# ============================================================

def remove_exact_duplicates(df):

    df = df.copy()

    duplicate_columns = [
        "cpo_name",
        "govt_private",
        "state",
        "district",
        "city_village",
        "location",
        "latitude",
        "longitude",
        "charger_type",
        "charger_rating",
        "connector_rating",
        "num_connectors",
    ]

    before = len(df)

    df = df.drop_duplicates(
        subset=duplicate_columns,
        keep="first"
    ).copy()

    removed = (
        before
        - len(df)
    )

    return df, removed


# ============================================================
# STATION AGGREGATION
# ============================================================

def build_station_master(df):

    stations = []

    grouped = df.groupby(
        [
            "latitude",
            "longitude",
        ],
        sort=False,
        dropna=False,
    )

    for (
        latitude,
        longitude
    ), group in grouped:

        # ----------------------------------------------------
        # Basic fields.
        # ----------------------------------------------------

        states = unique_values(
            group["state"]
        )

        districts = unique_values(
            group["district"]
        )

        cities = unique_values(
            group["city_village"]
        )

        locations = unique_values(
            group["location"]
        )

        operators = unique_values(
            group["cpo_name"]
        )

        ownership = unique_values(
            group["govt_private"]
        )

        charger_types = canonical_charger_types(
            group["charger_type"]
        )

        connector_ratings = unique_values(
            group["connector_rating"]
        )

        # ----------------------------------------------------
        # Power.
        #
        # Use maximum reported charger rating at the station.
        # ----------------------------------------------------

        powers = pd.to_numeric(
            group["charger_rating"],
            errors="coerce"
        ).dropna()

        if len(powers):
            max_power = float(
                powers.max()
            )
        else:
            max_power = np.nan

        # ----------------------------------------------------
        # Connector count.
        #
        # Sum connector counts across distinct source records.
        # Exact duplicate records have already been removed.
        # ----------------------------------------------------

        connectors = pd.to_numeric(
            group["num_connectors"],
            errors="coerce"
        ).dropna()

        if len(connectors):
            connector_count = int(
                round(
                    connectors.sum()
                )
            )
        else:
            connector_count = np.nan

        # ----------------------------------------------------
        # Station name.
        # ----------------------------------------------------

        if locations:
            station_name = locations[0]

        elif cities:
            station_name = cities[0]

        elif operators:
            station_name = (
                operators[0]
                + " Charging Station"
            )

        else:
            station_name = (
                f"{latitude:.6f}, "
                f"{longitude:.6f}"
            )

        # ----------------------------------------------------
        # AC / DC.
        # ----------------------------------------------------

        ac_dc = classify_ac_dc(
            charger_types
        )

        # ----------------------------------------------------
        # Source record count.
        # ----------------------------------------------------

        source_record_count = int(
            len(group)
        )

        # ----------------------------------------------------
        # Original source duplicates represented by the
        # source_record_count after exact duplicate removal.
        # ----------------------------------------------------

        station_id = (
            f"BEE-"
            f"{latitude:.6f}-"
            f"{longitude:.6f}"
        )

        stations.append({

            "station_id":
                station_id,

            "station_name":
                station_name,

            "state":
                states[0]
                if states
                else "",

            "district":
                districts[0]
                if districts
                else "",

            "city":
                cities[0]
                if cities
                else "",

            "location":
                locations[0]
                if locations
                else "",

            "latitude":
                float(latitude),

            "longitude":
                float(longitude),

            "operator":
                "; ".join(
                    operators
                ),

            "govt_private":
                "; ".join(
                    ownership
                ),

            "charger_type":
                "; ".join(
                    charger_types
                ),

            "ac_dc":
                ac_dc,

            "power_kw":
                max_power,

            "connector_rating":
                "; ".join(
                    connector_ratings
                ),

            "num_connectors":
                connector_count,

            "source_record_count":
                source_record_count,

            "source":
                SOURCE,

            "data_date":
                DATA_DATE,

            "status":
                "",

            "usage_cost":
                "",

        })

    return pd.DataFrame(
        stations
    )


# ============================================================
# FINAL FIELD CLEANUP
# ============================================================

def final_cleanup(master):

    master = master.copy()

    # Remove duplicated charger types one final time.
    cleaned_types = []

    for value in master[
        "charger_type"
    ]:

        types = canonical_charger_types(
            [value]
        )

        cleaned_types.append(
            "; ".join(types)
        )

    master[
        "charger_type"
    ] = cleaned_types

    # Recalculate AC/DC after final charger cleaning.
    master[
        "ac_dc"
    ] = master[
        "charger_type"
    ].map(
        lambda value:
        classify_ac_dc(
            canonical_charger_types(
                [value]
            )
        )
    )

    # Clean string fields.
    for column in [
        "station_name",
        "state",
        "district",
        "city",
        "location",
        "operator",
        "govt_private",
        "charger_type",
        "connector_rating",
        "source",
        "data_date",
        "status",
        "usage_cost",
    ]:

        master[column] = (
            master[column]
            .map(clean_text)
        )

    return master


# ============================================================
# VALIDATION
# ============================================================

def validate(master):

    errors = []

    warnings = []

    # --------------------------------------------------------
    # Required columns.
    # --------------------------------------------------------

    required = [
        "station_id",
        "station_name",
        "state",
        "district",
        "city",
        "location",
        "latitude",
        "longitude",
        "operator",
        "govt_private",
        "charger_type",
        "ac_dc",
        "power_kw",
        "connector_rating",
        "num_connectors",
        "source_record_count",
        "source",
        "data_date",
        "status",
        "usage_cost",
    ]

    for column in required:

        if column not in master.columns:
            errors.append(
                f"Missing column: {column}"
            )

    # --------------------------------------------------------
    # Coordinates.
    # --------------------------------------------------------

    if master["latitude"].isna().any():
        errors.append(
            "Missing latitude values."
        )

    if master["longitude"].isna().any():
        errors.append(
            "Missing longitude values."
        )

    if (
        ~master["latitude"].between(
            -90,
            90
        )
    ).any():
        errors.append(
            "Invalid latitude values."
        )

    if (
        ~master["longitude"].between(
            -180,
            180
        )
    ).any():
        errors.append(
            "Invalid longitude values."
        )

    # --------------------------------------------------------
    # Station IDs.
    # --------------------------------------------------------

    if master[
        "station_id"
    ].duplicated().any():

        errors.append(
            "Duplicate station IDs."
        )

    # --------------------------------------------------------
    # Coordinates.
    # --------------------------------------------------------

    if master[
        [
            "latitude",
            "longitude",
        ]
    ].duplicated().any():

        errors.append(
            "Duplicate coordinate pairs "
            "exist in final master."
        )

    # --------------------------------------------------------
    # States.
    # --------------------------------------------------------

    invalid_states = set(
        master[
            master["state"].ne("")
        ]["state"]
        .unique()
    ) - VALID_STATES

    if invalid_states:

        errors.append(
            "Invalid state values: "
            + ", ".join(
                sorted(
                    invalid_states
                )
            )
        )

    missing_states = int(
        master["state"].eq("").sum()
    )

    if missing_states:

        warnings.append(
            f"{missing_states:,} stations "
            "have no confirmed state."
        )

    # --------------------------------------------------------
    # AC/DC.
    # --------------------------------------------------------

    valid_acdc = {
        "",
        "AC",
        "DC",
        "AC+DC",
    }

    invalid_acdc = set(
        master[
            "ac_dc"
        ].unique()
    ) - valid_acdc

    if invalid_acdc:

        errors.append(
            "Invalid AC/DC values: "
            + ", ".join(
                sorted(
                    invalid_acdc
                )
            )
        )

    # --------------------------------------------------------
    # Power.
    # --------------------------------------------------------

    if (
        master["power_kw"].notna()
        & (
            master["power_kw"]
            < 0
        )
    ).any():

        errors.append(
            "Negative power values."
        )

    # --------------------------------------------------------
    # Connector counts.
    # --------------------------------------------------------

    if (
        master["num_connectors"].notna()
        & (
            master["num_connectors"]
            < 0
        )
    ).any():

        errors.append(
            "Negative connector counts."
        )

    # --------------------------------------------------------
    # Charger type.
    # --------------------------------------------------------

    missing_charger_type = int(
        master[
            "charger_type"
        ].eq("").sum()
    )

    if missing_charger_type:

        warnings.append(
            f"{missing_charger_type:,} stations "
            "have no charger type."
        )

    # --------------------------------------------------------
    # Operator.
    # --------------------------------------------------------

    missing_operator = int(
        master[
            "operator"
        ].eq("").sum()
    )

    if missing_operator:

        warnings.append(
            f"{missing_operator:,} stations "
            "have no operator/CPO."
        )

    # --------------------------------------------------------
    # Print.
    # --------------------------------------------------------

    print()
    print("=" * 70)
    print("VALIDATION")
    print("=" * 70)

    if errors:

        print()
        print("CRITICAL ERRORS:")

        for error in errors:
            print(
                "  ERROR:",
                error
            )

    else:

        print()
        print(
            "CRITICAL STRUCTURE: PASS"
        )

    if warnings:

        print()
        print("DATA WARNINGS:")

        for warning in warnings:
            print(
                "  WARNING:",
                warning
            )

    return errors, warnings


# ============================================================
# QA SUMMARY
# ============================================================

def print_summary(
    raw_count,
    cleaned_count,
    duplicates_removed,
    master,
):

    print()
    print("=" * 70)
    print("FINAL INDIA MASTER DATASET")
    print("=" * 70)

    print()
    print(
        f"Raw extracted records:          "
        f"{raw_count:,}"
    )

    print(
        f"Cleaned source records:         "
        f"{cleaned_count:,}"
    )

    print(
        f"Exact duplicates removed:       "
        f"{duplicates_removed:,}"
    )

    print(
        f"Final physical stations:        "
        f"{len(master):,}"
    )

    print()
    print("STATES")

    print(
        f"Valid states represented:       "
        f"{master.loc[master['state'].ne(''), 'state'].nunique():,}"
    )

    print(
        f"Missing state:                  "
        f"{int(master['state'].eq('').sum()):,}"
    )

    print()
    print("AC / DC")

    print(
        f"AC:                             "
        f"{int((master['ac_dc'] == 'AC').sum()):,}"
    )

    print(
        f"DC:                             "
        f"{int((master['ac_dc'] == 'DC').sum()):,}"
    )

    print(
        f"AC + DC:                        "
        f"{int((master['ac_dc'] == 'AC+DC').sum()):,}"
    )

    print(
        f"Unknown:                        "
        f"{int(master['ac_dc'].eq('').sum()):,}"
    )

    print()
    print("MISSING DATA")

    print(
        f"Operator missing:              "
        f"{int(master['operator'].eq('').sum()):,}"
    )

    print(
        f"Charger type missing:          "
        f"{int(master['charger_type'].eq('').sum()):,}"
    )

    print(
        f"Power missing:                 "
        f"{int(master['power_kw'].isna().sum()):,}"
    )

    print(
        f"Connector count missing:       "
        f"{int(master['num_connectors'].isna().sum()):,}"
    )

    print()
    print("TOP STATES")

    state_counts = (
        master[
            master["state"].ne("")
        ]["state"]
        .value_counts()
        .head(20)
    )

    for state, count in (
        state_counts.items()
    ):

        print(
            f"  {state:<50}"
            f"{count:,}"
        )

    print()
    print("CHARGER TYPES")

    charger_counts = {}

    for value in master[
        "charger_type"
    ]:

        types = canonical_charger_types(
            [value]
        )

        for charger in types:

            charger_counts[
                charger
            ] = (
                charger_counts.get(
                    charger,
                    0
                )
                + 1
            )

    charger_counts = sorted(
        charger_counts.items(),
        key=lambda x: (
            -x[1],
            x[0]
        )
    )

    for charger, count in charger_counts[
        :30
    ]:

        print(
            f"  {charger:<55}"
            f"{count:,}"
        )

    print()
    print("=" * 70)


# ============================================================
# MAIN
# ============================================================

def main():

    # --------------------------------------------------------
    # Extract.
    # --------------------------------------------------------

    raw = extract_pdf()

    raw_count = len(
        raw
    )

    if raw_count == 0:

        print(
            "ERROR: No records extracted."
        )

        sys.exit(1)

    print()
    print(
        f"Raw records extracted: "
        f"{raw_count:,}"
    )

    # --------------------------------------------------------
    # Clean.
    # --------------------------------------------------------

    cleaned = clean_source_dataframe(
        raw
    )

    # --------------------------------------------------------
    # Recover states.
    # --------------------------------------------------------

    cleaned = recover_states(
        cleaned
    )

    # --------------------------------------------------------
    # Remove exact duplicates.
    # --------------------------------------------------------

    cleaned, duplicates_removed = (
        remove_exact_duplicates(
            cleaned
        )
    )

    cleaned_count = len(
        cleaned
    )

    # --------------------------------------------------------
    # Build physical station master.
    # --------------------------------------------------------

    master = build_station_master(
        cleaned
    )

    # --------------------------------------------------------
    # Final cleanup.
    # --------------------------------------------------------

    master = final_cleanup(
        master
    )

    # --------------------------------------------------------
    # Add review flag.
    # --------------------------------------------------------

    master[
        "review_flag"
    ] = ""

    # Missing state.
    master.loc[
        master["state"].eq(""),
        "review_flag"
    ] = "missing_state"

    # Missing charger type.
    mask = (
        master["charger_type"].eq("")
    )

    master.loc[
        mask,
        "review_flag"
    ] = master.loc[
        mask,
        "review_flag"
    ].where(
        master.loc[
            mask,
            "review_flag"
        ].ne(""),
        "missing_charger_type"
    )

    # Missing operator.
    mask = (
        master["operator"].eq("")
    )

    master.loc[
        mask,
        "review_flag"
    ] = master.loc[
        mask,
        "review_flag"
    ].where(
        master.loc[
            mask,
            "review_flag"
        ].ne(""),
        "missing_operator"
    )

    # Missing power.
    mask = (
        master["power_kw"].isna()
    )

    master.loc[
        mask,
        "review_flag"
    ] = master.loc[
        mask,
        "review_flag"
    ].where(
        master.loc[
            mask,
            "review_flag"
        ].ne(""),
        "missing_power"
    )

    # --------------------------------------------------------
    # Sort.
    # --------------------------------------------------------

    master = master.sort_values(
        [
            "state",
            "city",
            "district",
            "station_name",
            "latitude",
            "longitude",
        ],
        kind="stable"
    ).reset_index(
        drop=True
    )

    # --------------------------------------------------------
    # Final column order.
    # --------------------------------------------------------

    columns = [
        "station_id",
        "station_name",
        "state",
        "district",
        "city",
        "location",
        "latitude",
        "longitude",
        "operator",
        "govt_private",
        "charger_type",
        "ac_dc",
        "power_kw",
        "connector_rating",
        "num_connectors",
        "source_record_count",
        "source",
        "data_date",
        "status",
        "usage_cost",
        "review_flag",
    ]

    master = master[
        columns
    ]

    # --------------------------------------------------------
    # Validate.
    # --------------------------------------------------------

    errors, warnings = validate(
        master
    )

    if errors:

        print()
        print(
            "FINAL CSV NOT WRITTEN."
        )

        print(
            "Fix the critical errors above "
            "before continuing."
        )

        sys.exit(1)

    # --------------------------------------------------------
    # Write.
    # --------------------------------------------------------

    master.to_csv(
        OUTPUT_FILE,
        index=False,
        encoding="utf-8-sig"
    )

    # --------------------------------------------------------
    # Summary.
    # --------------------------------------------------------

    print_summary(
        raw_count=raw_count,
        cleaned_count=cleaned_count,
        duplicates_removed=duplicates_removed,
        master=master,
    )

    print()
    print("=" * 70)
    print("SUCCESS")
    print("=" * 70)

    print()
    print(
        "Final file:"
    )

    print(
        OUTPUT_FILE
    )

    print()
    print(
        f"Final physical stations: "
        f"{len(master):,}"
    )

    print()
    print(
        "India master dataset created successfully."
    )


if __name__ == "__main__":
    main()