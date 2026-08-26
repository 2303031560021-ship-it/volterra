import requests
import pandas as pd

URL = "https://map.ecogears.in/hcgi/platform/api/collections/stations/records"

params = {
    "page": 1,
    "perPage": 500,
    "skipTotal": 1,
    "filter": (
        "latitude >= 21.10 && "
        "latitude <= 21.26 && "
        "longitude >= 72.70 && "
        "longitude <= 72.95"
    )
}

response = requests.get(URL, params=params, timeout=30)

print("Status:", response.status_code)

response.raise_for_status()

data = response.json()

stations = data.get("items", [])

print("EcoGears Surat stations:", len(stations))

# Keep useful fields
rows = []

for s in stations:
    rows.append({
        "ecogears_id": s.get("id"),
        "station_name": s.get("name"),
        "address": s.get("address"),
        "latitude": s.get("latitude"),
        "longitude": s.get("longitude"),
        "availability": s.get("availability"),
        "charger_level": s.get("chargerLevel"),
        "connector_type": s.get("connectorType"),
        "connector_types": ", ".join(s.get("connectorTypes", [])),
        "network": s.get("network"),
        "power_kw": s.get("powerOutput"),
        "price_per_kwh": s.get("pricePerKwh"),
        "description": s.get("description"),
        "created": s.get("created"),
        "updated": s.get("updated")
    })

df = pd.DataFrame(rows)

print("\nEcoGears dataset:")
print(df.to_string(index=False))

df.to_csv("ecogears_surat.csv", index=False)

print("\nSaved as ecogears_surat.csv")