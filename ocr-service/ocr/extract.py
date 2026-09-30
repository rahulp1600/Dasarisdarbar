"""
Dasari Darbar Bill Information Extraction Module
Uses Tesseract OCR and targeted regex rules to accurately extract:
- Restaurant Name
- Bill Number
- Bill Date (normalized to YYYY-MM-DD)
- Bill Amount (Grand Total)
- Confidence Score
- Raw Text
Strict Rule: NEVER invent or default missing fields.
"""

import re
import os
import pytesseract
from datetime import datetime
import numpy as np

# Configure tesseract executable path on Windows
LOCAL_TESS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "tesseract"))
POSSIBLE_TESSERACT_PATHS = [
    os.path.join(LOCAL_TESS_DIR, "tesseract.exe"),
    r"C:\Client\ocr-service\tesseract\tesseract.exe",
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    os.path.expandvars(r"%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe"),
    r"C:\tesseract\tesseract.exe"
]

for p in POSSIBLE_TESSERACT_PATHS:
    if os.path.isfile(p):
        pytesseract.pytesseract.tesseract_cmd = p
        tessdata_dir = os.path.join(os.path.dirname(p), "tessdata")
        if os.path.isdir(tessdata_dir):
            os.environ["TESSDATA_PREFIX"] = tessdata_dir
        break

def normalize_text_for_search(text: str) -> str:
    """Removes non-alphanumeric chars for tolerant name matching."""
    return re.sub(r"[^a-zA-Z0-9]", "", text or "").lower()

def check_restaurant_name(text: str) -> tuple[bool, str | None]:
    """
    Checks if text contains identifiers for Dasari Darbar.
    """
    if not text:
        return False, None

    clean = normalize_text_for_search(text)
    
    # Direct matches & common OCR variations (e.g. OASART / DASAR / DARBAR)
    if "dasaridarbar" in clean or "dasarisdarbar" in clean:
        return True, "Dasari Darbar"
    
    if ("dasari" in clean or "dasar" in clean or "oasart" in clean) and "darbar" in clean:
        return True, "Dasari Darbar"
        
    if ("darbar" in clean or "dasari" in clean) and (
        "kothapet" in clean or "kothepet" in clean or "familyrestaurant" in clean or "vegnonveg" in clean
    ):
        return True, "Dasari Darbar"

    return False, None

def extract_bill_number(text: str) -> str | None:
    """
    Extracts bill number from receipts.
    Supports:
    Bill No: 123, Bill No. 123, Invoice No: 123, Invoice #123, Bill#123, DD-1024, etc.
    """
    if not text:
        return None

    # Priority patterns (tolerant to OCR like Bil/Na/Nu/No)
    patterns = [
        r"(?:BILL|BIL|BLL|INVOICE|INV|ORDER|CHECK|TOKEN|RECEIPT)\s*(?:NO|NUM|NUMBER|NA|NU|#)?[:.\s-]*([A-Z0-9-]{1,15})\b",
        r"\b(DD[-\s]?\d{1,8})\b",
        r"\bBILL\s*#?\s*(\d{1,8})\b",
        r"\bINV\s*#?\s*(\d{1,8})\b",
        r"(?:BILL|BIL)\s*\n\s*(?:NO|NA|NU|#)?[:.\s-]*(\d{1,8})\b"
    ]

    for pat in patterns:
        match = re.search(pat, text, re.IGNORECASE)
        if match:
            candidate = match.group(1).strip()
            # Must have at least one digit and not just words like "TABLE"
            if re.search(r"\d", candidate) and candidate.upper() not in ["TABLE", "DATE", "CASH", "DINE"]:
                clean_num = re.sub(r"^[#:\-\s]+", "", candidate)
                return clean_num.upper()

    return None

def normalize_date_string(date_str: str) -> str | None:
    """Converts various Indian date formats to YYYY-MM-DD."""
    date_str = date_str.strip()
    
    # 1. DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    match_dmy = re.match(r"^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$", date_str)
    if match_dmy:
        d, m, y = int(match_dmy.group(1)), int(match_dmy.group(2)), int(match_dmy.group(3))
        if y < 100:
            y += 2000
        # Sanity check month
        if 1 <= m <= 12 and 1 <= d <= 31:
            try:
                dt = datetime(y, m, d)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                pass

    # 2. YYYY/MM/DD or YYYY-MM-DD
    match_ymd = re.match(r"^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$", date_str)
    if match_ymd:
        y, m, d = int(match_ymd.group(1)), int(match_ymd.group(2)), int(match_ymd.group(3))
        if 1 <= m <= 12 and 1 <= d <= 31:
            try:
                dt = datetime(y, m, d)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                pass

    # 3. DD Mon YYYY (e.g. 28 Sep 2026 or 28-Sep-2026)
    month_names = {
        "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
        "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12
    }
    match_named = re.match(r"^(\d{1,2})[\s\-]+([A-Za-z]{3})[A-Za-z]*[\s\-]+(\d{2,4})$", date_str)
    if match_named:
        d = int(match_named.group(1))
        m_str = match_named.group(2).lower()
        y = int(match_named.group(3))
        if y < 100:
            y += 2000
        m = month_names.get(m_str)
        if m and 1 <= d <= 31:
            try:
                dt = datetime(y, m, d)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                pass

    return None

def extract_bill_date(text: str) -> str | None:
    """
    Finds date in receipt text and returns normalized YYYY-MM-DD.
    Returns None if missing - NEVER defaults to today's date!
    """
    if not text:
        return None

    # Search patterns
    patterns = [
        r"(?:DATE|DT|DATED)[:.\s]*([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{2,4})",
        r"\b([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{4})\b",
        r"\b([0-9]{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+[0-9]{2,4})\b",
        r"\b([0-9]{4}[-/.][0-9]{1,2}[-/.][0-9]{1,2})\b"
    ]

    for pat in patterns:
        matches = re.finditer(pat, text, re.IGNORECASE)
        for m in matches:
            candidate = m.group(1).strip()
            norm = normalize_date_string(candidate)
            if norm:
                return norm

    return None

def extract_bill_amount(text: str) -> float | None:
    """
    Extracts original Grand Total amount from receipt text.
    Handles 'Grand Total: ₹850', 'Total: 850', 'Net Total: 850', 'Amount: 850', etc.
    Returns None if not found.
    """
    if not text:
        return None

    candidate_amounts = []
    
    # Priority patterns for Grand Total / Net Total
    grand_patterns = [
        r"(?:GRAND\s*TOTAL|TOTAL\s*BILL|NET\s*PAYABLE|TOTAL\s*DUE|FINAL\s*TOTAL)\s*[:=₹RsRe.]*\s*([0-9,]+(?:\.\d{1,2})?)",
        r"(?:NET\s*TOTAL|ORIGINAL\s*TOTAL|BILL\s*AMOUNT)\s*[:=₹RsRe.]*\s*([0-9,]+(?:\.\d{1,2})?)",
        r"(?:TOTAL|AMOUNT)\s*[:=₹RsRe.]*\s*([0-9,]+(?:\.\d{1,2})?)",
        r"(?:Rs\.?|Re\.?|₹|INR)\s*([0-9,]+(?:\.\d{1,2})?)"
    ]

    for pat in grand_patterns:
        matches = re.finditer(pat, text, re.IGNORECASE)
        for m in matches:
            val_str = m.group(1).replace(",", "").strip()
            try:
                val = float(val_str)
                # Reasonable restaurant bill range: ₹20 to ₹50,000
                if 20 <= val <= 100000:
                    candidate_amounts.append(val)
            except ValueError:
                pass

    if candidate_amounts:
        # Grand total is typically the largest valid total on the bill
        return max(candidate_amounts)

    return None

def extract_structured_bill(image_variants: dict) -> dict:
    """
    Performs OCR using Tesseract on preprocessed image variants and extracts
    structured bill fields.
    """
    primary_img = image_variants.get("processed")
    gray_img = image_variants.get("grayscale")

    custom_config = r"--oem 3 --psm 6"
    raw_text = ""
    confidences = []

    try:
        # 1. Get structured text lines directly from image_to_string
        raw_text = pytesseract.image_to_string(primary_img, config=custom_config)

        # 2. Get word confidences
        data = pytesseract.image_to_data(primary_img, config=custom_config, output_type=pytesseract.Output.DICT)
        for conf in data.get("conf", []):
            try:
                c = float(conf)
                if c >= 0:
                    confidences.append(c)
            except (ValueError, TypeError):
                pass

        # If primary yielded very little text, fallback to enhanced grayscale
        if len(raw_text.strip()) < 25 and gray_img is not None:
            gray_text = pytesseract.image_to_string(gray_img, config=r"--oem 3 --psm 4")
            if len(gray_text.strip()) > len(raw_text.strip()):
                raw_text = gray_text
    except Exception as e:
        return {
            "success": False,
            "error": f"OCR extraction error: {str(e)}",
            "bill_number": None,
            "bill_date": None,
            "bill_amount": None,
            "restaurant_name": None,
            "raw_text": "",
            "confidence": 0.0
        }

    # Extract fields
    is_dasari, rest_name = check_restaurant_name(raw_text)
    bill_number = extract_bill_number(raw_text)
    bill_date = extract_bill_date(raw_text)
    bill_amount = extract_bill_amount(raw_text)

    # Base OCR confidence calculation
    avg_conf = (sum(confidences) / len(confidences)) / 100.0 if confidences else 0.75

    # Adjust confidence based on presence of key restaurant fields
    field_score = 0.0
    if is_dasari:
        field_score += 0.40
    if bill_number:
        field_score += 0.25
    if bill_date:
        field_score += 0.15
    if bill_amount and bill_amount > 0:
        field_score += 0.20

    combined_confidence = round(min(1.0, (avg_conf * 0.4) + (field_score * 0.6)), 2)

    return {
        "success": True,
        "bill_number": bill_number,
        "bill_date": bill_date,
        "bill_amount": bill_amount,
        "restaurant_name": rest_name if is_dasari else None,
        "is_dasari_darbar": is_dasari,
        "raw_text": raw_text.strip(),
        "confidence": combined_confidence
    }
