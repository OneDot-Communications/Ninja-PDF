import subprocess
import os
import sys

def convert_excel_to_pdf(input_path, output_path):
    """
    Convert an Excel spreadsheet to PDF using LibreOffice.
    
    Args:
        input_path (str): Path to the input .xlsx or .xls file.
        output_path (str): Path where the output .pdf file should be saved.
        
    Returns:
        str: The path to the generated PDF file.
        
    Raises:
        RuntimeError: If conversion fails or LibreOffice is not found.
    """
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")

    # Ensure absolute paths
    input_path = os.path.abspath(input_path)
    output_path = os.path.abspath(output_path)
    output_dir = os.path.dirname(output_path)
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Determine the command based on OS
    if sys.platform == 'win32':
        libreoffice_cmd = 'soffice'
        # Check if soffice is in PATH, otherwise use default installation path
        import shutil
        if not shutil.which(libreoffice_cmd):
            default_path = r"C:\Program Files\LibreOffice\program\soffice.exe"
            if os.path.exists(default_path):
                libreoffice_cmd = default_path
    else:
        libreoffice_cmd = 'libreoffice'

    cmd = [
        libreoffice_cmd,
        '--headless',
        '--convert-to', 'pdf',
        '--outdir', output_dir,
        input_path
    ]
    
    try:
        # Run LibreOffice
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # LibreOffice saves the file with the same basename but .pdf extension in output_dir
        base_name = os.path.splitext(os.path.basename(input_path))[0]
        generated_filename = base_name + ".pdf"
        generated_file_path = os.path.join(output_dir, generated_filename)
        
        # If the user requested a specific output filename that is different, rename it
        if generated_file_path != output_path:
            if os.path.exists(output_path):
                os.remove(output_path)
            if os.path.exists(generated_file_path):
                os.rename(generated_file_path, output_path)
            else:
                raise RuntimeError(f"Expected output file {generated_file_path} was not created.")
                
        return output_path

    except subprocess.CalledProcessError as e:
        error_msg = e.stderr.decode() if e.stderr else "Unknown error"
        raise RuntimeError(f"LibreOffice conversion failed: {error_msg}")
    except FileNotFoundError:
        raise RuntimeError(f"{libreoffice_cmd} not found. Please ensure LibreOffice is installed and in your PATH.")
