"""
Dasari Darbar Bill Preprocessing Module
Uses OpenCV to prepare restaurant bill images for optimal Tesseract OCR extraction.
"""

import cv2
import numpy as np
from io import BytesIO
from PIL import Image

def load_image_from_bytes(image_bytes: bytes) -> np.ndarray:
    """Decodes raw image bytes into an OpenCV BGR image array."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        # Fallback to PIL in case cv2.imdecode fails with webp or certain metadata
        pil_img = Image.open(BytesIO(image_bytes)).convert("RGB")
        img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    return img

def resize_for_ocr(img: np.ndarray, target_width: int = 1400) -> np.ndarray:
    """Resizes image keeping aspect ratio for standard bill resolution."""
    h, w = img.shape[:2]
    if w <= 0 or h <= 0:
        return img
    scale = target_width / float(w)
    if 0.5 <= scale <= 2.5:
        new_w = target_width
        new_h = int(h * scale)
        return cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA if scale < 1.0 else cv2.INTER_CUBIC)
    return img

def preprocess_bill_image(img: np.ndarray) -> dict:
    """
    Applies preprocessing pipeline to restaurant bill:
    1. Resize to ~1400px width.
    2. Grayscale conversion.
    3. Bilateral filter for noise reduction while keeping text edges crisp.
    4. CLAHE contrast enhancement for faded thermal receipts.
    5. Adaptive & Otsu thresholding variations.
    
    Returns a dictionary of variants:
    - 'processed': primary thresholded image for OCR
    - 'grayscale': enhanced grayscale image for fallback OCR
    - 'original': original resized image
    """
    resized = resize_for_ocr(img, target_width=1400)
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)

    # Denoise with bilateral filter to preserve sharp edges of printed letters
    denoised = cv2.bilateralFilter(gray, d=9, sigmaColor=75, sigmaSpace=75)

    # Contrast Limited Adaptive Histogram Equalization (CLAHE)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(denoised)

    # Primary Otsu thresholding
    _, otsu_thresh = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Adaptive gaussian thresholding as secondary variant for uneven lighting/shadows
    adaptive_thresh = cv2.adaptiveThreshold(
        denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 21, 10
    )

    return {
        "processed": otsu_thresh,
        "adaptive": adaptive_thresh,
        "grayscale": enhanced,
        "original": resized
    }
