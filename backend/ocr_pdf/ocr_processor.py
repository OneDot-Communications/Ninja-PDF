"""
OCR PDF Text Extraction Module
Extracts embedded text from PDFs using pypdf (similar to pdf.js in Next.js)
No external dependencies like Tesseract required!
"""
from pypdf import PdfReader


def extract_text_from_pdf_pages(input_path):
    """
    Extract text from all pages of a PDF file.
    
    Args:
        input_path (str): Path to the input PDF file
        
    Returns:
        dict: Result containing success status, extracted text, and page info
    """
    try:
        reader = PdfReader(input_path)
        all_text = []
        page_count = len(reader.pages)
        
        for page_num, page in enumerate(reader.pages, start=1):
            try:
                # Extract text from the page
                text = page.extract_text()
                
                if text.strip():
                    all_text.append(f"\n--- Page {page_num} ---\n{text}\n")
                else:
                    all_text.append(f"\n--- Page {page_num} ---\n[No text found]\n")
                    
            except Exception as page_error:
                all_text.append(f"\n--- Page {page_num} ---\n[Error extracting text: {str(page_error)}]\n")
        
        extracted_text = '\n'.join(all_text)
        
        return {
            'success': True,
            'text': extracted_text,
            'page_count': page_count,
            'message': f'Successfully extracted text from {page_count} pages'
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'message': 'Text extraction failed'
        }
