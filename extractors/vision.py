"""
Vision Extraction Module
Generates visual embeddings using CLIP and detects objects using YOLOv8.
"""

from typing import Any, Dict, List
from pathlib import Path
import torch
from PIL import Image

try:
    from ultralytics import YOLO
except ImportError:
    YOLO = None

try:
    import open_clip
except ImportError:
    open_clip = None

class VisionExtractor:
    """Vision Extractor for image captioning, embeddings, and object recognition."""

    def __init__(self, yolo_model_path: str = "yolov8n.pt", clip_model_name: str = "ViT-B-32", clip_pretrained: str = "openai") -> None:
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Initializing VisionExtractor on {self.device}...")

        # 1. Initialize YOLO
        if YOLO is None:
            print("Warning: ultralytics (YOLO) is not installed.")
            self.yolo = None
        else:
            print(f"Loading YOLO model: {yolo_model_path}")
            # Downloads to current directory if not present
            self.yolo = YOLO(yolo_model_path)
            
        # 2. Initialize CLIP
        if open_clip is None:
            print("Warning: open_clip is not installed.")
            self.clip_model = None
            self.clip_preprocess = None
        else:
            print(f"Loading CLIP model: {clip_model_name} ({clip_pretrained})")
            model, _, preprocess = open_clip.create_model_and_transforms(clip_model_name, pretrained=clip_pretrained)
            self.clip_model = model.to(self.device)
            self.clip_preprocess = preprocess

    def extract_features(self, image_path: str) -> Dict[str, Any]:
        """Extract visual descriptors, embeddings, and objects from an image."""
        image_path = str(image_path)
        if not Path(image_path).exists():
            raise FileNotFoundError(f"Image not found at {image_path}")

        objects = []
        embedding = []

        # Run YOLO
        if self.yolo:
            results = self.yolo(image_path, verbose=False)
            for r in results:
                boxes = r.boxes
                for box in boxes:
                    # box.xyxy is [xmin, ymin, xmax, ymax]
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    conf = float(box.conf[0])
                    class_id = int(box.cls[0])
                    label = self.yolo.names[class_id]
                    
                    objects.append({
                        "label": label,
                        "confidence": conf,
                        "box": [int(x1), int(y1), int(x2), int(y2)]
                    })

        # Run CLIP
        if self.clip_model and self.clip_preprocess:
            image = Image.open(image_path).convert("RGB")
            # Preprocess and add batch dimension
            image_input = self.clip_preprocess(image).unsqueeze(0).to(self.device)
            
            with torch.no_grad(), torch.cuda.amp.autocast(enabled=(self.device=="cuda")):
                image_features = self.clip_model.encode_image(image_input)
                # Normalize features
                image_features /= image_features.norm(dim=-1, keepdim=True)
                # Convert to list of floats for JSON serialization
                embedding = image_features.cpu().numpy()[0].tolist()

        return {
            "source": image_path,
            "embedding": embedding,
            "objects": objects,
            "status": "success"
        }

if __name__ == "__main__":
    # Test script against the sample data
    project_root = Path(__file__).parent.parent
    sample_img_path = project_root / "sample_data" / "sample_image.png"
    
    if sample_img_path.exists():
        extractor = VisionExtractor()
        print(f"\nExtracting features from {sample_img_path}...")
        result = extractor.extract_features(str(sample_img_path))
        
        print("\n--- Objects Detected ---")
        for obj in result["objects"]:
            print(f"- {obj['label']} ({obj['confidence']:.2f}) at {obj['box']}")
            
        print("\n--- CLIP Embedding ---")
        if result["embedding"]:
            print(f"Generated a {len(result['embedding'])}-dimensional semantic embedding vector.")
            print(f"Preview: {result['embedding'][:5]}...")
        else:
            print("Failed to generate embedding.")
    else:
        print(f"Sample image not found at {sample_img_path}")
