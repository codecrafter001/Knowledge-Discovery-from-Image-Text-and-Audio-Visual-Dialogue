import cv2
import numpy as np
from pathlib import Path
from typing import Union, List, Dict

class VideoPreprocessor:
    """Handles video normalization: scene-boundary detection and keyframe extraction."""
    
    def __init__(self, threshold: float = 30.0, min_scene_duration_sec: float = 1.0):
        """
        Args:
            threshold: The difference threshold between frames to be considered a scene change.
            min_scene_duration_sec: Minimum seconds between keyframes to avoid over-segmentation.
        """
        self.threshold = threshold
        self.min_scene_duration_sec = min_scene_duration_sec

    def _calculate_frame_diff(self, prev_frame: np.ndarray, curr_frame: np.ndarray) -> float:
        """Calculates the mean absolute difference between two frames."""
        # Convert to grayscale for faster and more robust comparison
        prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
        curr_gray = cv2.cvtColor(curr_frame, cv2.COLOR_BGR2GRAY)
        
        # Calculate absolute difference
        diff = cv2.absdiff(prev_gray, curr_gray)
        return np.mean(diff)

    def extract_keyframes(self, video_path: Union[str, Path], output_dir: Union[str, Path]) -> List[Dict]:
        """
        Extracts keyframes based on scene boundary detection.
        Returns a list of metadata for each keyframe.
        """
        video_path = Path(video_path)
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise ValueError(f"Could not open video file: {video_path}")
            
        fps = cap.get(cv2.CAP_PROP_FPS)
        min_frames_between_scenes = int(fps * self.min_scene_duration_sec)
        
        keyframes = []
        ret, prev_frame = cap.read()
        
        if not ret:
            return keyframes
            
        # Always save the very first frame as a keyframe
        frame_idx = 0
        last_keyframe_idx = 0
        
        def save_keyframe(frame, idx, timestamp):
            filename = f"keyframe_{idx:05d}_{timestamp:.2f}s.jpg"
            out_path = output_dir / filename
            cv2.imwrite(str(out_path), frame)
            return {
                "frame_index": idx,
                "timestamp": timestamp,
                "path": str(out_path)
            }
            
        keyframes.append(save_keyframe(prev_frame, 0, 0.0))
        
        while True:
            ret, curr_frame = cap.read()
            if not ret:
                break
                
            frame_idx += 1
            
            # Only check for scene changes if we've passed the minimum duration
            if (frame_idx - last_keyframe_idx) >= min_frames_between_scenes:
                diff = self._calculate_frame_diff(prev_frame, curr_frame)
                
                if diff > self.threshold:
                    timestamp = frame_idx / fps
                    keyframes.append(save_keyframe(curr_frame, frame_idx, timestamp))
                    last_keyframe_idx = frame_idx
                    
            prev_frame = curr_frame
            
        cap.release()
        return keyframes

    def process(self, video_path: Union[str, Path], output_dir: Union[str, Path] = None) -> Dict:
        """Runs the full video pre-processing pipeline."""
        video_path = Path(video_path)
        
        if output_dir is None:
            # Default to a folder named after the video in the same directory
            output_dir = video_path.parent / f"{video_path.stem}_keyframes"
            
        print(f"Extracting keyframes from {video_path}...")
        keyframes = self.extract_keyframes(video_path, output_dir)
        
        return {
            "source_video": str(video_path),
            "keyframe_directory": str(output_dir),
            "total_keyframes": len(keyframes),
            "keyframes": keyframes
        }

if __name__ == "__main__":
    # Test script against the sample data
    project_root = Path(__file__).parent.parent
    sample_video_path = project_root / "sample_data" / "sample_video.mp4"
    
    if sample_video_path.exists():
        preprocessor = VideoPreprocessor(threshold=30.0, min_scene_duration_sec=1.5)
        result = preprocessor.process(sample_video_path)
        
        print(f"Extraction complete! Found {result['total_keyframes']} keyframes.")
        print(f"Keyframes saved to: {result['keyframe_directory']}")
        for kf in result['keyframes']:
            print(f" - Timestamp: {kf['timestamp']:.2f}s | File: {Path(kf['path']).name}")
    else:
        print(f"Sample video not found at {sample_video_path}")
