"""
Word to PDF Converter
"""
import subprocess
import tempfile
import os
import sys
import logging
import shutil
from pathlib import Path

logger = logging.getLogger(__name__)

def find_libreoffice():
    """Find LibreOffice executable."""
    if sys.platform == 'win32':
        paths = [
            r"C:\Program Files\LibreOffice\program\soffice.exe",
            r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        ]
        for p in paths:
            if os.path.exists(p):
                return p
    return 'libreoffice'  # Default for Linux/Mac (in PATH)

def convert_word_to_pdf(file) -> bytes:
    """
    Convert Word document to PDF using docx2pdf (if available) or LibreOffice.
    
    Args:
        file: Django UploadedFile or file-like object
    
    Returns:
        PDF bytes
    """
    input_path = None
    output_path = None
    tmp_dir = None
    
    docx2pdf_error = None
    
    try:
        # Create temp directory
        tmp_dir = tempfile.mkdtemp()
        
        # Save input file
        input_filename = getattr(file, 'name', 'document.docx')
        input_path = os.path.join(tmp_dir, input_filename)
        
        with open(input_path, 'wb') as f:
            if hasattr(file, 'chunks'):
                for chunk in file.chunks():
                    f.write(chunk)
            else:
                f.write(file.read())
                
        output_filename = os.path.splitext(input_filename)[0] + '.pdf'
        output_path = os.path.join(tmp_dir, output_filename)
        
        # Method 1: Try docx2pdf (Best for Windows/Word)
        if sys.platform == 'win32':
            try:
                # Create a temporary python script to run conversion safely...
                converter_script = os.path.join(tmp_dir, 'convert_script.py')
                script_content = f"""
import sys
import pythoncom
pythoncom.CoInitialize()
from docx2pdf import convert
try:
    convert(r'{input_path}', r'{output_path}')
except Exception as e:
    print(f"docx2pdf Error: {{e}}")
    sys.exit(1)
finally:
    pythoncom.CoUninitialize()
"""
                with open(converter_script, 'w') as f:
                    f.write(script_content)

                logger.info(f"Running docx2pdf via script: {sys.executable} {converter_script}")
                res = subprocess.run([sys.executable, converter_script], check=True, capture_output=True, text=True, timeout=120)
                
                if os.path.exists(output_path):
                    with open(output_path, 'rb') as f:
                        return f.read()
            except Exception as e:
                # subprocess.CalledProcessError or generic exception
                error_details = ""
                if hasattr(e, 'stdout') and e.stdout: 
                    error_details += f"Output: {e.stdout}. "
                if hasattr(e, 'stderr') and e.stderr: 
                    error_details += f"Error: {e.stderr}. "
                if not error_details: 
                    error_details = str(e)
                
                docx2pdf_error = f"Microsoft Word conversion failed: {error_details}"
                logger.warning(f"docx2pdf failed, falling back to LibreOffice. Details: {docx2pdf_error}")

        # Method 2: LibreOffice (Fallback)
        soffice = find_libreoffice()
        cmd = [
            soffice,
            '--headless',
            '--convert-to', 'pdf',
            '--outdir', tmp_dir,
            input_path
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            if result.returncode != 0:
                 logger.warning(f"LibreOffice returned non-zero: {result.stderr}")
        except FileNotFoundError:
             # If LibreOffice missing, and we had a docx2pdf error, report THAT but formatted nicely.
             if docx2pdf_error:
                 msg = docx2pdf_error.lower()
                 if "password" in msg:
                     raise Exception("This file is password protected. Please remove the protection and try again.")
                 elif "corrupt" in msg or "open" in msg:
                     raise Exception("The file appears to be corrupted or invalid.")
                 elif "permission" in msg or "access" in msg:
                    raise Exception("Access denied. The file might be open in another program.")
                 else:
                     # Include details for debugging this specific file issue
                     raise Exception(f"Conversion failed: {error_details.strip()}")
                     
             raise Exception("Server Error: Conversion tools (Word/LibreOffice) are unavailable.")

        # Check Output
        expected_output = os.path.join(tmp_dir, os.path.splitext(os.path.basename(input_path))[0] + '.pdf')
        
        if not os.path.exists(expected_output):
            if docx2pdf_error:
                 msg = docx2pdf_error.lower()
                 if "password" in msg:
                     raise Exception("This file is password protected. Please remove the protection and try again.")
                 elif "corrupt" in msg:
                     raise Exception("The file appears to be corrupted or invalid.")
                 else:
                     raise Exception("Conversion failed. The document content could not be processed.")
                
            files = os.listdir(tmp_dir)
            raise Exception("Conversion failed. Please ensure the file is a valid Word document.")
            
        with open(expected_output, 'rb') as f:
            return f.read()

    except Exception as e:
        logger.error(f"Word to PDF conversion failed: {e}")
        raise e
    finally:
        # Cleanup
        if tmp_dir and os.path.exists(tmp_dir):
            try:
                shutil.rmtree(tmp_dir)
            except Exception as e:
                logger.warning(f"Failed to cleanup temp dir {tmp_dir}: {e}")

