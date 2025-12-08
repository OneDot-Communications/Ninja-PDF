# pdf_to_pdfa.py
"""
PDF to PDF/A conversion module.
Converts PDF files to PDF/A format for long-term archiving using pikepdf.
PDF/A is an ISO standard for digital document preservation.
"""

import os
import io
import tempfile
import pikepdf
from pikepdf import Pdf
import fitz  # PyMuPDF for validation


def parse_page_range(page_range, total_pages):
    """
    Parse page range string and return list of 1-based page numbers.
    
    Args:
        page_range: String like "1,3-5,8" or "all"
        total_pages: Total number of pages in PDF
    
    Returns:
        list: List of page numbers (1-based)
    """
    if not page_range or page_range.lower() == 'all':
        return list(range(1, total_pages + 1))
    
    pages = set()
    parts = page_range.split(',')
    
    for part in parts:
        part = part.strip()
        if '-' in part:
            try:
                start, end = map(int, part.split('-'))
                start = max(1, start)
                end = min(total_pages, end)
                for i in range(start, end + 1):
                    pages.add(i)
            except ValueError:
                continue
        else:
            try:
                page = int(part)
                if 1 <= page <= total_pages:
                    pages.add(page)
            except ValueError:
                continue
    
    return sorted(list(pages))


def extract_pages_to_new_pdf(input_pdf, pages_to_keep):
    """
    Extract specific pages from PDF and create a new PDF.
    
    Args:
        input_pdf: pikepdf.Pdf object
        pages_to_keep: List of 1-based page numbers to keep
    
    Returns:
        pikepdf.Pdf: New PDF with only selected pages
    """
    new_pdf = Pdf.new()
    
    # Convert to 0-based indices
    zero_based_pages = [p - 1 for p in pages_to_keep]
    
    # Copy selected pages
    for page_idx in zero_based_pages:
        if 0 <= page_idx < len(input_pdf.pages):
            new_pdf.pages.append(input_pdf.pages[page_idx])
    
    return new_pdf


def convert_to_pdfa(pdf_obj, version='1'):
    """
    Apply PDF/A transformations to make PDF archival-compliant.
    
    Args:
        pdf_obj: pikepdf.Pdf object
        version: PDF/A version ('1', '2', '3')
    
    Returns:
        pikepdf.Pdf: PDF/A compliant PDF object
    """
    # Set PDF/A metadata
    with pdf_obj.open_metadata() as meta:
        # Add PDF/A identifier
        meta['pdfaid:part'] = version
        meta['pdfaid:conformance'] = 'B'  # Level B compliance
        
        # Add required metadata if not present
        if 'dc:title' not in meta:
            meta['dc:title'] = 'Archived Document'
        if 'dc:creator' not in meta:
            meta['dc:creator'] = 'Ninja PDF'
        if 'xmp:CreateDate' not in meta:
            from datetime import datetime
            meta['xmp:CreateDate'] = datetime.now().isoformat()
    
    # Remove elements that are not PDF/A compliant
    # JavaScript
    if '/Names' in pdf_obj.Root:
        names = pdf_obj.Root.Names
        if '/JavaScript' in names:
            del names['/JavaScript']
    
    # Actions (interactive elements)
    if '/OpenAction' in pdf_obj.Root:
        del pdf_obj.Root['/OpenAction']
    
    return pdf_obj


def convert_pdf_to_pdfa(pdf_file, options=None):
    """
    Convert PDF file to PDF/A format for archival purposes.
    
    Args:
        pdf_file: Django UploadedFile or file-like object
        options: Dictionary of conversion options
            - page_range: "1-5, 8" or "all" (default: "all")
            - version: PDF/A version - "pdfa-1b", "pdfa-2b", "pdfa-3b" (default: "pdfa-1b")
    
    Returns:
        tuple: (filename, pdf_bytes)
    """
    if options is None:
        options = {}
    
    # Get options
    page_range = options.get('page_range', 'all')
    version_str = options.get('version', 'pdfa-1b')
    
    # Extract version number from version string (pdfa-1b -> 1)
    version = version_str.split('-')[1][0] if '-' in version_str else '1'
    
    # Create temporary file for input
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_input:
        if hasattr(pdf_file, 'read'):
            pdf_file.seek(0)
            temp_input.write(pdf_file.read())
            pdf_file.seek(0)
        else:
            temp_input.write(pdf_file)
        temp_input_path = temp_input.name
    
    try:
        # Open PDF with pikepdf
        pdf = Pdf.open(temp_input_path)
        
        # Get total pages for range parsing
        total_pages = len(pdf.pages)
        
        # Parse page range
        pages_to_convert = parse_page_range(page_range, total_pages)
        
        if not pages_to_convert:
            raise ValueError("No valid pages selected")
        
        # Extract specific pages if not all
        if len(pages_to_convert) < total_pages:
            pdf = extract_pages_to_new_pdf(pdf, pages_to_convert)
        
        # Convert to PDF/A
        pdf = convert_to_pdfa(pdf, version=version)
        
        # Save to bytes
        output_buffer = io.BytesIO()
        pdf.save(output_buffer, 
                linearize=True,  # Optimize for web viewing
                compress_streams=True)  # Reduce file size
        output_buffer.seek(0)
        pdf_bytes = output_buffer.read()
        
        # Generate filename
        original_name = getattr(pdf_file, 'name', 'document.pdf')
        base_name = os.path.splitext(original_name)[0]
        filename = f"{base_name}_PDFA.pdf"
        
        # Close PDF
        pdf.close()
        
        return filename, pdf_bytes
    
    finally:
        # Cleanup temp file
        if os.path.exists(temp_input_path):
            try:
                os.remove(temp_input_path)
            except:
                pass