"""
Script to generate test sample files (image, video, audio) for preprocessing verification.
"""

from pathlib import Path
import cv2
import numpy as np

try:
    import soundfile as sf
except ImportError:
    sf = None

try:
    from scipy.io import wavfile
except ImportError:
    wavfile = None


def generate_sample_image(output_path: Path):
    """Generate a noisy, slightly rotated image with text."""
    h, w = 300, 500
    img = np.full((h, w, 3), 255, dtype=np.uint8)

    # Draw text and shapes
    cv2.putText(img, "KNOWLEDGE DISCOVERY", (30, 80), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (20, 20, 20), 2)
    cv2.putText(img, "Multimodal Document Extraction", (30, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (50, 50, 50), 2)
    cv2.rectangle(img, (25, 180), (475, 260), (30, 30, 30), 2)
    cv2.putText(img, "Sample OCR Testing Block", (50, 225), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (10, 10, 10), 2)

    # Add Gaussian noise
    noise = np.random.normal(0, 15, (h, w, 3)).astype(np.int16)
    noisy_img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    # Apply 3-degree rotation skew
    center = (w // 2, h // 2)
    rot_mat = cv2.getRotationMatrix2D(center, 3.5, 1.0)
    skewed_img = cv2.warpAffine(noisy_img, rot_mat, (w, h), borderValue=(255, 255, 255))

    cv2.imwrite(str(output_path), skewed_img)
    print(f"Generated sample image: {output_path}")


def generate_sample_video(output_path: Path, duration_sec: int = 5, fps: int = 25):
    """Generate a 5-second video with 2 distinct scene cuts."""
    h, w = 240, 320
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(str(output_path), fourcc, fps, (w, h))

    total_frames = duration_sec * fps
    cut_frame = total_frames // 2

    for f in range(total_frames):
        if f < cut_frame:
            # Scene 1: Indigo background with moving text
            frame = np.full((h, w, 3), (120, 50, 30), dtype=np.uint8)
            cv2.putText(frame, "Scene 1: Introduction", (20, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            cv2.circle(frame, (40 + (f * 4) % (w - 80), 60), 18, (0, 255, 200), -1)
        else:
            # Scene 2: Emerald/Teal background
            frame = np.full((h, w, 3), (30, 120, 60), dtype=np.uint8)
            cv2.putText(frame, "Scene 2: Data Extraction", (20, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            cv2.rectangle(frame, (100, 160), (220, 200), (255, 200, 0), -1)

        out.write(frame)

    out.release()
    print(f"Generated sample video: {output_path}")


def generate_sample_audio(output_path: Path, duration_sec: int = 5, sample_rate: int = 22050):
    """Generate a 5-second stereo audio file with two tones."""
    t = np.linspace(0, duration_sec, int(sample_rate * duration_sec), endpoint=False)
    # Channel 1: 440 Hz (A4) Tone
    ch1 = 0.5 * np.sin(2 * np.pi * 440 * t)
    # Channel 2: 880 Hz (A5) Tone with modulation
    ch2 = 0.5 * np.sin(2 * np.pi * 880 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 2 * t))
    stereo_audio = np.vstack((ch1, ch2)).T.astype(np.float32)

    if sf is not None:
        sf.write(str(output_path), stereo_audio, sample_rate)
    elif wavfile is not None:
        int16_audio = (stereo_audio * 32767).astype(np.int16)
        wavfile.write(str(output_path), sample_rate, int16_audio)

    print(f"Generated sample audio: {output_path}")


if __name__ == "__main__":
    sample_dir = Path("sample_data").resolve()
    sample_dir.mkdir(parents=True, exist_ok=True)

    generate_sample_image(sample_dir / "sample_image.png")
    generate_sample_video(sample_dir / "sample_video.mp4")
    generate_sample_audio(sample_dir / "sample_audio.wav")
