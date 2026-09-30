/**
 * Client service to communicate with the isolated Python OCR Microservice.
 * Enforces architectural rule: Python is solely responsible for OCR & structured extraction.
 */

import dotenv from 'dotenv';
dotenv.config();

const PYTHON_OCR_URL = process.env.PYTHON_OCR_URL || 'http://127.0.0.1:8000';

export async function callPythonOcrService({ imageBase64, imageBuffer, mimetype }) {
  const endpoint = `${PYTHON_OCR_URL}/ocr`;

  try {
    let response;

    if (imageBuffer) {
      // Multipart upload
      const formData = new FormData();
      const blob = new Blob([imageBuffer], { type: mimetype || 'image/jpeg' });
      formData.append('file', blob, 'receipt.jpg');

      response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });
    } else if (imageBase64) {
      // JSON Base64 payload
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: imageBase64 })
      });
    } else {
      return {
        success: false,
        error: 'No image data provided for OCR',
        is_legible: false
      };
    }

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        error: `Python OCR service responded with HTTP ${response.status}: ${errText}`,
        is_legible: false
      };
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Failed to communicate with Python OCR microservice:', err.message);
    return {
      success: false,
      error: `Python OCR service unreachable at ${PYTHON_OCR_URL}: ${err.message}`,
      is_legible: false
    };
  }
}
