import requests
import json

API_KEY = "d9ab74f8-c213-400d-b979-31df07d8d2c9"

url = "https://api.openchargemap.io/v3/poi/"

params = {
    "output": "json",
    "countrycode": "IN",
    "maxresults": 100000,
    "compact": "false",
    "verbose": "true",
    "key": API_KEY
}

response = requests.get(url, params=params, timeout=60)

print("Status:", response.status_code)

if response.status_code != 200:
    print(response.text)
    raise SystemExit("OCM request failed")

data = response.json()

print("Total records returned:", len(data))

with open("ocm_india_test.json", "w", encoding="utf-8") as file:
    json.dump(data, file, indent=2)

print("Saved as ocm_india_test.json")