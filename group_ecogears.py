import pandas as pd

# Load EcoGears data
eco = pd.read_csv("ecogears_surat.csv")

# Round coordinates to about 10 metres
eco["lat_group"] = eco["latitude"].round(4)
eco["lon_group"] = eco["longitude"].round(4)

# Group records at the same physical location
grouped = (
    eco.groupby(["lat_group", "lon_group"], as_index=False)
    .agg(
        station_name=("station_name", "first"),
        address=("address", "first"),
        latitude=("latitude", "first"),
        longitude=("longitude", "first"),
        networks=("network", lambda x: ", ".join(sorted(set(x.dropna())))),
        charger_levels=("charger_level", lambda x: ", ".join(sorted(set(x.dropna())))),
        connector_types=("connector_type", lambda x: ", ".join(sorted(set(x.dropna())))),
        power_kw=("power_kw", lambda x: ", ".join(
            str(int(v)) for v in sorted(set(x.dropna()))
        )),
        prices=("price_per_kwh", lambda x: ", ".join(
            str(v) for v in sorted(set(x.dropna()))
        )),
        availability=("availability", lambda x: ", ".join(sorted(set(x.dropna())))),
        record_count=("station_name", "count")
    )
)

# Remove grouping helper columns
grouped = grouped.drop(
    columns=["lat_group", "lon_group"]
)

# Save
grouped.to_csv(
    "ecogears_unique_stations.csv",
    index=False
)

print("\nOriginal EcoGears records:", len(eco))
print("Unique physical stations:", len(grouped))

print("\nStations with multiple records:")
print(
    grouped[grouped["record_count"] > 1]
    .to_string(index=False)
)

print("\nSaved as ecogears_unique_stations.csv")