# Dasari Darbar OCR Microservice

Dedicated Python FastAPI service utilizing OpenCV and Tesseract OCR for restaurant receipt image preprocessing and text extraction.

## Features
- **OpenCV Preprocessing**: Bilateral filtering, CLAHE contrast enhancement, Otsu and adaptive thresholding for clear receipt legibility.
- **Tesseract OCR**: Structured field extraction targeting bill number, bill date, restaurant name, and total amount.
- **REST API**: Exposes `POST /ocr` accepting multipart form file or Base64 JSON.

## Running Locally
```bash
pip install -r requirements.txt
uvicorn app:app --port 8000
```
