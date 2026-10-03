#!/bin/sh
set -e

# Prevent OpenMP and BLAS thread explosion on fractional vCPUs
export OMP_THREAD_LIMIT=1
export OMP_NUM_THREADS=1
export OPENBLAS_NUM_THREADS=1
export MKL_NUM_THREADS=1

echo "Starting Dasari Darbar Python OCR service on http://127.0.0.1:8000..."
python3 -m uvicorn app:app --app-dir /app/ocr-service --host 127.0.0.1 --port 8000 &

echo "Waiting for Python OCR microservice to be healthy..."
sleep 2

echo "Starting Node.js Express backend on port ${PORT:-5001}..."
cd /app/backend
exec node server.js
