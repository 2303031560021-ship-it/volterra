import pandas as pd
import json

# Load SMC stations
smc = pd.read_csv("smc_stations.csv")

# Load OCM stations
with open("surat_ocm_all.json", "r", encoding="utf-8") as file:
    ocm_data = json.load(file)

# -----------------------------
# SMC stations
# -----------------------------
master = []

for _, row in smc.iterrows():

    master.append({
        "station_name": row["station_name"],
        "latitude": row["latitude"],
        "longitude": row["longitude"],
        "source": "SMC"
    })


# -----------------------------
# Add OCM stations that are NOT
# already represented by SMC
# -----------------------------

for station in ocm_data:

    address = station.get("AddressInfo", {})

    ocm_name = address.get("Title")
    lat = address.get("Latitude")
    lon = address.get("Longitude")

    # Skip the OCM station we confirmed
    # as the same as the SMC Gopi-Talav station
    if ocm_name == "Kot Safil road":
        continue

    master.append({
        "station_name": ocm_name,
        "latitude": lat,
        "longitude": lon,
        "source": "OCM"
    })


# -----------------------------
# Save master dataset
# -----------------------------

master_df = pd.DataFrame(master)

print("Total stations in master dataset:", len(master_df))
print("\nSource breakdown:")
print(master_df["source"].value_counts())

master_df.to_csv("master_stations.csv", index=False)

print("\nSaved as master_stations.csv")