import img2pdf
import os

def convert_jpg_to_pdf(input_path, output_path):
    """
    Convert a JPG image to PDF using img2pdf.
    
    Args:
        input_path (str): Path to the input .jpg or .jpeg file.
        output_path (str): Path where the output .pdf file should be saved.
        
    Returns:
        str: The path to the generated PDF file.
    """
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")
        
    # Ensure output directory exists
    output_dir = os.path.dirname(output_path)
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    try:
        # Convert
        with open(output_path, "wb") as f:
            f.write(img2pdf.convert(input_path))
            
        return output_path
    except Exception as e:
        raise RuntimeError(f"JPG to PDF conversion failed: {str(e)}")
