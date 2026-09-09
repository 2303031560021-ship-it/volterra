# ⚡ VOLTERRA

### EV Charging Location Intelligence & Decision Support

**VOLTERRA helps investors, business owners, planners, and infrastructure developers evaluate where EV charging infrastructure may have better opportunities.**

> **Build where the opportunity is.**

VOLTERRA combines a nationwide EV charging-station dataset with geographic search, network exploration, and location-intelligence analysis to help users move from **exploration → analysis → understanding → decision-making**.

It is designed as a **decision-support platform**, not simply a charger-finder or navigation application.

---

## What VOLTERRA Does

VOLTERRA answers questions such as:

- Where are EV charging stations already concentrated?
- What does the charging network look like around a location?
- What charging infrastructure characteristics exist in an area?
- Where may infrastructure gaps or opportunities exist?
- Which nearby areas are worth investigating further?

The platform has two complementary experiences:

### 1. Explore Stations

Users can explore the existing charging network across India through an interactive map.

They can:

- search by state, city, district, area, or station
- inspect individual charging stations
- view charging and operator information
- move freely around the map
- zoom from broad network views to individual stations

### 2. Location Analysis

Users can evaluate a location using VOLTERRA's location-intelligence engine.

The system analyzes the surrounding charging network and presents signals such as:

- infrastructure pressure
- access gap
- AC/DC charging mix
- power gap
- spatial patterns
- operator landscape
- overall opportunity/gap scoring
- supporting evidence
- nearby areas worth checking

---

# How VOLTERRA Works

The overall workflow is:

```text
SEE
 ↓
Explore the existing EV charging network

ANALYZE
 ↓
Evaluate a selected location

UNDERSTAND
 ↓
Interpret infrastructure gaps, charging mix,
power characteristics, and operator patterns

DECIDE
 ↓
Identify nearby areas that may be worth
further investigation

The goal is not to automatically declare:

"Build a station here."

Instead, VOLTERRA provides location intelligence and evidence that can support further investment or planning decisions.

System Architecture

VOLTERRA uses a React/Vite frontend and a Python/Tornado backend.

                    VOLTERRA
                        │
        ┌───────────────┴────────────────┐
        │                                │
        ▼                                ▼
   React + Vite                    Python + Tornado
   Frontend                        Backend API
        │                                │
        │                                ├── Data Loader
        │                                ├── Search Engine
        │                                ├── Analysis Service
        │                                └── Spatial Index
        │
        ▼
 Interactive Maps
 Search
 Station Details
 Location Analysis
        │
        └───────────────┬────────────────┘
                        ▼
              final_india_dataset.csv
Frontend

The frontend is built with:

React
Vite
Leaflet
JavaScript/JSX
component-based UI
Backend

The backend is built with:

Python
Tornado
NumPy
Pandas
SciPy

The backend loads the charging-station dataset once when the application starts and builds the required search and spatial structures in memory.

Data

The primary analytical dataset is:

final_india_dataset.csv

It is stored at the repository root.

The dataset represents a validated nationwide EV public charging-station snapshot dated:

26 October 2025

It is not a live real-time feed.

This distinction is important because charging infrastructure can change over time. VOLTERRA therefore treats the dataset as a structured analytical snapshot rather than claiming live station availability.

The application also communicates this limitation in the interface so users understand that coverage may be incomplete.

Data Model

The analytical dataset contains station-level information such as:

station ID
station name
state
district
city
location
latitude
longitude
operator
government/private classification
charger type
AC/DC classification
power
connector rating
number of connectors
source record count
data source
data date
status
usage cost
review flag

The dataset is normalized before being used by the application so that the frontend and backend operate on a consistent station structure.

Search System

VOLTERRA uses a hierarchical geographic search model rather than treating every text match as a station search.

The search hierarchy is:

State
  ↓
City
  ↓
District / Area
  ↓
Station

Geographic matches are prioritized over arbitrary station-name text matches.

For ambiguous locations, VOLTERRA can provide state-level disambiguation.

Examples include searches such as:

Gujarat
Surat
Surat, Gujarat
Kota, Rajasthan

The search system uses the real geographic fields contained in the dataset rather than a hardcoded list of cities or locations.

Spatial Indexing

The backend builds a spatial index when the dataset is loaded.

VOLTERRA uses:

Earth-centered 3D coordinates
scipy.spatial.cKDTree
exact Haversine-distance filtering after spatial candidate retrieval

This allows the backend to efficiently find nearby charging stations without repeatedly scanning the entire dataset for every request.

The spatial index is created once at startup and reused by API requests.

Location Intelligence Engine

The Location Analysis engine evaluates a selected location against the surrounding charging network.

The analysis considers several signals.

Infrastructure Pressure

This looks at the existing charging infrastructure around the selected location and helps describe how concentrated or sparse the network is.

Access Gap

This evaluates the presence and proximity of charging infrastructure around the selected location and contributes to understanding potential accessibility gaps.

AC / DC Mix

Charging infrastructure is categorized using the dataset's charging information.

VOLTERRA distinguishes between charging categories such as:

AC charging
DC charging
higher-power DC charging

The analysis uses the normalized charging information rather than relying only on a single raw charger-type string.

When the analysis is not restricted to a single charging category, the result can represent the mixed charging environment around the location.

Power Gap

Available charging power is considered as part of the infrastructure analysis.

This helps distinguish an area with charging presence from an area where charging infrastructure may also have different power characteristics.

Spatial Pattern

The engine considers how charging stations are spatially distributed around the selected location.

This helps identify whether stations are concentrated, dispersed, or relatively sparse in the surrounding area.

Operator Landscape

The system also analyzes the operator composition of the surrounding charging network.

This provides additional context on how existing charging infrastructure is distributed across operators.

Opportunity / Gap Scoring

The analysis engine combines its location signals into an overall opportunity/gap assessment.

The resulting analysis includes information such as:

Gap Score
Signal
Evidence
Factors

The score is used as a decision-support signal rather than a guarantee of commercial success.

A higher opportunity/gap signal means the surrounding charging-network characteristics may warrant further investigation.

It does not mean that a site is automatically commercially viable.

Real-world investment decisions still require additional factors such as:

land availability
traffic
electricity availability
grid capacity
permitting
local regulations
customer demand
operating cost
land cost
business model
competition
expected utilization
"Areas Worth Checking"

One of VOLTERRA's most important decision-support features is the Areas Worth Checking section.

These are not hardcoded recommendations.

How they are generated

When a user analyzes a location, the backend:

Selected location
       ↓
Generate nearby candidate points
       ↓
Validate candidate coordinates
       ↓
Analyze valid candidates
       ↓
Calculate existing opportunity/gap signals
       ↓
Rank candidates
       ↓
Select useful alternatives
       ↓
Return recommended areas

The candidate search currently evaluates a fixed grid of nearby points around the selected location.

Each candidate is evaluated using the same location-analysis framework used for the main location.

Candidates are then compared using the existing scoring and selection logic.

Land Validation for Candidate Areas

Candidate coordinates are validated before they can be recommended.

This is particularly important for coastal locations.

For example, a simple radial candidate search around Chennai could otherwise generate points in the Bay of Bengal.

VOLTERRA prevents this by checking candidate coordinates against a local India land boundary before the candidate enters the analysis pipeline.

The rule is therefore:

Candidate generated
       ↓
Is the coordinate on land?
   ┌───┴───┐
   │       │
  NO      YES
   │       │
Discard   Analyze
           ↓
        Rank
           ↓
       Recommend

This is a general geographic validation step, not a Chennai-specific exception.

The frontend does not simply hide offshore recommendations; invalid candidate coordinates are rejected before they reach the recommendation output.

What "Areas Worth Checking" Means

An area shown as worth checking should be interpreted as:

A nearby candidate area whose charging-network characteristics appear relatively more interesting under VOLTERRA's current analytical model and therefore may deserve further investigation.

It should not be interpreted as:

VOLTERRA guarantees that a charging station should be built at this exact coordinate.

The feature is intended to help users identify promising areas for deeper evaluation.

Interactive Map

The map is designed to behave like a conventional interactive geographic map.

Users can:

zoom in and out
pan freely
inspect stations
select individual stations
search and jump to locations
use current-location functionality where browser permission is available

When a new search or selection is made, the application can automatically position the map to the relevant result.

After that initial positioning, users retain manual control of the map.

Automatic map positioning is not continuously reapplied during normal zooming or panning.

Map Detail Levels

The map adapts the amount of visible station detail depending on the zoom level.

At broader zoom levels:

Aggregated / clustered view

At medium zoom levels:

Smaller groups of stations

At close zoom levels:

Individual station markers

This keeps the network understandable at national and regional scales while still allowing station-level exploration.

API

The backend exposes REST-style endpoints including:

/api/health
/api/network-summary
/api/stations
/api/stations/nearby
/api/search/suggest
/api/search/resolve
/api/analyze-location
/api/alternative-areas

The frontend communicates with these endpoints through the API service layer.

Backend Safety & Validation

The backend includes defensive request validation for API inputs.

Examples include:

numeric parsing
finite-number validation
latitude/longitude bounds
radius bounds
pagination limits
search query length limits
request body limits
unsupported analysis parameters
malformed JSON handling

Invalid requests return controlled client errors instead of allowing malformed user input to propagate into backend exceptions.

Internal errors are logged server-side without exposing Python tracebacks or local filesystem paths to API consumers.

Security & Production Hardening

The backend includes several production-oriented controls:

configurable CORS origins
request rate limiting
stricter limits for expensive endpoints
bounded analysis concurrency
request correlation IDs
structured request logging
security response headers
suppressed server-identification headers
configurable request-size limits
configurable search limits

CORS should be configured with trusted frontend origins when deployed.

For direct internet exposure, the application should be placed behind a production reverse proxy providing HTTPS/TLS and infrastructure-level protections.

Project Structure
volterra/
│
├── backend/
│   ├── server.py
│   ├── data_loader.py
│   ├── search_engine.py
│   ├── analysis_service.py
│   ├── india_land.geojson
│   ├── test_server.py
│   └── test_phase2.py
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── assets/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── final_india_dataset.csv
├── requirements.txt
└── README.md
Local Setup
Requirements

Use:

Python 3.11 or newer
Node.js
npm
1. Backend Setup

From the repository root:

python -m pip install -r requirements.txt

Start the backend:

python -m backend.server

The local API is available at:

http://127.0.0.1:8000

The backend loads:

final_india_dataset.csv

from the repository root.

2. Frontend Setup

Open another terminal:

cd frontend
npm install
npm run dev

The Vite development server proxies /api requests to the local Tornado backend.

The frontend is typically available at:

http://127.0.0.1:5173
Environment Configuration

The frontend supports a configurable API base URL.

For local development, the default behavior uses the Vite development proxy.

For a deployed frontend, configure:

VITE_API_BASE_URL

Example:

VITE_API_BASE_URL=https://your-backend.example.com

The production backend should also configure:

CORS_ALLOWED_ORIGINS

Example:

CORS_ALLOWED_ORIGINS=https://your-frontend.example.com

Additional backend configuration options include:

HOST
PORT
REQUEST_BODY_LIMIT_BYTES
SEARCH_QUERY_MAX_LENGTH
RATE_LIMIT_REQUESTS
RATE_LIMIT_EXPENSIVE_REQUESTS
API_WORKERS
ENABLE_HSTS

ENABLE_HSTS=1 should only be enabled when HTTPS is guaranteed at the deployment boundary.

Testing

Run the backend test suite from the repository root:

python -m unittest backend.test_server backend.test_phase2 -v

Compile the backend:

python -m py_compile backend/server.py backend/data_loader.py backend/search_engine.py backend/analysis_service.py

Build the frontend:

cd frontend
npm run build
Production Deployment

VOLTERRA can be deployed as two services:

Frontend
Vercel
   │
   ▼
React/Vite application

Backend
Render / Python service
   │
   ▼
Tornado API

The frontend uses:

VITE_API_BASE_URL

to communicate with the deployed backend.

The backend uses:

CORS_ALLOWED_ORIGINS

to permit requests from the trusted frontend origin.

For production deployments, HTTPS, reverse-proxy configuration, access logging, and infrastructure-level request controls should be handled at the deployment boundary.

Important Data Limitation

VOLTERRA currently uses a historical charging-network snapshot rather than a live station-status system.

Therefore:

a station shown in the dataset may have changed since the snapshot
a newer station may not yet appear
station availability may change over time
geographic coverage may be incomplete
the platform should not be treated as a real-time charger-availability service

VOLTERRA therefore positions its results as location intelligence and decision support, not guaranteed live infrastructure availability.

Design Philosophy

VOLTERRA is built around a simple idea:

Don't just find where chargers exist. Understand where infrastructure opportunity may exist.

The platform moves from raw network data toward interpretable location intelligence:

Data
 ↓
Geographic Exploration
 ↓
Location Analysis
 ↓
Infrastructure Signals
 ↓
Opportunity / Gap Assessment
 ↓
Areas Worth Checking
 ↓
Human Decision

The final decision remains with the user, while VOLTERRA provides the analytical evidence needed to make that decision more informed.

Current Status

VOLTERRA is an actively developing project.

The current platform supports:

India-wide charging-station exploration
hierarchical geographic search
interactive station mapping
station details
nearby-station analysis
location intelligence
opportunity/gap signals
alternative area discovery
land validation for candidate areas
configurable frontend/backend deployment
backend validation and security controls

Coverage and station information may be incomplete because the underlying dataset is a dated snapshot rather than a continuously updated live feed.

License

Add the project's intended license here.


### One correction I intentionally made

I would **not** put a claim like “the system predicts the best place to build a charger” in the README. That's stronger than what VOLTERRA actually does.

Your strongest and most defensible positioning is:

> **VOLTERRA is an EV charging location-intelligence and decision-support platform that analyzes existing infrastructure to identify potential gaps and nearby areas worth further investigation.**

That sounds much more like a serious portfolio/product project than a generic “EV station finder.”
