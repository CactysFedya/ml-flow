# MLForge v2

New isolated web-first implementation of MLForge built on the target MVP stack:

- Frontend: React, TypeScript, Vite, Tailwind CSS, shadcn-style components, Lucide React
- Backend: FastAPI, SQLAlchemy, Pydantic, SQLite

This folder is independent from the existing MLForge code so the current application can stay untouched while the new product is built.

## Structure

- `frontend/` - React dashboard and future product pages
- `backend/` - FastAPI API and future ML orchestration backend

## First Slice

The first slice recreates the reference dashboard layout as closely as practical while keeping the code ready for real data:

- left navigation
- top project/dataset bar
- summary cards
- recent experiments table
- training overview
- metrics chart
- class distribution
- recent datasets
- activity/logs
- quick actions

## Run

Backend:

```powershell
cd E:\MLForge\v2\backend
python -m pip install -e .
uvicorn app.main:app --reload --port 8001
```

Frontend:

```powershell
cd E:\MLForge\v2\frontend
npm install
npm run dev
```

Then open:

- Frontend: `http://127.0.0.1:5173`
- Backend docs: `http://127.0.0.1:8001/docs`
