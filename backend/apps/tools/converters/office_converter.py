"""
Office Document Converters
Use LibreOffice for reliable document conversion of Excel, PowerPoint, and other formats.
"""
import subprocess
import tempfile
import os
import logging

logger = logging.getLogger(__name__)


class LibreOfficeConverter:
    """
    Universal document converter using LibreOffice headless mode.
    Supports: .xlsx, .xls, .pptx, .ppt, .doc, .docx, .odt, .ods, .odp, .html, .rtf
    """
    
    TIMEOUT_SECONDS = 180  # 3 minutes
    
    @classmethod
    def convert_to_pdf(cls, input_bytes: bytes, input_format: str, output_path: str = None) -> bytes:
        """
        Convert a document to PDF using LibreOffice.
        
        Args:
            input_bytes: Document content as bytes
            input_format: File extension (e.g., 'xlsx', 'pptx')
            output_path: Optional specific output path
        
        Returns:
            PDF content as bytes
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            # Write input file
            input_file = os.path.join(tmpdir, f'input.{input_format}')
            with open(input_file, 'wb') as f:
                f.write(input_bytes)
            
            # Run LibreOffice
            result = subprocess.run(
                [
                    'libreoffice',
                    '--headless',
                    '--invisible',
                    '--nologo',
                    '--nofirststartwizard',
                    '--convert-to', 'pdf',
                    '--outdir', tmpdir,
                    input_file
                ],
                capture_output=True,
                text=True,
                timeout=cls.TIMEOUT_SECONDS
            )
            
            if result.returncode != 0:
                raise Exception(f"LibreOffice conversion failed: {result.stderr}")
            
            # Read output
            output_file = os.path.join(tmpdir, 'input.pdf')
            if not os.path.exists(output_file):
                raise Exception("PDF output not generated")
            
            with open(output_file, 'rb') as f:
                return f.read()


def convert_excel_to_pdf(file) -> bytes:
    """
    Convert Excel spreadsheet to PDF.
    Uses Excel COM on Windows, LibreOffice fallback.
    """
    import sys
    import tempfile
    import shutil
    
    tmp_dir = None
    excel_error = None
    
    try:
        tmp_dir = tempfile.mkdtemp()
        
        # Save input file
        filename = getattr(file, 'name', 'input.xlsx')
        input_path = os.path.join(tmp_dir, filename)
        output_path = os.path.join(tmp_dir, os.path.splitext(filename)[0] + '.pdf')
        
        content = file.read()
        with open(input_path, 'wb') as f:
            f.write(content)
        
        # Method 1: Try Excel COM on Windows
        if sys.platform == 'win32':
            try:
                script_path = os.path.join(tmp_dir, 'convert_excel.py')
                script_content = f'''
import sys
try:
    import pythoncom
    pythoncom.CoInitialize()
    import win32com.client
    excel = win32com.client.Dispatch("Excel.Application")
    excel.Visible = False
    excel.DisplayAlerts = False
    workbook = excel.Workbooks.Open(r"{input_path}")
    workbook.ExportAsFixedFormat(0, r"{output_path}")  # 0 = xlTypePDF
    workbook.Close(False)
    excel.Quit()
    pythoncom.CoUninitialize()
except Exception as e:
    print(f"Excel Error: {{e}}")
    sys.exit(1)
'''
                with open(script_path, 'w') as f:
                    f.write(script_content)
                
                result = subprocess.run([sys.executable, script_path], 
                                       capture_output=True, text=True, timeout=120)
                
                if result.returncode == 0 and os.path.exists(output_path):
                    with open(output_path, 'rb') as f:
                        return f.read()
                else:
                    excel_error = result.stdout + result.stderr
                    
            except Exception as e:
                excel_error = str(e)
                logger.warning(f"Excel COM failed: {e}")
        
        # Method 2: LibreOffice fallback
        try:
            ext = filename.rsplit('.', 1)[-1].lower()
            if ext not in ('xlsx', 'xls', 'ods'):
                ext = 'xlsx'
            return LibreOfficeConverter.convert_to_pdf(content, ext)
        except FileNotFoundError:
            if excel_error:
                raise Exception(f"Conversion failed. Please ensure Microsoft Excel is installed.")
            raise Exception("Conversion tools (Excel/LibreOffice) are unavailable.")
            
    except subprocess.TimeoutExpired:
        raise Exception("Excel conversion timed out")
    except Exception as e:
        logger.error(f"Excel to PDF failed: {e}")
        raise
    finally:
        if tmp_dir and os.path.exists(tmp_dir):
            try:
                shutil.rmtree(tmp_dir)
            except:
                pass


def convert_powerpoint_to_pdf(file) -> bytes:
    """
    Convert PowerPoint presentation to PDF.
    Uses PowerPoint COM on Windows, LibreOffice fallback.
    """
    import sys
    import tempfile
    import shutil
    
    tmp_dir = None
    ppt_error = None
    
    try:
        tmp_dir = tempfile.mkdtemp()
        
        # Save input file
        filename = getattr(file, 'name', 'input.pptx')
        input_path = os.path.join(tmp_dir, filename)
        output_path = os.path.join(tmp_dir, os.path.splitext(filename)[0] + '.pdf')
        
        content = file.read()
        with open(input_path, 'wb') as f:
            f.write(content)
        
        # Method 1: Try PowerPoint COM on Windows
        if sys.platform == 'win32':
            try:
                # Create a script to run PowerPoint conversion in separate process
                script_path = os.path.join(tmp_dir, 'convert_ppt.py')
                script_content = f'''
import sys
try:
    import pythoncom
    pythoncom.CoInitialize()
    import win32com.client
    powerpoint = win32com.client.Dispatch("PowerPoint.Application")
    presentation = powerpoint.Presentations.Open(r"{input_path}", WithWindow=False)
    presentation.SaveAs(r"{output_path}", 32)  # 32 = ppSaveAsPDF
    presentation.Close()
    powerpoint.Quit()
    pythoncom.CoUninitialize()
except Exception as e:
    print(f"PowerPoint Error: {{e}}")
    sys.exit(1)
'''
                with open(script_path, 'w') as f:
                    f.write(script_content)
                
                result = subprocess.run([sys.executable, script_path], 
                                       capture_output=True, text=True, timeout=120)
                
                if result.returncode == 0 and os.path.exists(output_path):
                    with open(output_path, 'rb') as f:
                        return f.read()
                else:
                    ppt_error = result.stdout + result.stderr
                    
            except Exception as e:
                ppt_error = str(e)
                logger.warning(f"PowerPoint COM failed: {e}")
        
        # Method 2: LibreOffice fallback
        try:
            ext = filename.rsplit('.', 1)[-1].lower()
            if ext not in ('pptx', 'ppt', 'odp'):
                ext = 'pptx'
            return LibreOfficeConverter.convert_to_pdf(content, ext)
        except FileNotFoundError:
            if ppt_error:
                raise Exception(f"Conversion failed. Please ensure Microsoft PowerPoint is installed.")
            raise Exception("Conversion tools (PowerPoint/LibreOffice) are unavailable.")
            
    except subprocess.TimeoutExpired:
        raise Exception("PowerPoint conversion timed out")
    except Exception as e:
        logger.error(f"PowerPoint to PDF failed: {e}")
        raise
    finally:
        if tmp_dir and os.path.exists(tmp_dir):
            try:
                shutil.rmtree(tmp_dir)
            except:
                pass


def convert_html_to_pdf(file) -> bytes:
    """
    Convert HTML to PDF using WeasyPrint for better rendering.
    
    Args:
        file: Django UploadedFile or file-like object
    
    Returns:
        PDF bytes
    """
    try:
        from weasyprint import HTML, CSS
        
        content = file.read()
        if isinstance(content, bytes):
            html_content = content.decode('utf-8')
        else:
            html_content = content
        
        # Create PDF from HTML
        html = HTML(string=html_content)
        pdf_bytes = html.write_pdf()
        
        return pdf_bytes
    except ImportError:
        # Fallback to LibreOffice if WeasyPrint not available
        logger.warning("WeasyPrint not available, using LibreOffice for HTML to PDF")
        content = file.read() if hasattr(file, 'read') else file
        if isinstance(content, str):
            content = content.encode('utf-8')
        return LibreOfficeConverter.convert_to_pdf(content, 'html')
    except Exception as e:
        logger.error(f"HTML to PDF failed: {e}")
        raise


def convert_markdown_to_pdf(file) -> bytes:
    """
    Convert Markdown to PDF via HTML intermediate.
    
    Args:
        file: Django UploadedFile or file-like object
    
    Returns:
        PDF bytes
    """
    try:
        import markdown
        from weasyprint import HTML, CSS
        
        content = file.read()
        if isinstance(content, bytes):
            md_content = content.decode('utf-8')
        else:
            md_content = content
        
        # Convert Markdown to HTML
        html_content = markdown.markdown(
            md_content,
            extensions=['tables', 'fenced_code', 'codehilite']
        )
        
        # Wrap in basic HTML structure with styling
        full_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6;
                    max-width: 800px;
                    margin: 40px auto;
                    padding: 0 20px;
                }}
                h1, h2, h3 {{ color: #333; }}
                code {{ 
                    background: #f4f4f4; 
                    padding: 2px 6px; 
                    border-radius: 3px;
                }}
                pre {{ 
                    background: #f4f4f4; 
                    padding: 16px; 
                    overflow-x: auto;
                    border-radius: 6px;
                }}
                table {{ 
                    border-collapse: collapse; 
                    width: 100%;
                    margin: 20px 0;
                }}
                th, td {{ 
                    border: 1px solid #ddd; 
                    padding: 8px; 
                    text-align: left;
                }}
                th {{ background: #f4f4f4; }}
            </style>
        </head>
        <body>
            {html_content}
        </body>
        </html>
        """
        
        # Create PDF
        html = HTML(string=full_html)
        pdf_bytes = html.write_pdf()
        
        return pdf_bytes
    except ImportError as e:
        raise Exception(f"Required library not available: {e}")
    except Exception as e:
        logger.error(f"Markdown to PDF failed: {e}")
        raise
