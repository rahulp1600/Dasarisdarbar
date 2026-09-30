FROM node:22-bookworm-slim

# Install Python 3, venv, Tesseract OCR with English traineddata, and system utils
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    tesseract-ocr \
    tesseract-ocr-eng \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Set up Python virtualenv
RUN python3 -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH"

# Install Python OCR dependencies
COPY ocr-service/requirements.txt ./ocr-service/
RUN pip install --no-cache-dir -r ./ocr-service/requirements.txt

# Copy OCR service code
COPY ocr-service/app.py ./ocr-service/
COPY ocr-service/ocr/ ./ocr-service/ocr/

# Install Node.js Express backend dependencies
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install --omit=dev

# Copy backend code
COPY backend/ ./

# Setup startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

WORKDIR /app

# Expose default backend port
EXPOSE 5001

CMD ["/app/start.sh"]
