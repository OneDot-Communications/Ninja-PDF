import os
import io
import numpy as np
from PIL import Image, ImageEnhance
import cv2
import img2pdf

def scan_to_pdf(image_path, output_path, enhance=True, deskew=True):
    """
    Convert a scanned image to PDF with optional enhancements.
    
    Args:
        image_path (str): Path to the scanned image file
        output_path (str): Path where the PDF will be saved
        enhance (bool): Apply image enhancements (contrast, sharpness)
        deskew (bool): Automatically detect and correct skew
        
    Returns:
        dict: Conversion status and details
        
    Raises:
        FileNotFoundError: If input file doesn't exist
        RuntimeError: If conversion fails
    """
    
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"File not found: {image_path}")
    
    # Ensure output directory exists
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    processing_log = []
    
    try:
        # Load image with PIL
        processing_log.append(f"Loading image: {os.path.basename(image_path)}")
        img = Image.open(image_path)
        
        # Apply EXIF orientation correction
        try:
            from PIL import ImageOps
            img = ImageOps.exif_transpose(img)
            processing_log.append("Applied EXIF orientation correction")
        except Exception:
            pass
        
        # Check image properties
        original_size = img.size
        original_mode = img.mode
        processing_log.append(f"Original size: {original_size[0]}x{original_size[1]}, Mode: {original_mode}")
        
        # Convert to RGB if necessary
        if img.mode != 'RGB':
            processing_log.append(f"Converting from {img.mode} to RGB")
            img = img.convert('RGB')
        
        # Apply image enhancements
        if enhance:
            processing_log.append("Applying image enhancements...")
            img = enhance_image(img, processing_log)
        
        # Apply deskewing
        if deskew:
            processing_log.append("Detecting and correcting skew...")
            img = deskew_image(img, processing_log)
        
        # Check DPI (limit to 600 DPI)
        dpi = img.info.get('dpi', (72, 72))
        if max(dpi) > 600:
            scale_factor = 600 / max(dpi)
            new_size = (int(img.size[0] * scale_factor), int(img.size[1] * scale_factor))
            img = img.resize(new_size, Image.Resampling.LANCZOS)
            processing_log.append(f"Downsampled to 600 DPI: {new_size[0]}x{new_size[1]}")
        
        # Save to temporary buffer
        temp_buffer = io.BytesIO()
        img.save(temp_buffer, format='PNG', optimize=True)
        temp_buffer.seek(0)
        
        # Convert to PDF using img2pdf
        processing_log.append("Converting to PDF...")
        pdf_bytes = img2pdf.convert(temp_buffer)
        
        # Write PDF to file
        with open(output_path, 'wb') as pdf_file:
            pdf_file.write(pdf_bytes)
        
        processing_log.append(f"✓ PDF saved: {output_path}")
        
        return {
            'success': True,
            'original_size': original_size,
            'original_mode': original_mode,
            'enhancements_applied': enhance,
            'deskew_applied': deskew,
            'message': 'Scan successfully converted to PDF',
            'log': processing_log,
            'output_path': output_path
        }
    
    except Exception as e:
        processing_log.append(f"✗ Error: {str(e)}")
        raise RuntimeError(f"Scan to PDF conversion failed: {str(e)}")


def enhance_image(img, log):
    """
    Apply image enhancements to improve scan quality.
    
    Args:
        img (PIL.Image): Input image
        log (list): Processing log to append to
        
    Returns:
        PIL.Image: Enhanced image
    """
    
    # Auto-contrast
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.5)
    log.append("  ✓ Enhanced contrast")
    
    # Sharpening
    enhancer = ImageEnhance.Sharpness(img)
    img = enhancer.enhance(1.3)
    log.append("  ✓ Applied sharpening")
    
    # Brightness adjustment (slight increase)
    enhancer = ImageEnhance.Brightness(img)
    img = enhancer.enhance(1.1)
    log.append("  ✓ Adjusted brightness")
    
    # Noise reduction using OpenCV
    img_array = np.array(img)
    denoised = cv2.fastNlMeansDenoisingColored(img_array, None, 10, 10, 7, 21)
    img = Image.fromarray(denoised)
    log.append("  ✓ Reduced noise")
    
    return img


def deskew_image(img, log):
    """
    Detect and correct skew angle in scanned images.
    
    Args:
        img (PIL.Image): Input image
        log (list): Processing log to append to
        
    Returns:
        PIL.Image: Deskewed image
    """
    
    try:
        # Convert to OpenCV format
        img_array = np.array(img)
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        
        # Apply binary threshold
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        # Detect lines using Hough transform
        coords = np.column_stack(np.where(binary > 0))
        
        if len(coords) == 0:
            log.append("  ⚠ No text detected for deskewing")
            return img
        
        # Calculate skew angle using minimum area rectangle
        angle = cv2.minAreaRect(coords)[-1]
        
        # Normalize angle
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle
        
        # Only correct if skew is significant (> 0.5 degrees)
        if abs(angle) > 0.5:
            # Get image center
            (h, w) = img_array.shape[:2]
            center = (w // 2, h // 2)
            
            # Perform rotation
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            rotated = cv2.warpAffine(
                img_array, 
                M, 
                (w, h), 
                flags=cv2.INTER_CUBIC, 
                borderMode=cv2.BORDER_REPLICATE
            )
            
            img = Image.fromarray(rotated)
            log.append(f"  ✓ Corrected skew: {angle:.2f} degrees")
        else:
            log.append(f"  ✓ Skew angle minimal ({angle:.2f}°), no correction needed")
    
    except Exception as e:
        log.append(f"  ⚠ Deskew failed: {str(e)}")
    
    return img


def batch_scan_to_pdf(image_paths, output_path):
    """
    Convert multiple scanned images into a single PDF.
    
    Args:
        image_paths (list): List of image file paths
        output_path (str): Path where the PDF will be saved
        
    Returns:
        dict: Conversion status and details
    """
    
    if not image_paths:
        raise ValueError("No image paths provided")
    
    # Ensure output directory exists
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    processing_log = []
    processed_images = []
    
    try:
        for i, image_path in enumerate(image_paths, 1):
            if not os.path.exists(image_path):
                processing_log.append(f"⚠ Skipping missing file: {image_path}")
                continue
            
            processing_log.append(f"Processing image {i}/{len(image_paths)}: {os.path.basename(image_path)}")
            
            # Load and enhance image
            img = Image.open(image_path)
            
            # Apply EXIF orientation correction
            try:
                from PIL import ImageOps
                img = ImageOps.exif_transpose(img)
            except Exception:
                pass
            
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Apply enhancements
            img = enhance_image(img, processing_log)
            img = deskew_image(img, processing_log)
            
            # Save to buffer
            temp_buffer = io.BytesIO()
            img.save(temp_buffer, format='PNG', optimize=True)
            temp_buffer.seek(0)
            processed_images.append(temp_buffer.getvalue())
        
        if not processed_images:
            raise RuntimeError("No valid images to convert")
        
        # Convert all images to single PDF
        processing_log.append(f"Creating PDF with {len(processed_images)} pages...")
        pdf_bytes = img2pdf.convert(processed_images)
        
        # Write PDF to file
        with open(output_path, 'wb') as pdf_file:
            pdf_file.write(pdf_bytes)
        
        processing_log.append(f"✓ PDF saved: {output_path}")
        
        return {
            'success': True,
            'pages': len(processed_images),
            'message': f'Successfully converted {len(processed_images)} images to PDF',
            'log': processing_log,
            'output_path': output_path
        }
    
    except Exception as e:
        processing_log.append(f"✗ Error: {str(e)}")
        raise RuntimeError(f"Batch scan to PDF conversion failed: {str(e)}")
