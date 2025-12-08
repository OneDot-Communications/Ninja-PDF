import io
import pikepdf
from PIL import Image

def compress_pdf(input_stream, level='recommended'):
    """
    Compresses a PDF file by optimizing structure and re-compressing images.
    
    Args:
        input_stream (io.BytesIO): The input PDF file stream.
        level (str): Compression level ('extreme', 'recommended', 'less').

    Returns:
        io.BytesIO: The compressed PDF file stream.
    """
    try:
        # Settings based on level
        quality = 70
        scale = 1.0
        
        if level == 'extreme':
            quality = 40
            scale = 0.5  # Downsample to 50%
        elif level == 'recommended':
            quality = 60
            scale = 0.8  # Slight downsample
        elif level == 'less':
            quality = 85
            scale = 1.0  # No resizing

        input_stream.seek(0)
        with pikepdf.open(input_stream) as pdf:
            
            # Iterate over all pages
            for page in pdf.pages:
                # Iterate over the XObject dictionary of the page
                if '/XObject' in page.Resources:
                    xobjects = page.Resources['/XObject']
                    for name, xobj in xobjects.items():
                        if xobj.get('/Subtype') == '/Image':
                            # It's an image
                            try:
                                # Wrap in PdfImage for easy extraction
                                pdf_image = pikepdf.PdfImage(xobj)
                                
                                # Extract as Pillow Image
                                pil_image = pdf_image.as_pil_image()
                                
                                # Setup new dimensions
                                new_width = int(pil_image.width * scale)
                                new_height = int(pil_image.height * scale)
                                
                                # Only process if scaling down or compressing
                                if scale < 1.0 or level != 'less':
                                    # Resize
                                    if scale < 1.0:
                                        pil_image = pil_image.resize((new_width, new_height), Image.Resampling.LANCZOS)
                                    
                                    # Convert to RGB if needed (JPEG doesn't support RGBA)
                                    if pil_image.mode in ('P', 'RGBA', 'LA'):
                                        pil_image = pil_image.convert('RGB')
                                    
                                    # Save to bytes
                                    img_byte_arr = io.BytesIO()
                                    pil_image.save(img_byte_arr, format='JPEG', quality=quality, optimize=True)
                                    
                                    # Write back to PDF object
                                    # We replace the stream data and update metadata
                                    xobj.write(img_byte_arr.getvalue(), filter=pikepdf.Name('/DCTDecode'))
                                    xobj.Width = new_width
                                    xobj.Height = new_height
                                    xobj.ColorSpace = pikepdf.Name('/DeviceRGB')
                                    # Remove old filters/params that might conflict
                                    if '/Filter' in xobj:
                                        del xobj['/Filter'] # write() sets the filter
                                    
                            except Exception as img_err:
                                # Continue if one image fails
                                print(f"Warning: Failed to compress image {name}: {img_err}")
                                continue

            # Remove unused resources
            pdf.remove_unreferenced_resources()
            
            # Save
            output_stream = io.BytesIO()
            pdf.save(output_stream, linearize=True, compress_streams=True)
            output_stream.seek(0)
            return output_stream

    except Exception as e:
        raise ValueError(f"PDF Compression failed: {str(e)}")
