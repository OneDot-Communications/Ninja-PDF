import io
from PIL import Image

def compress_image(input_stream, filename, level='recommended'):
    """
    Compresses an image file using Pillow.

    Args:
        input_stream (io.BytesIO): The input image stream.
        filename (str): Original filename to determine format.
        level (str): Compression level ('extreme', 'recommended', 'less').

    Returns:
        tuple: (io.BytesIO, str) -> (compressed_stream, mime_type)
    """
    try:
        input_stream.seek(0)
        img = Image.open(input_stream)
        
        # Determine format
        fmt = img.format
        if not fmt:
            fmt = 'JPEG' if filename.lower().endswith(('.jpg', '.jpeg')) else 'PNG'
        
        # Settings
        quality = 75
        optimize = True
        
        if level == 'extreme':
            quality = 30
        elif level == 'recommended':
            quality = 70
        elif level == 'less':
            quality = 85
            optimize = False

        if fmt in ('JPEG', 'JPG'):
            # Handle alpha channel for JPEGs
            if img.mode in ('RGBA', 'LA'):
                img = img.convert('RGB')

        output_stream = io.BytesIO()
        
        save_args = {'optimize': optimize}
        
        if fmt in ('JPEG', 'JPG'):
            save_args['quality'] = quality
        
        img.save(output_stream, format=fmt, **save_args)
        output_stream.seek(0)
        
        mime_type = Image.MIME.get(fmt, 'application/octet-stream')
        return output_stream, mime_type

    except Exception as e:
        raise ValueError(f"Image Compression failed: {str(e)}")
