# ⚡ VOLTERRA

**EV Charging Location Intelligence & Decision Support**

> **Build where the opportunity is.**

VOLTERRA is an EV charging **location-intelligence and decision-support platform**. It helps users move from **Explore → Analyze → Understand → Decide** using India-wide charging infrastructure data.

It is **not** a real-time charger availability app and **not** a guaranteed site-selection engine.

---

## Overview

VOLTERRA combines:

- interactive charging-network exploration
- hierarchical geographic search
- nearby infrastructure analysis
- location-intelligence signals
- alternative candidate-area evaluation

The goal is to support better planning and investment decisions with structured evidence.

---

## Core Features

### 1) Explore Charging Network

- India-wide interactive map of charging stations
- Hierarchical search: **state → city → district/area → station**
- Station-level details and operator/charging information
- Nearby charging infrastructure lookup
- Smooth zoom/pan exploration across national, regional, and local scales

### 2) Location Analysis

For a selected location, VOLTERRA evaluates the surrounding charging network and reports decision-support signals, including:

- infrastructure pressure
- access gap
- AC/DC charging mix
- power characteristics
- spatial pattern
- operator landscape
- opportunity/gap scoring
- supporting evidence and factors

### 3) Areas Worth Checking

When a location is analyzed, the backend:

1. generates a fixed nearby candidate grid
2. validates candidate coordinates
3. analyzes valid candidates with the same location-analysis engine
4. scores and ranks candidates
5. returns useful alternatives for further investigation

These are **candidate areas**, not guaranteed build sites.

### 4) Land Validation for Candidate Areas

Candidate points are checked against local India land geometry before recommendation.

This prevents offshore recommendations for coastal locations by rejecting non-land coordinates before they enter ranking output.

---

## How It Works

```text
EXPLORE
  ↓
View existing charging infrastructure

ANALYZE
  ↓
Evaluate a selected location and nearby network

UNDERSTAND
  ↓
Interpret infrastructure signals and evidence

DECIDE
  ↓
Prioritize areas worth deeper on-ground validation
```

---

## Map Behavior

- New searches or station/location selections can auto-position the map.
- After that, users retain manual control of zoom and pan.
- The map does not continuously reset during normal interaction.
- Visualization adapts by zoom level:
  - broad zoom: clustered/aggregated station views
  - closer zoom: individual station markers

---

## Data

Primary dataset: **`final_india_dataset.csv`** (repository root)

- India-wide validated public charging-station snapshot
- Snapshot date: **26 October 2025**
- Used as an analytical baseline, not a live feed

### Data Notes

- Coverage may be incomplete.
- Station details may change after the snapshot date.
- Results should not be interpreted as real-time availability.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, Leaflet, JavaScript/JSX |
| Backend | Python, Tornado, Pandas, NumPy, SciPy |
| Spatial Processing | 3D Earth-centered coordinates, `scipy.spatial.cKDTree`, Haversine filtering |
| Deployment | Vercel (frontend), Render (backend) |

---

## Architecture

```text
User
 ↓
React / Vite (Frontend)
 ↓
Tornado REST API (Backend)
 ├── Data Loader
 ├── Search Engine
 ├── Analysis Service
 └── Spatial Index
 ↓
final_india_dataset.csv
```

---

## API Endpoints

- `/api/health`
- `/api/network-summary`
- `/api/stations`
- `/api/stations/nearby`
- `/api/search/suggest`
- `/api/search/resolve`
- `/api/analyze-location`
- `/api/alternative-areas`

---

## Project Structure

```text
volterra/
├── backend/
│   ├── server.py
│   ├── data_loader.py
│   ├── search_engine.py
│   ├── analysis_service.py
│   ├── india_land.geojson
│   ├── test_server.py
│   └── test_phase2.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── assets/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── final_india_dataset.csv
├── requirements.txt
└── README.md
```

---

## Local Setup

### Requirements

- Python 3.11+
- Node.js
- npm

### 1) Backend

From repository root:

```bash
python -m pip install -r requirements.txt
python -m backend.server
```

Backend runs at:

```text
http://127.0.0.1:8000
```

### 2) Frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Typical local frontend URL:

```text
http://127.0.0.1:5173
```

---

## Configuration

Frontend:

- `VITE_API_BASE_URL` (for deployed frontend → backend API URL)

Backend:

- `CORS_ALLOWED_ORIGINS` (trusted frontend origins)
- `HOST`
- `PORT`
- `REQUEST_BODY_LIMIT_BYTES`
- `SEARCH_QUERY_MAX_LENGTH`
- `RATE_LIMIT_REQUESTS`
- `RATE_LIMIT_EXPENSIVE_REQUESTS`
- `API_WORKERS`
- `ENABLE_HSTS` (enable only when HTTPS is guaranteed at the deployment boundary)

---

## Verification

From repository root:

```bash
python -m unittest backend.test_server backend.test_phase2 -v
python -m py_compile backend/server.py backend/data_loader.py backend/search_engine.py backend/analysis_service.py
```

Frontend build:

```bash
cd frontend
npm run build
```

---

## Deployment

VOLTERRA is deployed as two services:

- **Frontend:** Vercel (React/Vite app)
- **Backend:** Render (Python/Tornado API)

Integration:

- `VITE_API_BASE_URL` connects the frontend to the deployed backend.
- `CORS_ALLOWED_ORIGINS` controls which frontend origins can call the backend.

---

## Security & Validation (Production-Oriented)

The backend includes concise production controls such as:

- configurable CORS
- request validation (input bounds, parsing, malformed JSON handling)
- request rate limiting (including stricter expensive-endpoint limits)
- request-size limits
- bounded analysis concurrency
- structured request logging
- correlation IDs
- controlled client error responses
- security response headers

---

## Limitations

- Dataset is a dated snapshot (not live).
- Coverage and station records may be incomplete.
- Opportunity/gap outputs are decision-support signals, not guaranteed build recommendations.
- Real investment decisions require additional real-world validation (land, grid, demand, permitting, cost, and competition).

---

## Status

VOLTERRA is actively evolving and currently supports:

- India-wide charging-network exploration
- hierarchical geographic search
- location-intelligence analysis
- opportunity/gap signaling
- alternative-area discovery with land validation
- configurable frontend/backend deployment

