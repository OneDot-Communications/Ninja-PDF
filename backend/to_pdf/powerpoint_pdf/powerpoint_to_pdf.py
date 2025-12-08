import os
import subprocess
import platform
import time

# LibreOffice executable paths
LIBREOFFICE_PATHS = [
    r"C:\Program Files\LibreOffice\program\soffice.exe",
    r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
    "/usr/bin/soffice",
    "/usr/bin/libreoffice",
    "/Applications/LibreOffice.app/Contents/MacOS/soffice"
]

def find_libreoffice():
    """Find LibreOffice executable on the system."""
    for path in LIBREOFFICE_PATHS:
        if os.path.exists(path):
            return path
    return None

def convert_powerpoint_to_pdf(input_path, output_path):
    """
    Convert PowerPoint (.pptx) to PDF using LibreOffice for exact rendering.
    This preserves all formatting, graphics, SmartArt, and layout.
    """
    
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"File not found: {input_path}")
    
    ext = os.path.splitext(input_path)[1].lower()
    if ext != '.pptx':
        raise ValueError(f"Only .pptx files are supported. Got: {ext}")
    
    # Find LibreOffice
    soffice_path = find_libreoffice()
    if not soffice_path:
        raise RuntimeError("LibreOffice is not installed. Please install LibreOffice to convert PowerPoint files with exact formatting.")
    
    # Create output directory if needed
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Get absolute paths
    input_path = os.path.abspath(input_path)
    output_dir = os.path.abspath(output_dir) if output_dir else os.getcwd()
    
    try:
        # Convert using LibreOffice
        # --headless: run without GUI
        # --convert-to pdf: convert to PDF format
        # --outdir: output directory
        cmd = [
            soffice_path,
            '--headless',
            '--convert-to', 'pdf',
            '--outdir', output_dir,
            input_path
        ]
        
        print(f"Running LibreOffice conversion: {' '.join(cmd)}")
        
        # Run the conversion
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60  # 60 second timeout
        )
        
        if result.returncode != 0:
            error_msg = result.stderr or result.stdout or "Unknown error"
            raise RuntimeError(f"LibreOffice conversion failed: {error_msg}")
        
        # LibreOffice creates the PDF with the same name as input but .pdf extension
        input_basename = os.path.splitext(os.path.basename(input_path))[0]
        generated_pdf = os.path.join(output_dir, f"{input_basename}.pdf")
        
        # Wait for file to be created (up to 5 seconds)
        for _ in range(50):
            if os.path.exists(generated_pdf):
                break
            time.sleep(0.1)
        
        if not os.path.exists(generated_pdf):
            raise RuntimeError(f"LibreOffice did not create output PDF at {generated_pdf}")
        
        # If output_path is different from generated path, move it
        if os.path.abspath(generated_pdf) != os.path.abspath(output_path):
            if os.path.exists(output_path):
                os.remove(output_path)
            os.rename(generated_pdf, output_path)
        
        print(f"Conversion successful: {output_path}")
        return output_path
        
    except subprocess.TimeoutExpired:
        raise RuntimeError("LibreOffice conversion timed out after 60 seconds")
    except Exception as e:
        raise RuntimeError(f"PowerPoint to PDF conversion failed: {str(e)}")
