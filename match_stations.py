import json
import pandas as pd
from math import radians, sin, cos, sqrt, atan2


# -----------------------------
# 1. Load SMC data
# -----------------------------
smc = pd.read_csv("smc_stations.csv")


# -----------------------------
# 2. Load OCM data
# -----------------------------
with open("surat_ocm_all.json", "r", encoding="utf-8") as file:
    ocm_data = json.load(file)


ocm_rows = []

for station in ocm_data:
    address = station.get("AddressInfo", {})

    ocm_rows.append({
        "ocm_id": station.get("ID"),
        "ocm_name": address.get("Title"),
        "ocm_latitude": address.get("Latitude"),
        "ocm_longitude": address.get("Longitude")
    })

ocm = pd.DataFrame(ocm_rows)


# -----------------------------
# 3. Calculate distance
# -----------------------------
def distance_km(lat1, lon1, lat2, lon2):

    R = 6371

    lat1, lon1, lat2, lon2 = map(
        radians,
        [lat1, lon1, lat2, lon2]
    )

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        sin(dlat / 2) ** 2
        + cos(lat1)
        * cos(lat2)
        * sin(dlon / 2) ** 2
    )

    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return R * c


# -----------------------------
# 4. Find nearest OCM station
# -----------------------------
results = []

for _, smc_station in smc.iterrows():

    smc_lat = smc_station["latitude"]
    smc_lon = smc_station["longitude"]

    if pd.isna(smc_lat) or pd.isna(smc_lon):
        results.append({
            "smc_name": smc_station["station_name"],
            "nearest_ocm": None,
            "distance_km": None,
            "match_status": "Missing SMC coordinates"
        })
        continue

    nearest_name = None
    nearest_distance = float("inf")

    for _, ocm_station in ocm.iterrows():

        if pd.isna(ocm_station["ocm_latitude"]) or pd.isna(ocm_station["ocm_longitude"]):
            continue

        distance = distance_km(
            smc_lat,
            smc_lon,
            ocm_station["ocm_latitude"],
            ocm_station["ocm_longitude"]
        )

        if distance < nearest_distance:
            nearest_distance = distance
            nearest_name = ocm_station["ocm_name"]

    if nearest_distance <= 0.2:
        status = "Likely Match"
    else:
        status = "No Close Match"

    results.append({
        "smc_name": smc_station["station_name"],
        "nearest_ocm": nearest_name,
        "distance_km": round(nearest_distance, 3),
        "match_status": status
    })


# -----------------------------
# 5. Create result
# -----------------------------
matches = pd.DataFrame(results)

print("\nSMC → OCM matching results:")
print(matches.to_string(index=False))

matches.to_csv("smc_ocm_matches.csv", index=False)

print("\nSaved as smc_ocm_matches.csv")