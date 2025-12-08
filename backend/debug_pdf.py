import io
import pikepdf
from PIL import Image
from optimizer.compress_pdf.compress_pdf import compress_pdf

def test_debug():
    # Create a dummy PDF with an image
    img = Image.new('RGB', (1000, 1000), color='blue')
    pdf_buffer = io.BytesIO()
    img.save(pdf_buffer, format='PDF')
    pdf_buffer.seek(0)
    
    print(f"Original size: {len(pdf_buffer.getvalue())}")
    
    try:
        compressed = compress_pdf(pdf_buffer, level='extreme')
        print(f"Compressed size: {len(compressed.getvalue())}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_debug()
