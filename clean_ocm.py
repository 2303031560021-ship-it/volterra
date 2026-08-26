import json
import pandas as pd

with open("surat_ocm_all.json", "r", encoding="utf-8") as file:
    data = json.load(file)

rows = []

for station in data:

    address = station.get("AddressInfo", {})
    connections = station.get("Connections") or []

    # Take the first connector
    connector = connections[0] if connections else {}

    operator = station.get("OperatorInfo") or {}
    status = station.get("StatusType") or {}
    usage = station.get("UsageType") or {}

    rows.append({
        "ocm_id": station.get("ID"),
        "station_name": address.get("Title"),
        "address": address.get("AddressLine1"),
        "city": address.get("Town"),
        "state": address.get("StateOrProvince"),
        "latitude": address.get("Latitude"),
        "longitude": address.get("Longitude"),

        "connector_type": connector.get("ConnectionType", {}).get("Title"),
        "power_kw": connector.get("PowerKW"),
        "ac_dc": connector.get("CurrentType", {}).get("Title"),

        "number_of_points": station.get("NumberOfPoints"),

        "operator": operator.get("Title"),

        "status": status.get("Title"),

        "usage": usage.get("Title"),
        "usage_cost": station.get("UsageCost"),

        "last_verified": station.get("DateLastVerified")
    })


df = pd.DataFrame(rows)

print("\nClean OCM table:")
print(df.to_string(index=False))

df.to_csv("clean_ocm_stations.csv", index=False)

print("\nSaved as clean_ocm_stations.csv")