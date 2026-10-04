"""
OCR Extraction Module
Extracts raw text and bounding boxes from images using EasyOCR or PyTesseract.
"""

from typing import Any, Dict, List, Optional
from pathlib import Path
import cv2
import numpy as np

class OCRExtractor:
    """OCR Extractor for multimodal document processing."""

    def __init__(self, engine: str = "easyocr", languages: Optional[List[str]] = None) -> None:
        self.engine = engine.lower()
        self.languages = languages or ["en"]
        
        if self.engine == "easyocr":
            import easyocr
            # Note: This will download the model weights on first run
            print("Initializing EasyOCR...")
            self.reader = easyocr.Reader(self.languages, gpu=False) # CPU fallback
        elif self.engine == "tesseract":
            import pytesseract
            self.pytesseract = pytesseract
            # Note: Tesseract must be installed on the system for this to work
        else:
            raise ValueError(f"Unsupported OCR engine: {self.engine}")

    def extract_text(self, image_path: str) -> Dict[str, Any]:
        """Extract text and bounding boxes from an image."""
        image_path = str(image_path)
        
        if not Path(image_path).exists():
            raise FileNotFoundError(f"Image not found at {image_path}")

        blocks = []
        full_text = []

        if self.engine == "easyocr":
            # readtext returns a list of (bbox, text, confidence)
            results = self.reader.readtext(image_path)
            for (bbox, text, prob) in results:
                # bbox is a list of 4 points: [top-left, top-right, bottom-right, bottom-left]
                blocks.append({
                    "box": [[int(coord) for coord in point] for point in bbox],
                    "text": text,
                    "confidence": float(prob)
                })
                full_text.append(text)
                
        elif self.engine == "tesseract":
            # Load image for tesseract
            img = cv2.imread(image_path)
            # Get detailed data including bounding boxes
            data = self.pytesseract.image_to_data(img, output_type=self.pytesseract.Output.DICT)
            
            for i in range(len(data['text'])):
                if int(data['conf'][i]) > 0: # Filter out weak/empty detections
                    text = data['text'][i].strip()
                    if text:
                        x, y, w, h = data['left'][i], data['top'][i], data['width'][i], data['height'][i]
                        blocks.append({
                            # Convert xywh to 4 corners for consistency with easyocr format
                            "box": [[x, y], [x+w, y], [x+w, y+h], [x, y+h]],
                            "text": text,
                            "confidence": float(data['conf'][i]) / 100.0
                        })
                        full_text.append(text)

        return {
            "source": image_path,
            "engine": self.engine,
            "text": " ".join(full_text),
            "blocks": blocks,
            "status": "success"
        }

if __name__ == "__main__":
    # Test script against the sample data
    project_root = Path(__file__).parent.parent
    # Let's test on the CLEANED image from Phase 1!
    sample_img_path = project_root / "sample_data" / "sample_image_clean.png"
    
    if sample_img_path.exists():
        # EasyOCR is usually easier to test because it doesn't require a system binary install
        extractor = OCRExtractor(engine="easyocr")
        print(f"Extracting text from {sample_img_path}...")
        result = extractor.extract_text(str(sample_img_path))
        
        print("\n--- Extracted Text ---")
        print(result["text"])
        print("\n--- Bounding Boxes Found ---")
        print(f"Found {len(result['blocks'])} text blocks.")
    else:
        print(f"Cleaned sample image not found at {sample_img_path}")
