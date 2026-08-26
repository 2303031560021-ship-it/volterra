import pandas as pd

# Load final dataset
final = pd.read_csv("final_master.csv")

# Load the source datasets
master = pd.read_csv("master_stations_enriched.csv")
eco = pd.read_csv("ecogears_unique_stations.csv")

# Treat blank cells as missing
final = final.replace(r"^\s*$", pd.NA, regex=True)
master = master.replace(r"^\s*$", pd.NA, regex=True)
eco = eco.replace(r"^\s*$", pd.NA, regex=True)


# -------------------------------------------------
# 1. AC / DC
# -------------------------------------------------

# EcoGears charger level tells us the charging type
# DC Fast -> DC
# Level 1 / Level 2 -> AC

eco["derived_ac_dc"] = pd.NA

eco.loc[
    eco["charger_levels"].str.contains(
        "DC Fast",
        case=False,
        na=False
    ),
    "derived_ac_dc"
] = "DC"

eco.loc[
    eco["charger_levels"].str.contains(
        "Level 1|Level 2",
        case=False,
        na=False,
        regex=True
    ),
    "derived_ac_dc"
] = "AC"


# -------------------------------------------------
# Match EcoGears stations to final stations
# using coordinates
# -------------------------------------------------

def find_nearest_eco(row):
    distances = (
        (eco["latitude"] - row["latitude"]) ** 2
        + (eco["longitude"] - row["longitude"]) ** 2
    )

    return distances.idxmin()


final["eco_index"] = final.apply(
    find_nearest_eco,
    axis=1
)

final["eco_ac_dc"] = final["eco_index"].map(
    eco["derived_ac_dc"]
)


# Fill AC/DC ONLY when currently missing
final["ac_dc"] = final["ac_dc"].combine_first(
    final["eco_ac_dc"]
)


# -------------------------------------------------
# 2. Number of points
# -------------------------------------------------

# IMPORTANT:
# We do NOT invent this value.
# EcoGears does not explicitly provide a
# reliable number-of-points field in our dataset.

print("\nNumber of points:")
print("Kept existing values only.")
print("No values invented.")


# -------------------------------------------------
# 3. Usage
# -------------------------------------------------

# We also don't invent usage.
# Existing values remain untouched.


# -------------------------------------------------
# 4. Last verified
# -------------------------------------------------

# Existing last_verified values remain untouched.
# OCM verification dates are already in the master
# where available.


# -------------------------------------------------
# Remove temporary columns
# -------------------------------------------------

final = final.drop(
    columns=[
        "eco_index",
        "eco_ac_dc"
    ]
)


# -------------------------------------------------
# Save improved final dataset
# -------------------------------------------------

final.to_csv(
    "final_master.csv",
    index=False
)


# -------------------------------------------------
# Report
# -------------------------------------------------

print("\n================================")
print("FINAL MASTER IMPROVED")
print("================================")

print("Total stations:", len(final))

print("\nMissing values:")
print(final.isna().sum())

print("\nAC/DC values:")
print(final["ac_dc"].value_counts(dropna=False))

print("\nSaved:")
print("final_master.csv")