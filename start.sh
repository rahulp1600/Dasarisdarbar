#!/bin/sh
set -e

echo "Starting Dasari Darbar Python OCR service on http://127.0.0.1:8000..."
python3 -m uvicorn app:app --app-dir /app/ocr-service --host 127.0.0.1 --port 8000 &

echo "Waiting for Python OCR microservice to be healthy..."
sleep 2

echo "Starting Node.js Express backend on port ${PORT:-5001}..."
cd /app/backend
exec node server.js
