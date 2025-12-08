import os
import mammoth
from xhtml2pdf import pisa
from docx2python import docx2python
try:
    import olefile
    OLEFILE_AVAILABLE = True
except ImportError:
    OLEFILE_AVAILABLE = False

def convert_word_to_pdf(input_path, output_path):
    """
    Convert a Word document to PDF.
    Supports both .doc (legacy) and .docx (modern) formats.
    
    Args:
        input_path (str): Path to the input .doc or .docx file.
        output_path (str): Path where the output .pdf file should be saved.
        
    Returns:
        str: The path to the generated PDF file.
    """
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")
        
    # Ensure output directory exists
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)

    try:
        file_ext = os.path.splitext(input_path)[1].lower()
        html_content = None
        
        # Check if file is actually in ZIP format (docx) regardless of extension
        is_zip_format = False
        try:
            with open(input_path, 'rb') as f:
                # Check for ZIP file signature (PK)
                is_zip_format = f.read(2) == b'PK'
        except:
            pass
        
        # Try mammoth first (works for .docx and some .doc files that are actually .docx)
        if file_ext == '.docx' or is_zip_format:
            try:
                with open(input_path, "rb") as docx_file:
                    result = mammoth.convert_to_html(docx_file)
                    html_content = result.value
            except Exception as e:
                # If mammoth fails, try docx2python
                try:
                    with docx2python(input_path) as doc_content:
                        text = doc_content.text
                        if text:
                            paragraphs = text.split('\n\n')
                            html_paragraphs = [f"<p>{p.replace(chr(10), '<br>')}</p>" for p in paragraphs if p.strip()]
                            html_content = '\n'.join(html_paragraphs)
                except Exception as e2:
                    raise RuntimeError(f"Failed to process Word file: {str(e)}")
        elif file_ext == '.doc':
            # True legacy .doc files (binary format)
            if not OLEFILE_AVAILABLE:
                raise RuntimeError(
                    "Sorry, legacy .doc files (Word 97-2003) require additional libraries. "
                    "Please save your file as .docx format and try again. "
                    "In Microsoft Word: File → Save As → Word Document (.docx)"
                )
            
            try:
                # Try to extract text from legacy .doc file using olefile
                if olefile.isOleFile(input_path):
                    ole = olefile.OleFileIO(input_path)
                    # Try to read WordDocument stream
                    if ole.exists('WordDocument'):
                        # Extract basic text (this is simplified and won't preserve formatting)
                        text_data = ole.openstream('WordDocument').read()
                        # Very basic text extraction - decode and clean
                        try:
                            text = text_data.decode('latin-1', errors='ignore')
                            # Remove control characters and keep readable text
                            import re
                            text = re.sub(r'[^\x20-\x7E\n\r\t]', '', text)
                            text = re.sub(r'\s+', ' ', text).strip()
                            
                            if text and len(text) > 10:
                                # Convert to simple HTML
                                html_content = f"""<p>{text}</p>"""
                            else:
                                raise RuntimeError("Could not extract readable text from .doc file")
                        except Exception as e:
                            raise RuntimeError(f"Could not decode .doc file content: {str(e)}")
                    else:
                        raise RuntimeError(".doc file structure not recognized")
                    ole.close()
                else:
                    raise RuntimeError("File is not a valid .doc file")
            except Exception as e:
                raise RuntimeError(
                    f"Failed to process .doc file: {str(e)}. "
                    "For best results, please save as .docx format in Microsoft Word: "
                    "File → Save As → Word Document (.docx)"
                )
        else:
            raise ValueError(f"Unsupported file format: {file_ext}")

        # 2. Add basic styling to the HTML
        styled_html = f"""
        <html>
        <head>
            <style>
                body {{ font-family: sans-serif; line-height: 1.5; color: #333; padding: 20px; }}
                h1, h2, h3 {{ color: #2c3e50; margin-top: 1em; margin-bottom: 0.5em; }}
                p {{ margin-bottom: 1em; }}
                table {{ border-collapse: collapse; width: 100%; margin-bottom: 1em; }}
                td, th {{ border: 1px solid #ddd; padding: 8px; }}
                img {{ max-width: 100%; height: auto; }}
            </style>
        </head>
        <body>
            {html_content}
        </body>
        </html>
        """

        # 3. Convert HTML to PDF using xhtml2pdf
        with open(output_path, "wb") as output_file:
            pisa_status = pisa.CreatePDF(
                styled_html,
                dest=output_file
            )

        if pisa_status.err:
            raise RuntimeError(f"Word to PDF conversion failed with errors: {pisa_status.err}")
            
        return output_path

    except Exception as e:
        raise RuntimeError(f"Word to PDF conversion failed: {str(e)}")
