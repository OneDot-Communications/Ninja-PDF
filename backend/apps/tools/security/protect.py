"""
PDF Protection Tools
Pure transformation - no Django, no DB.
"""
import logging

logger = logging.getLogger(__name__)


def protect(input_path: str, output_path: str, password: str, permissions: dict = None, **parameters) -> dict:
    """
    Add password protection to PDF.
    
    Args:
        input_path: Path to input PDF
        output_path: Path for protected PDF
        password: User password required to open
        permissions: {allow_printing: bool, allow_copying: bool}
        
    Returns:
        dict: {success, encrypted}
    """
    try:
        import pikepdf
        
        perms = pikepdf.Permissions(
            print_lowres=permissions.get('allow_printing', True) if permissions else True,
            print_highres=permissions.get('allow_printing', True) if permissions else True,
            extract=permissions.get('allow_copying', False) if permissions else False,
        )
        
        with pikepdf.open(input_path) as pdf:
            pdf.save(
                output_path,
                encryption=pikepdf.Encryption(
                    user=password,
                    owner=password,
                    allow=perms
                )
            )
        
        logger.info(f"Protected PDF: {output_path}")
        
        return {'success': True, 'encrypted': True}
        
    except Exception as e:
        logger.error(f"Protection failed: {e}")
        return {'success': False, 'message': str(e)}


def unlock(input_path: str, output_path: str, password: str, **parameters) -> dict:
    """
    Remove password protection from PDF.
    
    Returns:
        dict: {success, decrypted}
    """
    try:
        import pikepdf
        
        with pikepdf.open(input_path, password=password) as pdf:
            pdf.save(output_path)
        
        logger.info(f"Unlocked PDF: {output_path}")
        
        return {'success': True, 'decrypted': True}
        
    except pikepdf.PasswordError:
        return {'success': False, 'message': 'Incorrect password'}
    except Exception as e:
        logger.error(f"Unlock failed: {e}")
        return {'success': False, 'message': str(e)}
