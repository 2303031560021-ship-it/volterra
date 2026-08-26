import requests
import json

API_KEY = "d9ab74f8-c213-400d-b979-31df07d8d2c9"

url = "https://api.openchargemap.io/v3/poi/"

search_points = [
    (21.1702, 72.8311),  # Central
    (21.2300, 72.8300),  # North
    (21.1300, 72.8300),  # South
    (21.1700, 72.9000),  # East
    (21.1700, 72.7700)   # West
]

all_stations = []

for latitude, longitude in search_points:

    params = {
        "output": "json",
        "countrycode": "IN",
        "latitude": latitude,
        "longitude": longitude,
        "distance": 15,
        "maxresults": 100,
        "key": API_KEY
    }

    response = requests.get(url, params=params)

    print(
        f"Search {latitude}, {longitude} → "
        f"Status: {response.status_code}"
    )

    if response.status_code == 200:
        data = response.json()
        all_stations.extend(data)
        print(f"Stations received: {len(data)}")


# Remove duplicate stations using OCM ID
unique_stations = {}

for station in all_stations:
    unique_stations[station["ID"]] = station

all_stations = list(unique_stations.values())

print("\nTotal unique OCM stations:", len(all_stations))

with open("surat_ocm_all.json", "w", encoding="utf-8") as file:
    json.dump(all_stations, file, indent=2)

print("Saved as surat_ocm_all.json")    

print("\nOCM stations:")

for station in all_stations:
    address = station.get("AddressInfo", {})

    print(
        address.get("Title"),
        "|",
        address.get("Latitude"),
        address.get("Longitude")
    )