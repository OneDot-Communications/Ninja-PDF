import os
from xhtml2pdf import pisa

def convert_html_to_pdf(input_path, output_path):
    """
    Convert an HTML file to PDF using xhtml2pdf.
    
    Args:
        input_path (str): Path to the input .html file.
        output_path (str): Path where the output .pdf file should be saved.
        
    Returns:
        str: The path to the generated PDF file.
        
    Raises:
        RuntimeError: If conversion fails.
    """
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")
        
    # Ensure output directory exists
    output_dir = os.path.dirname(output_path)
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    try:
        with open(input_path, "r", encoding='utf-8') as source_html:
            with open(output_path, "wb") as output_file:
                pisa_status = pisa.CreatePDF(
                    source_html,                # the HTML to convert
                    dest=output_file            # file handle to recieve result
                )

        if pisa_status.err:
            raise RuntimeError(f"HTML to PDF conversion failed with errors: {pisa_status.err}")
            
        return output_path
    except Exception as e:
        raise RuntimeError(f"HTML to PDF conversion failed: {str(e)}")
