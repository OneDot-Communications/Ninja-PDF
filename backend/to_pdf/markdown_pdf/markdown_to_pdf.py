import os
import markdown
from xhtml2pdf import pisa

def convert_markdown_to_pdf(input_path, output_path):
    """
    Convert a Markdown file to PDF.
    
    Args:
        input_path (str): Path to the input .md file.
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
        # Read Markdown content
        with open(input_path, "r", encoding="utf-8") as f:
            text = f.read()
            
        # Convert to HTML
        html_content = markdown.markdown(text, extensions=['extra', 'codehilite'])
        
        # Add some basic styling
        styled_html = f"""
        <html>
        <head>
            <style>
                body {{ font-family: sans-serif; line-height: 1.6; color: #333; }}
                h1, h2, h3 {{ color: #2c3e50; }}
                code {{ background-color: #f8f9fa; padding: 2px 4px; border-radius: 4px; font-family: monospace; }}
                pre {{ background-color: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; }}
                blockquote {{ border-left: 4px solid #ccc; margin-left: 0; padding-left: 10px; color: #666; }}
                table {{ border-collapse: collapse; width: 100%; margin-bottom: 1rem; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>
            {html_content}
        </body>
        </html>
        """

        # Convert HTML to PDF
        with open(output_path, "wb") as output_file:
            pisa_status = pisa.CreatePDF(
                styled_html,                # the HTML to convert
                dest=output_file            # file handle to recieve result
            )

        if pisa_status.err:
            raise RuntimeError(f"Markdown to PDF conversion failed with errors: {pisa_status.err}")
            
        return output_path
    except Exception as e:
        raise RuntimeError(f"Markdown to PDF conversion failed: {str(e)}")
