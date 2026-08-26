import requests
from bs4 import BeautifulSoup
import pandas as pd
from urllib.parse import unquote
import re

url = "https://www.suratmunicipal.gov.in/Information/EVChargingStations"

response = requests.get(url)
soup = BeautifulSoup(response.text, "html.parser")

rows = []

for link in soup.find_all("a"):
    href = link.get("href", "")

    if "google.com/maps/place" not in href:
        continue

    # Get station name from the table row
    row = link.find_parent("tr")
    cells = row.find_all("td") if row else []

    station_name = cells[0].get_text(" ", strip=True) if cells else "Unknown"

    # Decode URL and extract coordinates
    decoded_url = unquote(href)

    match = re.search(
    r"/place/(-?\d+(?:\.\d+)?),.*?(-?\d+(?:\.\d+)?)",
    decoded_url
)

    if match:
        latitude = float(match.group(1))
        longitude = float(match.group(2))
    else:
        latitude = None
        longitude = None

    rows.append({
        "station_name": station_name,
        "latitude": latitude,
        "longitude": longitude
    })

df = pd.DataFrame(rows)

print("SMC stations found:", len(df))
print("\nSMC dataset:")
print(df.to_string(index=False))

df.to_csv("smc_stations.csv", index=False)

print("\nSaved as smc_stations.csv")