import pandas as pd
from math import radians, sin, cos, sqrt, atan2

master = pd.read_csv("master_stations_enriched.csv")
eco = pd.read_csv("ecogears_unique_stations.csv")


def distance_km(lat1, lon1, lat2, lon2):
    R = 6371

    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)

    a = (
        sin(dlat / 2) ** 2
        + cos(radians(lat1))
        * cos(radians(lat2))
        * sin(dlon / 2) ** 2
    )

    return R * 2 * atan2(sqrt(a), sqrt(1 - a))


pairs = []

for master_index, m in master.iterrows():

    for eco_index, e in eco.iterrows():

        distance = distance_km(
            m["latitude"],
            m["longitude"],
            e["latitude"],
            e["longitude"]
        )

        if distance <= 0.20:

            pairs.append({
                "master_index": master_index,
                "master_station": m["station_name"],
                "source": m["source"],
                "eco_index": eco_index,
                "ecogears_station": e["station_name"],
                "distance_km": distance
            })


pairs_df = pd.DataFrame(pairs)

if not pairs_df.empty:
    pairs_df = pairs_df.sort_values("distance_km")


used_master = set()
used_eco = set()
matches = []


for _, row in pairs_df.iterrows():

    master_index = row["master_index"]
    eco_index = row["eco_index"]

    if master_index in used_master:
        continue

    if eco_index in used_eco:
        continue

    used_master.add(master_index)
    used_eco.add(eco_index)

    distance = row["distance_km"]

    if distance <= 0.05:
        status = "Strong Match"
    else:
        status = "Possible Match"

    matches.append({
        "master_station": row["master_station"],
        "source": row["source"],
        "ecogears_station": row["ecogears_station"],
        "distance_km": round(distance, 3),
        "match_status": status
    })


result = pd.DataFrame(matches)

# Add master stations that had no EcoGears match
matched_master = set(result["master_station"]) if not result.empty else set()

for _, m in master.iterrows():

    if m["station_name"] not in matched_master:

        result = pd.concat([
            result,
            pd.DataFrame([{
                "master_station": m["station_name"],
                "source": m["source"],
                "ecogears_station": None,
                "distance_km": None,
                "match_status": "No Close Match"
            }])
        ], ignore_index=True)


result.to_csv(
    "master_ecogears_matches.csv",
    index=False
)


print("\n--------------------------------")
print("EcoGears Matching Summary")
print("--------------------------------")

print("Master stations:", len(master))
print("EcoGears physical stations:", len(eco))

print(
    "Strong matches:",
    (result["match_status"] == "Strong Match").sum()
)

print(
    "Possible matches:",
    (result["match_status"] == "Possible Match").sum()
)

print(
    "No close match:",
    (result["match_status"] == "No Close Match").sum()
)

print("\nSaved as master_ecogears_matches.csv")