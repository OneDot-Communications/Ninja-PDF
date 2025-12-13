import os
import fitz  # PyMuPDF - more robust metadata handling
from datetime import datetime

def clean_pdf_metadata(input_path, output_path):
    """
    Remove ALL metadata from a PDF file using PyMuPDF, including:
    - Document Info dictionary (Title, Author, Subject, Creator, Producer, dates)
    - XMP metadata stream
    - Custom metadata properties
    
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
        # Open the PDF with PyMuPDF
        doc = fitz.open(input_path)
        
        # Get original metadata for reporting
        original_metadata = {}
        try:
            md = doc.metadata
            if md:
                original_metadata = {
                    'title': md.get('title', 'N/A') or 'N/A',
                    'author': md.get('author', 'N/A') or 'N/A',
                    'subject': md.get('subject', 'N/A') or 'N/A',
                    'creator': md.get('creator', 'N/A') or 'N/A',
                    'producer': md.get('producer', 'N/A') or 'N/A',
                    'creation_date': md.get('creationDate', 'N/A') or 'N/A',
                    'modification_date': md.get('modDate', 'N/A') or 'N/A',
                    'keywords': md.get('keywords', 'N/A') or 'N/A',
                }
        except Exception:
            pass
        
        # Clear all standard metadata fields, but set producer to our website
        doc.set_metadata({
            'title': '',
            'author': '',
            'subject': '',
            'keywords': '',
            'creator': '',
            'producer': '18+PDF',
            'creationDate': '',
            'modDate': '',
            'trapped': '',
        })
        
        # Delete XMP metadata stream if it exists
        try:
            doc.del_xml_metadata()
        except Exception:
            pass
        
        # Save the cleaned PDF
        # garbage=4 removes unused objects, clean=True sanitizes the file
        doc.save(output_path, garbage=4, clean=True, deflate=True)
        doc.close()
        
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
    Extract metadata from a PDF file without modifying it using PyMuPDF.
    
    Args:
        pdf_path (str): Path to the PDF file
        
    Returns:
        dict: Dictionary containing all metadata
    """
    
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"File not found: {pdf_path}")
    
    try:
        doc = fitz.open(pdf_path)
        md = doc.metadata
        
        if not md:
            doc.close()
            return {'message': 'No metadata found in PDF', 'num_pages': len(doc)}
        
        metadata = {
            'title': md.get('title', 'N/A') or 'N/A',
            'author': md.get('author', 'N/A') or 'N/A',
            'subject': md.get('subject', 'N/A') or 'N/A',
            'keywords': md.get('keywords', 'N/A') or 'N/A',
            'creator': md.get('creator', 'N/A') or 'N/A',
            'producer': md.get('producer', 'N/A') or 'N/A',
            'creationDate': md.get('creationDate', 'N/A') or 'N/A',
            'modDate': md.get('modDate', 'N/A') or 'N/A',
            'format': md.get('format', 'N/A') or 'N/A',
            'encryption': md.get('encryption', 'N/A') or 'N/A',
        }
        
        # Add additional info
        metadata['num_pages'] = len(doc)
        metadata['is_encrypted'] = doc.is_encrypted
        
        # Check for XMP metadata
        try:
            xmp = doc.get_xml_metadata()
            metadata['has_xmp_metadata'] = bool(xmp and xmp.strip())
        except Exception:
            metadata['has_xmp_metadata'] = False
        
        doc.close()
        return metadata
        
    except Exception as e:
        raise RuntimeError(f"Failed to read PDF metadata: {str(e)}")
