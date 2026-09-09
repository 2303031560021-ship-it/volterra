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