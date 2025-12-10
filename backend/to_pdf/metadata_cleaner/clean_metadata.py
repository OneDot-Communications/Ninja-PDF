import os
from pypdf import PdfReader, PdfWriter
from datetime import datetime

def clean_pdf_metadata(input_path, output_path):
    """
    Remove all metadata from a PDF file.
    
    Args:
        input_path (str): Path to the input PDF file
        output_path (str): Path where the cleaned PDF will be saved
        
    Returns:
        dict: Information about the cleaned metadata
        
    Raises:
        FileNotFoundError: If input file doesn't exist
        RuntimeError: If cleaning fails
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
        
        # Copy all pages to new PDF
        for page in reader.pages:
            writer.add_page(page)
        
        # Get original metadata for reporting
        original_metadata = {}
        if reader.metadata:
            original_metadata = {
                'title': reader.metadata.get('/Title', 'N/A'),
                'author': reader.metadata.get('/Author', 'N/A'),
                'subject': reader.metadata.get('/Subject', 'N/A'),
                'creator': reader.metadata.get('/Creator', 'N/A'),
                'producer': reader.metadata.get('/Producer', 'N/A'),
                'creation_date': reader.metadata.get('/CreationDate', 'N/A'),
                'modification_date': reader.metadata.get('/ModDate', 'N/A'),
            }
        
        # Clear all metadata by not adding any
        # pypdf by default doesn't include old metadata in new writer
        
        # Write the cleaned PDF
        with open(output_path, 'wb') as output_file:
            writer.write(output_file)
        
        return {
            'success': True,
            'original_metadata': original_metadata,
            'message': 'All metadata has been removed from the PDF',
            'output_path': output_path
        }
        
    except Exception as e:
        raise RuntimeError(f"Failed to clean PDF metadata: {str(e)}")


def get_pdf_metadata(pdf_path):
    """
    Extract metadata from a PDF file without modifying it.
    
    
    Args:
        pdf_path (str): Path to the PDF file
        
    Returns:
        dict: Dictionary containing all metadata
    """
    
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"File not found: {pdf_path}")
    
    try:
        reader = PdfReader(pdf_path)
        
        if not reader.metadata:
            return {'message': 'No metadata found in PDF'}
        
        metadata = {}
        for key, value in reader.metadata.items():
            # Remove the leading '/' from keys
            clean_key = key.lstrip('/')
            metadata[clean_key] = str(value) if value else 'N/A'
        
        # Add additional info
        metadata['num_pages'] = len(reader.pages)
        metadata['is_encrypted'] = reader.is_encrypted
        
        return metadata
        
    except Exception as e:
        raise RuntimeError(f"Failed to read PDF metadata: {str(e)}")
