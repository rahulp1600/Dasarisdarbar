"""
OCR Output Sanity Validator
Provides basic field presence validation before sending structured JSON to Node.js backend.
Business validation (duplicates, loyalty rules, streak counters, limits) remains in Node.js.
"""

def validate_ocr_result(result: dict) -> dict:
    """
    Checks if extracted bill data contains minimum readable information.
    Adds 'is_legible' flag and failure reasons if bill is unreadable.
    """
    missing_fields = []
    
    if not result.get("restaurant_name"):
        missing_fields.append("Restaurant name not recognized as Dasari Darbar")
    if not result.get("bill_number"):
        missing_fields.append("Bill number could not be found")
    if not result.get("bill_date"):
        missing_fields.append("Bill date could not be found")
    if not result.get("bill_amount"):
        missing_fields.append("Bill amount could not be found")

    is_legible = len(missing_fields) == 0 and result.get("confidence", 0) >= 0.50

    return {
        **result,
        "is_legible": is_legible,
        "missing_fields": missing_fields
    }
