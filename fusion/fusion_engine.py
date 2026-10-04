"""
Multimodal Fusion Engine
Cross-modal feature alignment, joint representation learning, and confidence weighting.
"""

from typing import Any, Dict, List
import uuid

class MultimodalFusionEngine:
    """Multimodal Fusion Engine for combining text, vision, and speech entities."""

    def __init__(self, strategy: str = "late_fusion", time_tolerance: float = 2.0) -> None:
        """
        Args:
            strategy: 'late_fusion' (rule-based) or 'hybrid' (future embedding-based).
            time_tolerance: Maximum seconds apart for entities to be considered co-occurring.
        """
        self.strategy = strategy
        self.time_tolerance = time_tolerance

    def _normalize_string(self, text: str) -> str:
        return text.strip().lower()

    def _is_match(self, entity1_text: str, entity2_text: str) -> bool:
        """Simple rule-based matching: exact match or one is a substring of the other."""
        e1 = self._normalize_string(entity1_text)
        e2 = self._normalize_string(entity2_text)
        if not e1 or not e2:
            return False
        return e1 in e2 or e2 in e1

    def _late_fusion(self, multimodal_inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Fuses entities from different modalities based on name similarity and temporal overlap.
        """
        fused_entities = []
        
        # Flatten all incoming entities into a standardized list with provenance
        raw_entities = []
        
        # 1. OCR Entities
        for ent in multimodal_inputs.get("ocr_entities", []):
            raw_entities.append({
                "text": ent.get("text"),
                "label": ent.get("label", "TEXT"),
                "timestamp": float(ent.get("timestamp", 0.0)),
                "modality": "vision_ocr",
                "confidence": float(ent.get("confidence", 0.8))
            })
            
        # 2. Speech Entities (from NER on ASR transcripts)
        for ent in multimodal_inputs.get("speech_entities", []):
            raw_entities.append({
                "text": ent.get("text"),
                "label": ent.get("label", "SPOKEN"),
                "timestamp": float(ent.get("timestamp", 0.0)),
                "modality": "speech_asr",
                "confidence": float(ent.get("confidence", 0.85))
            })
            
        # 3. Vision Objects (YOLO)
        for obj in multimodal_inputs.get("vision_objects", []):
            raw_entities.append({
                "text": obj.get("label"),
                "label": "VISUAL_OBJECT",
                "timestamp": float(obj.get("timestamp", 0.0)),
                "modality": "vision_object",
                "confidence": float(obj.get("confidence", 0.7))
            })

        # Grouping logic (Late Fusion)
        for raw_ent in raw_entities:
            matched = False
            # Try to find an existing fused entity to merge with
            for fused_ent in fused_entities:
                time_diff = abs(fused_ent["timestamp"] - raw_ent["timestamp"])
                
                # Check for temporal overlap and textual match
                if time_diff <= self.time_tolerance and self._is_match(raw_ent["text"], fused_ent["canonical_name"]):
                    # Merge provenance
                    fused_ent["provenance"].append(raw_ent["modality"])
                    
                    # Boost confidence because it was detected in multiple modalities!
                    fused_ent["confidence"] = min(1.0, fused_ent["confidence"] + (raw_ent["confidence"] * 0.2))
                    
                    # Store all variations of the name
                    if raw_ent["text"] not in fused_ent["aliases"]:
                        fused_ent["aliases"].append(raw_ent["text"])
                        
                    matched = True
                    break
            
            # If no match found, create a new fused entity
            if not matched:
                fused_entities.append({
                    "id": str(uuid.uuid4()),
                    "canonical_name": raw_ent["text"],
                    "canonical_label": raw_ent["label"],
                    "aliases": [raw_ent["text"]],
                    "timestamp": raw_ent["timestamp"],
                    "confidence": raw_ent["confidence"],
                    "provenance": [raw_ent["modality"]]
                })

        return {
            "strategy": self.strategy,
            "fused_entities": fused_entities,
            "total_fused": len(fused_entities),
            "status": "success"
        }

    def fuse(self, multimodal_inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Fuse extracted features from text, vision, and audio into unified representations."""
        print(f"Running Fusion Engine with strategy: {self.strategy}...")
        
        if self.strategy == "late_fusion":
            return self._late_fusion(multimodal_inputs)
        else:
            raise NotImplementedError(f"Fusion strategy '{self.strategy}' not yet implemented.")


if __name__ == "__main__":
    # Test script simulating extraction pipeline output
    print("Testing Late Fusion Strategy...")
    
    # Mock data representing outputs from Phase 2 & 3
    mock_inputs = {
        "vision_objects": [
            {"label": "person", "confidence": 0.88, "timestamp": 2.5},
            {"label": "laptop", "confidence": 0.75, "timestamp": 2.5}
        ],
        "ocr_entities": [
            {"text": "Dr. A. Sharma", "label": "PERSON", "timestamp": 2.5, "confidence": 0.9},
            {"text": "Project KD", "label": "ORG", "timestamp": 10.0, "confidence": 0.8}
        ],
        "speech_entities": [
            {"text": "Anita Sharma", "label": "PERSON", "timestamp": 2.6, "confidence": 0.95},
            {"text": "laptop", "label": "PRODUCT", "timestamp": 2.8, "confidence": 0.85}
        ]
    }
    
    engine = MultimodalFusionEngine(strategy="late_fusion", time_tolerance=2.0)
    result = engine.fuse(mock_inputs)
    
    print("\n--- Fused Entities ---")
    for ent in result["fused_entities"]:
        print(f"[{ent['timestamp']}s] {ent['canonical_name']} ({ent['canonical_label']}) - Conf: {ent['confidence']:.2f}")
        print(f"  Provenance: {ent['provenance']}")
        if len(ent['aliases']) > 1:
            print(f"  Aliases: {ent['aliases']}")
