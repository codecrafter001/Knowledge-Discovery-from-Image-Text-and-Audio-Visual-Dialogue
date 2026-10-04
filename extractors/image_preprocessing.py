import cv2
import numpy as np
from pathlib import Path
from typing import Union, Tuple

class ImagePreprocessor:
    """Handles image normalization: denoising, deskewing, and binarization."""
    
    def __init__(self, target_resolution: Tuple[int, int] = None):
        """
        Args:
            target_resolution: Optional (width, height) to resize images to a standard size.
        """
        self.target_resolution = target_resolution

    def load_image(self, image_path: Union[str, Path]) -> np.ndarray:
        """Loads an image from disk."""
        img = cv2.imread(str(image_path))
        if img is None:
            raise FileNotFoundError(f"Could not load image at {image_path}")
        return img

    def binarize_and_denoise(self, image: np.ndarray) -> np.ndarray:
        """Converts to grayscale, denoises, and applies adaptive binarization."""
        # Convert to grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        # Denoising
        denoised = cv2.fastNlMeansDenoising(gray, None, h=10, templateWindowSize=7, searchWindowSize=21)

        # Adaptive thresholding (binarization)
        # Using Gaussian thresholding for better handling of varying illumination
        binary = cv2.adaptiveThreshold(
            denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        return binary

    def deskew(self, image: np.ndarray) -> np.ndarray:
        """Detects text skew and rotates the image to correct it."""
        # Grab the (x, y) coordinates of all pixel values that are greater than zero
        # (Foreground text is usually black on white, but adaptiveThreshold makes it black on white. 
        # We need white text on black background for minAreaRect to work properly on the text)
        coords = np.column_stack(np.where(image == 0))
        
        if len(coords) == 0:
            return image
            
        # Compute the minimum bounding box
        angle = cv2.minAreaRect(coords)[-1]

        # `cv2.minAreaRect` returns values in the range [-90, 0)
        # As the rectangle rotates clockwise the returned angle trends to 0
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle

        # If the angle is very small, ignore it
        if abs(angle) < 0.5:
            return image

        # Rotate the image to deskew it
        (h, w) = image.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        
        # Use a white border (255) for the rotated edges
        rotated = cv2.warpAffine(
            image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=(255, 255, 255)
        )
        return rotated

    def process(self, image_path: Union[str, Path], output_path: Union[str, Path] = None) -> np.ndarray:
        """Runs the full pre-processing pipeline."""
        img = self.load_image(image_path)
        
        # 1. Resize if target_resolution is set
        if self.target_resolution:
            img = cv2.resize(img, self.target_resolution, interpolation=cv2.INTER_AREA)
            
        # 2. Denoise & Binarize
        processed = self.binarize_and_denoise(img)
        
        # 3. Deskew
        processed = self.deskew(processed)
        
        # Save output if path is provided
        if output_path:
            cv2.imwrite(str(output_path), processed)
            
        return processed

if __name__ == "__main__":
    # Test script against the sample data
    import sys
    from pathlib import Path
    
    project_root = Path(__file__).parent.parent
    sample_img_path = project_root / "sample_data" / "sample_image.png"
    output_img_path = project_root / "sample_data" / "sample_image_clean.png"
    
    if sample_img_path.exists():
        preprocessor = ImagePreprocessor()
        print(f"Processing {sample_img_path}...")
        preprocessor.process(sample_img_path, output_img_path)
        print(f"Saved cleaned image to {output_img_path}")
    else:
        print(f"Sample image not found at {sample_img_path}")
