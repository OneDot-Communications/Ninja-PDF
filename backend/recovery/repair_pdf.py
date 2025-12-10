import os
import io
import pikepdf
from pypdf import PdfReader, PdfWriter

def repair_pdf(input_path, output_path):
    """
    Repair a corrupted PDF file using pikepdf and pypdf.
    
    Args:
        input_path (str): Path to the corrupted PDF file
        output_path (str): Path where the repaired PDF will be saved
        
    Returns:
        dict: Repair status and details
        
    Raises:
        FileNotFoundError: If input file doesn't exist
        RuntimeError: If repair fails
    """
    
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"File not found: {input_path}")
    
    # Ensure output directory exists
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    repair_log = []
    
    try:
        # Method 1: Try pikepdf (auto-repairs on open)
        repair_log.append("Attempting repair with pikepdf...")
        
        try:
            with pikepdf.open(input_path, allow_overwriting_input=False) as pdf:
                # pikepdf automatically repairs many issues when opening
                repair_log.append("✓ Successfully opened with pikepdf")
                
                # Check for common issues
                num_pages = len(pdf.pages)
                repair_log.append(f"✓ PDF has {num_pages} pages")
                
                # Save repaired version
                pdf.save(output_path)
                repair_log.append("✓ Saved repaired PDF")
                
                return {
                    'success': True,
                    'method': 'pikepdf',
                    'pages': num_pages,
                    'message': 'PDF successfully repaired',
                    'log': repair_log,
                    'output_path': output_path
                }
        
        except pikepdf.PasswordError:
            repair_log.append("✗ PDF is password protected")
            raise RuntimeError("Cannot repair password-protected PDFs. Please remove password first.")
        
        except Exception as e:
            repair_log.append(f"✗ pikepdf failed: {str(e)}")
            repair_log.append("Trying fallback method with pypdf...")
            
            # Method 2: Fallback to pypdf
            try:
                reader = PdfReader(input_path, strict=False)
                writer = PdfWriter()
                
                num_pages = len(reader.pages)
                repair_log.append(f"✓ pypdf read {num_pages} pages")
                
                # Copy all pages
                for i, page in enumerate(reader.pages):
                    try:
                        writer.add_page(page)
                    except Exception as page_error:
                        repair_log.append(f"⚠ Warning: Page {i+1} may be corrupted: {str(page_error)}")
                
                # Write repaired PDF
                with open(output_path, 'wb') as output_file:
                    writer.write(output_file)
                
                repair_log.append("✓ Saved repaired PDF with pypdf")
                
                return {
                    'success': True,
                    'method': 'pypdf',
                    'pages': len(writer.pages),
                    'message': 'PDF repaired with warnings',
                    'log': repair_log,
                    'output_path': output_path
                }
            
            except Exception as pypdf_error:
                repair_log.append(f"✗ pypdf also failed: {str(pypdf_error)}")
                raise RuntimeError(f"Unable to repair PDF. File may be severely corrupted.")
    
    except RuntimeError:
        raise
    except Exception as e:
        repair_log.append(f"✗ Unexpected error: {str(e)}")
        raise RuntimeError(f"PDF repair failed: {str(e)}")


def validate_pdf(pdf_path):
    """
    Validate a PDF file structure without modifying it.
    
    Args:
        pdf_path (str): Path to the PDF file
        
    Returns:
        dict: Validation results
    """
    
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"File not found: {pdf_path}")
    
    validation_results = {
        'is_valid': False,
        'issues': [],
        'info': {}
    }
    
    try:
        # Try opening with pikepdf (strict mode)
        with pikepdf.open(pdf_path) as pdf:
            validation_results['is_valid'] = True
            validation_results['info'] = {
                'pages': len(pdf.pages),
                'version': str(pdf.pdf_version),
                'is_encrypted': pdf.is_encrypted,
                'is_linearized': pdf.is_linearized
            }
            
            # Check metadata
            if pdf.docinfo:
                validation_results['info']['has_metadata'] = True
            
            return validation_results
    
    except pikepdf.PasswordError:
        validation_results['issues'].append('PDF is password protected')
    except Exception as e:
        validation_results['issues'].append(f'Validation error: {str(e)}')
    
    return validation_results
