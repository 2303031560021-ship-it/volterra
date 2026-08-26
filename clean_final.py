import pandas as pd

# Load final master
df = pd.read_csv("final_master.csv")

# Remove low-coverage fields
remove_columns = [
    "number_of_points",
    "usage",
    "last_verified"
]

df = df.drop(
    columns=remove_columns,
    errors="ignore"
)

# Save updated final master
df.to_csv(
    "final_master.csv",
    index=False
)

print("Final master updated!")
print("Total stations:", len(df))

print("\nFinal columns:")
print(df.columns.tolist())

print("\nMissing values:")
print(df.isna().sum())