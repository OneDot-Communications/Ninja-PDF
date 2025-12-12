import os
from pypdf import PdfReader, PdfWriter

def merge_pdfs(pdf_files, output_path):
    """
    Merge multiple PDF files into a single PDF.
    
    Args:
        pdf_files (list): List of file paths to PDF files
        output_path (str): Path where the merged PDF will be saved
        
    Returns:
        dict: Result with success status and details
        
    Raises:
        FileNotFoundError: If any input file doesn't exist
        RuntimeError: If merge fails
    """
    
    if not pdf_files:
        raise ValueError("No PDF files provided")
    
    if len(pdf_files) < 2:
        raise ValueError("At least 2 PDF files are required for merging")
    
    # Validate all files exist
    for pdf_file in pdf_files:
        if not os.path.exists(pdf_file):
            raise FileNotFoundError(f"File not found: {pdf_file}")
    
    # Ensure output directory exists
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    merge_log = []
    
    try:
        merger = PdfWriter()
        total_pages = 0
        
        merge_log.append(f"Starting merge of {len(pdf_files)} PDF files...")
        
        for i, pdf_file in enumerate(pdf_files, 1):
            try:
                reader = PdfReader(pdf_file, strict=False)
                num_pages = len(reader.pages)
                
                merge_log.append(f"✓ File {i}: {os.path.basename(pdf_file)} ({num_pages} pages)")
                
                # Add all pages from this PDF
                for page in reader.pages:
                    merger.add_page(page)
                
                total_pages += num_pages
                
            except Exception as e:
                merge_log.append(f"✗ Failed to process file {i}: {str(e)}")
                raise RuntimeError(f"Failed to process {os.path.basename(pdf_file)}: {str(e)}")
        
        # Write merged PDF
        with open(output_path, 'wb') as output_file:
            merger.write(output_file)
        
        merge_log.append(f"✓ Successfully merged {len(pdf_files)} files into {total_pages} pages")
        
        return {
            'success': True,
            'total_files': len(pdf_files),
            'total_pages': total_pages,
            'message': f'Successfully merged {len(pdf_files)} PDF files',
            'log': merge_log,
            'output_path': output_path
        }
    
    except Exception as e:
        merge_log.append(f"✗ Merge failed: {str(e)}")
        raise RuntimeError(f"PDF merge failed: {str(e)}")


def get_pdf_info(pdf_path):
    """
    Get information about a PDF file.
    
    Args:
        pdf_path (str): Path to the PDF file
        
    Returns:
        dict: PDF information
    """
    
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"File not found: {pdf_path}")
    
    try:
        reader = PdfReader(pdf_path, strict=False)
        
        return {
            'pages': len(reader.pages),
            'is_encrypted': reader.is_encrypted,
            'metadata': dict(reader.metadata) if reader.metadata else {}
        }
    
    except Exception as e:
        raise RuntimeError(f"Failed to read PDF info: {str(e)}")
