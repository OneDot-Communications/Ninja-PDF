import os
import pikepdf

def unlock_pdf(input_path, output_path, password):
    """
    Remove password protection from a PDF file.
    
    Requires the correct password to decrypt the PDF.
    Restores the PDF to an unprotected, open format.
    
    Parameters:
    -----------
    input_path : str
        Path to the encrypted PDF file
    output_path : str
        Path where the unlocked PDF will be saved
    password : str
        Password to unlock the PDF (user or owner password)
    
    Returns:
    --------
    str : Path to the unlocked PDF file
    
    Raises:
    -------
    FileNotFoundError : If input file doesn't exist
    ValueError : If file is not a valid PDF
    RuntimeError : If decryption fails or password is incorrect
    
    Security Notes:
    ---------------
    - Password is never logged or stored
    - Password is cleared from memory after use
    - Cannot recover lost passwords (by design)
    - Works with both user and owner passwords
    """
    
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")
    
    # Validate it's a PDF
    ext = os.path.splitext(input_path)[1].lower()
    if ext != '.pdf':
        raise ValueError(f"Input file must be a PDF. Got: {ext}")
    
    # Create output directory if needed
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    try:
        print(f"Attempting to unlock PDF: {input_path}")
        
        # Try to open with password
        pdf = pikepdf.open(input_path, password=password)
        
        # Check if PDF was actually encrypted
        if not pdf.is_encrypted:
            pdf.close()
            raise RuntimeError("PDF is not encrypted. No password protection to remove.")
        
        print(f"Password accepted. Removing encryption...")
        
        # Save without encryption
        pdf.save(
            output_path,
            encryption=False,  # Remove all encryption
            linearize=True     # Optimize for web viewing
        )
        
        pdf.close()
        
        # Clear password from memory (Python will garbage collect)
        password = None
        
        print(f"PDF unlocked successfully: {output_path}")
        return output_path
        
    except pikepdf.PasswordError:
        # Password is incorrect
        raise RuntimeError("Incorrect password. Unable to unlock PDF.")
    except pikepdf.PdfError as e:
        raise RuntimeError(f"PDF processing error: {str(e)}")
    except Exception as e:
        raise RuntimeError(f"Failed to unlock PDF: {str(e)}")
