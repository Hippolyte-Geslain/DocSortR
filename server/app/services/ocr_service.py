import os
from pathlib import Path

import fitz  # pymupdf
from PIL import Image
from rapidocr_onnxruntime import RapidOCR

ocr_engine = RapidOCR()

MAX_PAGES = 3
DPI = 200


async def extract_text(file_path: str) -> str:
    """Extract text from a document file (PDF, JPG, PNG)."""
    ext = Path(file_path).suffix.lower()

    if ext == ".pdf":
        return await _extract_from_pdf(file_path)
    elif ext in (".jpg", ".jpeg", ".png"):
        return await _extract_from_image(file_path)
    else:
        raise ValueError(f"Unsupported file extension: {ext}")


async def _extract_from_pdf(file_path: str) -> str:
    """Extract text from PDF: try text layer first, fall back to OCR."""
    doc = fitz.open(file_path)
    pages_to_process = min(len(doc), MAX_PAGES)
    all_text = []

    for page_num in range(pages_to_process):
        page = doc[page_num]

        # Try embedded text first
        text = page.get_text().strip()
        if len(text) > 50:
            all_text.append(text)
            continue

        # Fall back to OCR
        pix = page.get_pixmap(dpi=DPI)
        img_data = pix.tobytes("png")
        result, _ = ocr_engine(img_data)
        if result:
            page_text = "\n".join([line[1] for line in result])
            all_text.append(page_text)

    doc.close()
    return "\n\n".join(all_text)


async def _extract_from_image(file_path: str) -> str:
    """Extract text from an image file using OCR."""
    result, _ = ocr_engine(file_path)
    if not result:
        return ""
    return "\n".join([line[1] for line in result])
