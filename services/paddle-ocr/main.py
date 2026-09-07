from __future__ import annotations

import os
import tempfile
import uuid
from pathlib import Path

from fastapi import FastAPI, File, UploadFile
from paddleocr import PaddleOCR

app = FastAPI(title="locaOS PaddleOCR Worker")

ocr = PaddleOCR(
    lang=os.getenv("PADDLEOCR_LANG", "fr"),
    use_doc_orientation_classify=True,
    use_doc_unwarping=True,
    use_textline_orientation=True,
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "provider": "PADDLEOCR"}


@app.post("/ocr")
async def run_ocr(file: UploadFile = File(...)) -> dict:
    suffix = Path(file.filename or "document").suffix or ".bin"
    data = await file.read()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(data)
        path = tmp.name
    try:
        result = ocr.predict(path)
        raw_text_parts: list[str] = []
        fields: list[dict] = []
        for page in result:
            json_data = page.json if hasattr(page, "json") else {}
            if callable(json_data):
                json_data = json_data()
            data_obj = json_data if isinstance(json_data, dict) else {}
            texts = data_obj.get("res", {}).get("rec_texts", []) if isinstance(data_obj.get("res"), dict) else []
            scores = data_obj.get("res", {}).get("rec_scores", []) if isinstance(data_obj.get("res"), dict) else []
            boxes = data_obj.get("res", {}).get("rec_boxes", []) if isinstance(data_obj.get("res"), dict) else []
            for index, text in enumerate(texts):
                value = str(text)
                raw_text_parts.append(value)
                score = float(scores[index]) if index < len(scores) else None
                region = boxes[index] if index < len(boxes) else None
                fields.append({"key": f"ocr.text.{len(fields)}", "value": value, "confidence": score, "sourceRegion": region})
        return {
            "providerRunId": str(uuid.uuid4()),
            "rawText": "\n".join(raw_text_parts),
            "fields": fields,
            "metadata": {"filename": file.filename, "bytes": len(data), "language": os.getenv("PADDLEOCR_LANG", "fr")},
        }
    finally:
        Path(path).unlink(missing_ok=True)
