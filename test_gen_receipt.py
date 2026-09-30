import sys
import io
import os
import base64
import json
from PIL import Image, ImageDraw, ImageFont

def generate_receipt(data):
    restaurant = data.get("restaurant", "DASARI'S DARBAR")
    bill_no = data.get("billNo", "Bill No: 1001")
    date = data.get("date", "Date: 28-09-2026")
    items = data.get("items", [])
    total = data.get("total", "GRAND TOTAL: Rs. 500.00")

    img = Image.new("RGB", (900, 1200), color=(255, 255, 255))
    d = ImageDraw.Draw(img)

    font_path = r"C:\Windows\Fonts\arial.ttf"
    bold_path = r"C:\Windows\Fonts\arialbd.ttf"
    
    header_font = ImageFont.truetype(bold_path if os.path.exists(bold_path) else font_path, 40) if os.path.exists(font_path) else ImageFont.load_default()
    sub_font = ImageFont.truetype(font_path, 24) if os.path.exists(font_path) else ImageFont.load_default()
    body_font = ImageFont.truetype(font_path, 28) if os.path.exists(font_path) else ImageFont.load_default()
    bold_font = ImageFont.truetype(bold_path if os.path.exists(bold_path) else font_path, 34) if os.path.exists(font_path) else body_font

    d.text((220, 50), restaurant, fill=(0, 0, 0), font=header_font)
    d.text((220, 110), "Veg & Non Veg Family Restaurant", fill=(0, 0, 0), font=sub_font)
    d.text((270, 150), "Kothapet, Hyderabad", fill=(0, 0, 0), font=sub_font)

    d.text((80, 220), bill_no, fill=(0, 0, 0), font=body_font)
    d.text((80, 270), date, fill=(0, 0, 0), font=body_font)

    y = 350
    for it in items:
        d.text((80, y), it, fill=(0, 0, 0), font=body_font)
        y += 50

    d.text((80, y + 40), total, fill=(0, 0, 0), font=bold_font)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    return base64.b64encode(buf.getvalue()).decode("utf-8")

if __name__ == "__main__":
    raw_input = sys.stdin.read().strip()
    if raw_input:
        inp = json.loads(raw_input)
        print(generate_receipt(inp))
    elif len(sys.argv) > 1:
        inp = json.loads(sys.argv[1])
        print(generate_receipt(inp))
    else:
        print(generate_receipt({}))
