"""
PDF Protection Module
Handles password protection and encryption for PDF files
"""

import os
import tempfile
from pypdf import PdfReader, PdfWriter


def protect_pdf(input_path, output_path, password, owner_password=None):
    """
    Add password protection to a PDF file.
    
    Args:
        input_path (str): Path to the input PDF file
        output_path (str): Path where the protected PDF will be saved
        password (str): User password for opening the PDF
        owner_password (str): Optional owner password for permissions
        
    Returns:
        dict: Protection status and details
        
    Raises:
        FileNotFoundError: If input file doesn't exist
        RuntimeError: If protection fails
    """
    
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"File not found: {input_path}")
    
    # Ensure output directory exists
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    try:
        # Read the PDF
        reader = PdfReader(input_path)
        writer = PdfWriter()
        
        # Copy all pages
        for page in reader.pages:
            writer.add_page(page)
        
        # Use owner password if provided, otherwise use user password
        if owner_password is None:
            owner_password = password + "_owner"
        
        # Encrypt the PDF
        writer.encrypt(
            user_password=password,
            owner_password=owner_password,
            algorithm="AES-256"
        )
        
        # Write the protected PDF
        with open(output_path, 'wb') as output_file:
            writer.write(output_file)
        
        return {
            'success': True,
            'pages': len(reader.pages),
            'message': 'PDF successfully protected with password',
            'output_path': output_path
        }
    
    except Exception as e:
        raise RuntimeError(f"PDF protection failed: {str(e)}")


def unlock_pdf(input_path, output_path, password):
    """
    Remove password protection from a PDF file.
    
    Args:
        input_path (str): Path to the protected PDF file
        output_path (str): Path where the unlocked PDF will be saved
        password (str): Password to unlock the PDF
        
    Returns:
        dict: Unlock status and details
        
    Raises:
        FileNotFoundError: If input file doesn't exist
        RuntimeError: If unlock fails
    """
    
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"File not found: {input_path}")
    
    # Ensure output directory exists
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    try:
        # Read the encrypted PDF
        reader = PdfReader(input_path)
        
        # Try to decrypt
        if reader.is_encrypted:
            if not reader.decrypt(password):
                raise RuntimeError("Incorrect password")
        
        # Create a new PDF without encryption
        writer = PdfWriter()
        
        # Copy all pages
        for page in reader.pages:
            writer.add_page(page)
        
        # Write the unlocked PDF
        with open(output_path, 'wb') as output_file:
            writer.write(output_file)
        
        return {
            'success': True,
            'pages': len(reader.pages),
            'message': 'PDF successfully unlocked',
            'output_path': output_path
        }
    
    except Exception as e:
        raise RuntimeError(f"PDF unlock failed: {str(e)}")
