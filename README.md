# VOLTERRA

VOLTERRA is a React/Vite frontend with a Python/Tornado backend for EV charging-station network exploration and location analysis.

## Data

The backend loads `final_india_dataset.csv` from the repository root. It is the validated BEE snapshot dated 2025-10-26, not a live data source.

## Backend setup

Use Python 3.11 or newer and install the backend dependencies:

```powershell
python -m pip install tornado numpy pandas scipy
```

Start the API from the repository root:

```powershell
python -m backend.server
```

The API listens on `http://127.0.0.1:8000`.

For deployment, configure `CORS_ALLOWED_ORIGINS` as a comma-separated list of trusted frontend origins. Other optional controls include `HOST`, `PORT`, `REQUEST_BODY_LIMIT_BYTES`, `SEARCH_QUERY_MAX_LENGTH`, `RATE_LIMIT_REQUESTS`, `RATE_LIMIT_EXPENSIVE_REQUESTS`, and `API_WORKERS`. Set `ENABLE_HSTS=1` only when HTTPS is guaranteed by the deployment boundary.

Place the API behind a production reverse proxy for TLS termination, external rate limiting, access logging, and additional security headers.

## Frontend setup

```powershell
cd frontend
npm install
npm run dev
```

The Vite development server proxies `/api` requests to the backend.

## Verification

Run backend tests from the repository root:

```powershell
python -m unittest backend.test_server backend.test_phase2 -v
```

Compile the backend and build the frontend:

```powershell
python -m py_compile backend/server.py backend/data_loader.py backend/search_engine.py backend/analysis_service.py
cd frontend
npm run build
```