import os
import pikepdf
from pikepdf import Permissions, Encryption

def protect_pdf(input_path, output_path, user_password=None, owner_password=None, 
                allow_printing=True, allow_modify=False, allow_copy=False, 
                allow_annotate=False, allow_forms=False, allow_extract=False,
                allow_assemble=False, allow_print_highres=True):
    """
    Protect a PDF file with password encryption and permission controls.
    
    Uses AES-256 encryption (strongest standard) with pikepdf library.
    
    Parameters:
    -----------
    input_path : str
        Path to the input PDF file
    output_path : str
        Path where the protected PDF will be saved
    user_password : str, optional
        Password required to open/view the PDF (default: None = no password)
    owner_password : str, optional
        Password for full permissions (required if restrictions are set)
    allow_printing : bool
        Allow printing the document (default: True)
    allow_modify : bool
        Allow modifying the document (default: False)
    allow_copy : bool
        Allow copying text and graphics (default: False)
    allow_annotate : bool
        Allow adding/modifying annotations (default: False)
    allow_forms : bool
        Allow filling in form fields (default: False)
    allow_extract : bool
        Allow extracting text and graphics for accessibility (default: False)
    allow_assemble : bool
        Allow assembling document (insert, rotate, delete pages) (default: False)
    allow_print_highres : bool
        Allow high-resolution printing (default: True)
    
    Returns:
    --------
    str : Path to the protected PDF file
    
    Raises:
    -------
    FileNotFoundError : If input file doesn't exist
    ValueError : If file is not a valid PDF
    RuntimeError : If encryption fails
    
    Security Notes:
    ---------------
    - Passwords are never logged or stored
    - Uses AES-256 encryption (industry standard)
    - User password restricts opening the PDF
    - Owner password allows changing permissions
    - If only owner password is set, PDF opens without password but with restrictions
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
        print(f"Loading PDF: {input_path}")
        
        # Open the PDF
        pdf = pikepdf.open(input_path)
        
        # Build permissions object
        permissions = Permissions(
            accessibility=allow_extract,  # Extract for accessibility
            extract=allow_extract,         # Extract text/graphics
            modify_annotation=allow_annotate,  # Add/modify annotations
            modify_assembly=allow_assemble,    # Assemble document
            modify_form=allow_forms,           # Fill forms
            modify_other=allow_modify,         # Modify content
            print_lowres=allow_printing,       # Print low resolution
            print_highres=allow_print_highres  # Print high resolution
        )
        
        # Create encryption object with AES-256
        # R=6 means AES-256 encryption (highest security)
        encryption = Encryption(
            owner=owner_password or "",
            user=user_password or "",
            R=6,  # Revision 6 = AES-256
            allow=permissions
        )
        
        print(f"Applying AES-256 encryption with custom permissions...")
        print(f"Permissions: Print={allow_printing}, Modify={allow_modify}, Copy={allow_copy}")
        
        # Save with encryption
        pdf.save(
            output_path,
            encryption=encryption,
            linearize=True  # Optimize for web viewing
        )
        
        pdf.close()
        
        print(f"PDF protected successfully: {output_path}")
        return output_path
        
    except pikepdf.PasswordError as e:
        raise RuntimeError(f"Password error: {str(e)}")
    except pikepdf.PdfError as e:
        raise RuntimeError(f"PDF processing error: {str(e)}")
    except Exception as e:
        raise RuntimeError(f"Failed to protect PDF: {str(e)}")
