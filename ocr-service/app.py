"""
Dasari Darbar FastAPI OCR Microservice
Provides POST /ocr endpoint for Node.js backend.
Preprocessing: OpenCV
Text Extraction: Tesseract OCR + Pytesseract
"""

import base64
import os
from fastapi import FastAPI, File, UploadFile, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from ocr.preprocess import load_image_from_bytes, preprocess_bill_image
from ocr.extract import extract_structured_bill
from ocr.validator import validate_ocr_result

app = FastAPI(
    title="Dasari Darbar OCR Service",
    description="Dedicated OCR service for receipt preprocessing and structured field extraction",
    version="1.0.0"
)

# Enable CORS for local services
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Base64OCRRequest(BaseModel):
    image_base64: str

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "Dasari Darbar Python OCR Service",
        "engine": "OpenCV + Tesseract OCR"
    }

from fastapi import FastAPI, Request, HTTPException

@app.post("/ocr")
async def ocr_bill_endpoint(request: Request):
    """
    Receives bill image via multipart file upload or Base64 JSON payload.
    Preprocesses with OpenCV, runs Tesseract OCR, and extracts structured bill data.
    """
    image_bytes = None
    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" in content_type:
        form = await request.form()
        file_obj = form.get("file")
        if file_obj:
            image_bytes = await file_obj.read()
    else:
        try:
            body = await request.json()
            b64_str = body.get("image_base64", "")
            if "," in b64_str:
                b64_str = b64_str.split(",", 1)[1]
            if b64_str:
                image_bytes = base64.b64decode(b64_str)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON/Base64 payload: {str(e)}")


    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="No bill image provided. Supply either multipart 'file' or JSON 'image_base64'."
        )

    try:
        # Step 1: Decode image with OpenCV
        cv_img = load_image_from_bytes(image_bytes)

        # Step 2: Preprocess bill image (grayscale, denoise, CLAHE, threshold)
        preprocessed_variants = preprocess_bill_image(cv_img)

        # Step 3: Extract structured fields using Tesseract
        extracted_data = extract_structured_bill(preprocessed_variants)

        # Step 4: Run sanity validator
        validated = validate_ocr_result(extracted_data)

        return validated
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "bill_number": None,
            "bill_date": None,
            "bill_amount": None,
            "restaurant_name": None,
            "raw_text": "",
            "confidence": 0.0,
            "is_legible": False,
            "missing_fields": ["Failed to process image"]
        }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
