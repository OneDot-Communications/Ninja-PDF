import os
try:
    from weasyprint import HTML
except ImportError:
    HTML = None

def convert_html_to_pdf(input_path, output_path):
    """
    Convert an HTML file to PDF using WeasyPrint.
    
    Args:
        input_path (str): Path to the input .html file.
        output_path (str): Path where the output .pdf file should be saved.
        
    Returns:
        str: The path to the generated PDF file.
        
    Raises:
        RuntimeError: If conversion fails or WeasyPrint is not installed.
    """
    if HTML is None:
        raise RuntimeError("WeasyPrint is not installed. Please install it with 'pip install WeasyPrint'.")

    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")
        
    # Ensure output directory exists
    output_dir = os.path.dirname(output_path)
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    try:
        # Convert
        # WeasyPrint can take a filename directly
        HTML(filename=input_path).write_pdf(output_path)
            
        return output_path
    except Exception as e:
        raise RuntimeError(f"HTML to PDF conversion failed: {str(e)}")
