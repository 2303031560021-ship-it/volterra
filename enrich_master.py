import pandas as pd

# -----------------------------
# Load files
# -----------------------------
master = pd.read_csv("master_stations_enriched.csv")
matches = pd.read_csv("master_ecogears_matches.csv")
eco = pd.read_csv("ecogears_unique_stations.csv")

# Treat blanks as missing
master = master.replace(r"^\s*$", pd.NA, regex=True)
matches = matches.replace(r"^\s*$", pd.NA, regex=True)
eco = eco.replace(r"^\s*$", pd.NA, regex=True)


# -----------------------------
# Keep ONLY strong matches
# -----------------------------
matches = matches[
    matches["match_status"] == "Strong Match"
].copy()

print("Strong EcoGears matches:", len(matches))


# -----------------------------
# Make sure each master station
# appears only once
# -----------------------------
matches = matches.drop_duplicates(
    subset=["master_station"],
    keep="first"
)

print("Unique master matches:", len(matches))


# -----------------------------
# Make EcoGears lookup table
# -----------------------------
eco_info = eco[
    [
        "station_name",
        "connector_types",
        "power_kw",
        "charger_levels",
        "networks",
        "availability",
        "prices"
    ]
].copy()

eco_info = eco_info.rename(
    columns={
        "station_name": "ecogears_station"
    }
)

# Make sure each EcoGears station appears once
eco_info = eco_info.drop_duplicates(
    subset=["ecogears_station"],
    keep="first"
)


# -----------------------------
# Create lookup:
# Master station → EcoGears
# -----------------------------
match_lookup = matches.set_index(
    "master_station"
)["ecogears_station"]

eco_lookup = eco_info.set_index(
    "ecogears_station"
)


# -----------------------------
# Map EcoGears station name
# -----------------------------
master["ecogears_station"] = master[
    "station_name"
].map(match_lookup)


# -----------------------------
# Map EcoGears technical data
# -----------------------------
master["eco_connector"] = master[
    "ecogears_station"
].map(eco_lookup["connector_types"])

master["eco_power"] = master[
    "ecogears_station"
].map(eco_lookup["power_kw"])

master["eco_network"] = master[
    "ecogears_station"
].map(eco_lookup["networks"])

master["eco_status"] = master[
    "ecogears_station"
].map(eco_lookup["availability"])

master["eco_price"] = master[
    "ecogears_station"
].map(eco_lookup["prices"])


# -----------------------------
# Fill ONLY missing values
# -----------------------------
master["connector_type"] = (
    master["connector_type"]
    .combine_first(master["eco_connector"])
)

master["power_kw"] = (
    master["power_kw"]
    .combine_first(master["eco_power"])
)

master["operator"] = (
    master["operator"]
    .combine_first(master["eco_network"])
)

master["status"] = (
    master["status"]
    .combine_first(master["eco_status"])
)

master["usage_cost"] = (
    master["usage_cost"]
    .combine_first(master["eco_price"])
)


# -----------------------------
# Remove temporary columns
# -----------------------------
master = master.drop(
    columns=[
        "ecogears_station",
        "eco_connector",
        "eco_power",
        "eco_network",
        "eco_status",
        "eco_price"
    ]
)


# -----------------------------
# Safety check
# -----------------------------
if len(master) != 54:
    print("\nERROR!")
    print("Master has", len(master), "rows.")
    print("Expected exactly 54.")
    print("NOT saving changes.")
    exit()


# -----------------------------
# Backup current master
# -----------------------------
master.to_csv(
    "master_stations_enriched_backup.csv",
    index=False
)


# -----------------------------
# Save updated master
# -----------------------------
master.to_csv(
    "master_stations_enriched.csv",
    index=False
)


# -----------------------------
# Results
# -----------------------------
print()
print("================================")
print("EcoGears enrichment completed")
print("================================")

print("Total stations:", len(master))

print()
print("Missing values AFTER EcoGears:")
print(master.isna().sum())

print()
print("Stations with technical information:")

technical = master[
    master["connector_type"].notna()
    | master["power_kw"].notna()
    | master["ac_dc"].notna()
]

print(len(technical))

print()
print("Backup created:")
print("master_stations_enriched_backup.csv")