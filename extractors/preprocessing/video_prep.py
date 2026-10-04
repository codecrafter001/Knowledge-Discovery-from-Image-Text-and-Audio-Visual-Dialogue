"""
Video Preprocessing Module
Detects scene changes and extracts keyframes using FFmpeg with OpenCV fallback.
"""

import os
from pathlib import Path
import re
import shutil
import subprocess
from typing import Any, Dict, List, Optional
import cv2
import numpy as np


def _extract_keyframes_ffmpeg(video_path: str, output_dir: Path, threshold: float = 0.3) -> List[Dict[str, Any]]:
    """
    Extract keyframes using FFmpeg scene change filter: select='gt(scene,threshold)'.
    """
    output_pattern = str(output_dir / "keyframe_%04d.jpg")
    
    # Run ffmpeg with showinfo to get frame timestamps
    cmd = [
        "ffmpeg",
        "-y",
        "-i", str(video_path),
        "-vf", f"select='gt(scene\\,{threshold})',showinfo",
        "-vsync", "vfr",
        output_pattern
    ]

    process = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False
    )

    # Parse timestamps from showinfo output
    # Example: [Parsed_showinfo_1 @ 0x...] n:   0 pts:  12345 pts_time:1.2345 pos:...
    timestamps = []
    for line in process.stderr.splitlines():
        if "pts_time:" in line:
            match = re.search(r"pts_time:([0-9\.]+)", line)
            if match:
                try:
                    timestamps.append(float(match.group(1)))
                except ValueError:
                    pass

    # Collect extracted image files
    frame_files = sorted(list(output_dir.glob("keyframe_*.jpg")))
    
    # If no scene changes detected by threshold (or only single static video), capture at least the first frame
    if not frame_files:
        first_frame_path = output_dir / "keyframe_0001.jpg"
        fallback_cmd = [
            "ffmpeg", "-y", "-i", str(video_path),
            "-vframes", "1", str(first_frame_path)
        ]
        subprocess.run(fallback_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
        if first_frame_path.exists():
            frame_files = [first_frame_path]
            timestamps = [0.0]

    results = []
    for idx, fpath in enumerate(frame_files):
        ts = timestamps[idx] if idx < len(timestamps) else float(idx)
        results.append({
            "timestamp": round(ts, 3),
            "frame_path": str(fpath.resolve())
        })

    return results


def _extract_keyframes_opencv(video_path: str, output_dir: Path, threshold: float = 0.4) -> List[Dict[str, Any]]:
    """
    Extract keyframes using OpenCV histogram difference scene change detection.
    """
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise ValueError(f"Could not open video file: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    results: List[Dict[str, Any]] = []
    prev_hist: Optional[np.ndarray] = None
    frame_idx = 0
    keyframe_count = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Calculate HSV color histogram for scene comparison
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        hist = cv2.calcHist([hsv], [0, 1], None, [32, 32], [0, 180, 0, 256])
        cv2.normalize(hist, hist, 0, 1, cv2.NORM_MINMAX)

        is_keyframe = False

        if prev_hist is None:
            # First frame is always a keyframe
            is_keyframe = True
        else:
            # Compare with previous keyframe / scene histogram using correlation
            correlation = cv2.compareHist(prev_hist, hist, cv2.HISTCMP_CORREL)
            # Correlation drops below threshold on scene change
            if correlation < (1.0 - threshold):
                is_keyframe = True

        if is_keyframe:
            keyframe_count += 1
            timestamp = round(frame_idx / fps, 3)
            out_filename = f"keyframe_{keyframe_count:04d}.jpg"
            out_path = output_dir / out_filename
            cv2.imwrite(str(out_path), frame)

            results.append({
                "timestamp": timestamp,
                "frame_path": str(out_path.resolve())
            })
            prev_hist = hist

        frame_idx += 1

    cap.release()

    # Fallback if no frames were read
    if not results and total_frames > 0:
        cap = cv2.VideoCapture(str(video_path))
        ret, frame = cap.read()
        if ret:
            out_path = output_dir / "keyframe_0001.jpg"
            cv2.imwrite(str(out_path), frame)
            results.append({
                "timestamp": 0.0,
                "frame_path": str(out_path.resolve())
            })
        cap.release()

    return results


def extract_keyframes(video_path: str, output_dir: str, threshold: float = 0.3) -> List[Dict[str, Any]]:
    """
    Detect scene changes and extract one keyframe per scene.

    Args:
        video_path: Path to the input video file.
        output_dir: Directory where keyframe image files will be saved.
        threshold: Scene change sensitivity threshold.

    Returns:
        List of dicts: [{"timestamp": float, "frame_path": str}, ...]
    """
    vpath = Path(video_path).resolve()
    if not vpath.exists():
        raise FileNotFoundError(f"Video file not found: {video_path}")

    out_dir = Path(output_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    # Use FFmpeg if available, otherwise fallback to OpenCV
    if shutil.which("ffmpeg") is not None:
        try:
            return _extract_keyframes_ffmpeg(str(vpath), out_dir, threshold)
        except Exception:
            # Fallback to OpenCV on ffmpeg execution error
            return _extract_keyframes_opencv(str(vpath), out_dir, threshold)
    else:
        return _extract_keyframes_opencv(str(vpath), out_dir, threshold)
