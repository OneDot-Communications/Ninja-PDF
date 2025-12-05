# pdf_to_word.py
"""
PDF to Word conversion module.
Handles conversion of PDF files to Microsoft Word format (.docx) using pdf2docx.
"""

import os
import tempfile
import io
from pdf2docx import Converter
import fitz  # PyMuPDF

def parse_page_range(page_range, total_pages):
    """
    Parse page range string and return list of 0-based page indices.
    Example: "1,3-5" -> [0, 2, 3, 4]
    """
    if not page_range or page_range.lower() == 'all':
        return None  # None means all pages in pdf2docx

    pages = set()
    parts = page_range.split(',')
    
    for part in parts:
        part = part.strip()
        if '-' in part:
            try:
                start, end = map(int, part.split('-'))
                # Adjust to 0-based, inclusive
                start = max(1, start) - 1
                end = min(total_pages, end) - 1
                for i in range(start, end + 1):
                    pages.add(i)
            except ValueError:
                continue
        else:
            try:
                page = int(part)
                if 1 <= page <= total_pages:
                    pages.add(page - 1)
            except ValueError:
                continue
                
    return sorted(list(pages))

def convert_pdf_to_word(pdf_file, options=None):
    """
    Convert PDF file to Word document.
    
    Args:
        pdf_file: Django UploadedFile or file-like object
        options: Dictionary of conversion options
            - page_range: "1-5, 8" or "all"
        
    Returns:
        tuple: (filename, file_bytes)
    """
    if options is None:
        options = {}

    # Create temporary files
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_pdf:
        # Write uploaded file to temp file
        if hasattr(pdf_file, 'read'):
            pdf_file.seek(0)
            temp_pdf.write(pdf_file.read())
        else:
            # Assume it's bytes
            temp_pdf.write(pdf_file)
        temp_pdf_path = temp_pdf.name

    temp_docx_path = temp_pdf_path.replace('.pdf', '.docx')

    try:
        # Get total pages for range parsing
        doc = fitz.open(temp_pdf_path)
        total_pages = doc.page_count
        doc.close()

        # Parse page range
        page_range = options.get('page_range', 'all')
        pages = parse_page_range(page_range, total_pages)

        # Convert
        cv = Converter(temp_pdf_path)
        
        # pdf2docx convert method:
        # pages: list of page indices (0-based). If None, converts all.
        cv.convert(temp_docx_path, pages=pages)
        cv.close()

        # Read result
        with open(temp_docx_path, 'rb') as f:
            docx_bytes = f.read()

        # Generate filename
        original_name = getattr(pdf_file, 'name', 'document.pdf')
        filename = os.path.splitext(original_name)[0] + '.docx'

        return filename, docx_bytes

    finally:
        # Cleanup temp files
        if os.path.exists(temp_pdf_path):
            try:
                os.remove(temp_pdf_path)
            except:
                pass
        if os.path.exists(temp_docx_path):
            try:
                os.remove(temp_docx_path)
            except:
                pass