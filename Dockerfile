# ---------------------------------------------------------------------------
# Stage 1 – Build frontend
# ---------------------------------------------------------------------------
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2 – Production image (backend serves API + frontend static files)
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS production

WORKDIR /app

# System dependencies for opencv-python-headless
RUN apt-get update && \
    apt-get install -y --no-install-recommends libgl1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

# Install backend dependencies
COPY backend/pyproject.toml backend/
RUN pip install --no-cache-dir -e backend/

# Copy backend source
COPY backend/app backend/app

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Create data directory for SQLite
RUN mkdir -p /app/backend/data

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--app-dir", "/app/backend"]
