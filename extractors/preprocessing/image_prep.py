"""
Image Preprocessing Module
Performs denoising, deskewing, and binarization using OpenCV.
"""

import os
from pathlib import Path
from typing import Optional, Tuple
import cv2
import numpy as np


def compute_skew_angle(image_gray: np.ndarray) -> float:
    """
    Compute skew angle in degrees using thresholding and minimum bounding rectangle.
    """
    # Invert image so text is foreground (white)
    thresh = cv2.threshold(image_gray, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)[1]

    # Find non-zero pixel coordinates
    coords = np.column_stack(np.where(thresh > 0))
    if len(coords) < 10:
        return 0.0

    # Find min area bounding box around foreground points
    angle = cv2.minAreaRect(coords)[-1]

    # Normalize angle from minAreaRect
    if angle < -45:
        angle = -(90 + angle)
    elif angle > 45:
        angle = 90 - angle
    else:
        angle = -angle

    # Filter out near-zero noise
    if abs(angle) < 0.2:
        return 0.0

    return float(angle)


def deskew_image(image: np.ndarray, angle: float) -> np.ndarray:
    """
    Rotate image by skew angle around its center with white padding.
    """
    if abs(angle) < 0.2:
        return image

    (h, w) = image.shape[:2]
    center = (w // 2, h // 2)

    # Compute rotation matrix
    matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(
        image,
        matrix,
        (w, h),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(255, 255, 255) if len(image.shape) == 3 else 255
    )
    return rotated


def denoise_image(image: np.ndarray) -> np.ndarray:
    """
    Apply fast Non-Local Means Denoising to reduce noise while preserving edges.
    """
    if len(image.shape) == 3:
        return cv2.fastNlMeansDenoisingColored(image, None, 10, 10, 7, 21)
    else:
        return cv2.fastNlMeansDenoising(image, None, 10, 7, 21)


def binarize_image(image_gray: np.ndarray) -> np.ndarray:
    """
    Convert grayscale image to binary using Otsu's thresholding.
    """
    # Optional slight blur to remove salt-and-pepper noise before threshold
    blurred = cv2.GaussianBlur(image_gray, (3, 3), 0)
    _, binarized = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
    return binarized


def preprocess_image(image_path: str, save_clean: bool = True) -> np.ndarray:
    """
    Preprocess an image for OCR/vision tasks:
    1. Denoise (fastNlMeans)
    2. Deskew (orientation correction)
    3. Binarize (Otsu thresholding)

    Saves the cleaned image alongside the original with a '_clean' suffix.

    Args:
        image_path: Path to the original image file.
        save_clean: Whether to save the cleaned result to disk with '_clean' suffix.

    Returns:
        Cleaned image as a numpy ndarray (binary uint8).
    """
    path = Path(image_path).resolve()
    if not path.exists():
        raise FileNotFoundError(f"Image not found at path: {image_path}")

    # Load image using OpenCV
    image = cv2.imread(str(path))
    if image is None:
        raise ValueError(f"Could not decode image at path: {image_path}")

    # 1. Denoise
    denoised = denoise_image(image)

    # Convert to grayscale for deskew and binarize
    if len(denoised.shape) == 3:
        gray = cv2.cvtColor(denoised, cv2.COLOR_BGR2GRAY)
    else:
        gray = denoised

    # 2. Deskew
    angle = compute_skew_angle(gray)
    deskewed = deskew_image(gray, angle)

    # 3. Binarize
    cleaned = binarize_image(deskewed)

    # Save cleaned image alongside original
    if save_clean:
        clean_path = path.parent / f"{path.stem}_clean{path.suffix if path.suffix else '.png'}"
        cv2.imwrite(str(clean_path), cleaned)

    return cleaned
