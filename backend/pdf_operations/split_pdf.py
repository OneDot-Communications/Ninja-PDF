import os
from pypdf import PdfReader, PdfWriter

def split_pdf(input_path, output_dir, split_mode='pages', pages=None, ranges=None):
    """
    Split a PDF file into multiple PDFs.
    
    Args:
        input_path (str): Path to the input PDF file
        output_dir (str): Directory where split PDFs will be saved
        split_mode (str): Splitting mode - 'pages', 'ranges', or 'every'
        pages (list): List of page numbers to extract (1-indexed)
        ranges (list): List of page ranges, e.g., [(1,5), (6,10)]
        
    Returns:
        dict: Result with success status and details
        
    Raises:
        FileNotFoundError: If input file doesn't exist
        RuntimeError: If split fails
    """
    
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"File not found: {input_path}")
    
    # Ensure output directory exists
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    split_log = []
    output_files = []
    
    try:
        reader = PdfReader(input_path, strict=False)
        total_pages = len(reader.pages)
        
        split_log.append(f"Input PDF has {total_pages} pages")
        
        base_name = os.path.splitext(os.path.basename(input_path))[0]
        
        if split_mode == 'pages' and pages:
            # Extract specific pages
            split_log.append(f"Extracting {len(pages)} specific pages...")
            
            for page_num in pages:
                if page_num < 1 or page_num > total_pages:
                    split_log.append(f"⚠ Skipping invalid page number: {page_num}")
                    continue
                
                writer = PdfWriter()
                writer.add_page(reader.pages[page_num - 1])  # Convert to 0-indexed
                
                output_file = os.path.join(output_dir, f"{base_name}_page_{page_num}.pdf")
                with open(output_file, 'wb') as f:
                    writer.write(f)
                
                output_files.append(output_file)
                split_log.append(f"✓ Created: {os.path.basename(output_file)}")
        
        elif split_mode == 'ranges' and ranges:
            # Extract page ranges
            split_log.append(f"Extracting {len(ranges)} page ranges...")
            
            for i, (start, end) in enumerate(ranges, 1):
                # Validate range
                start = max(1, min(start, total_pages))
                end = max(start, min(end, total_pages))
                
                writer = PdfWriter()
                
                for page_num in range(start - 1, end):  # Convert to 0-indexed
                    writer.add_page(reader.pages[page_num])
                
                output_file = os.path.join(output_dir, f"{base_name}_pages_{start}-{end}.pdf")
                with open(output_file, 'wb') as f:
                    writer.write(f)
                
                output_files.append(output_file)
                split_log.append(f"✓ Created: {os.path.basename(output_file)} (pages {start}-{end})")
        
        elif split_mode == 'every':
            # Split every page into separate PDFs
            split_log.append(f"Splitting all {total_pages} pages into separate files...")
            
            for page_num in range(total_pages):
                writer = PdfWriter()
                writer.add_page(reader.pages[page_num])
                
                output_file = os.path.join(output_dir, f"{base_name}_page_{page_num + 1}.pdf")
                with open(output_file, 'wb') as f:
                    writer.write(f)
                
                output_files.append(output_file)
            
            split_log.append(f"✓ Created {total_pages} separate PDF files")
        
        else:
            raise ValueError(f"Invalid split mode or missing parameters")
        
        return {
            'success': True,
            'total_pages': total_pages,
            'files_created': len(output_files),
            'message': f'Successfully split PDF into {len(output_files)} files',
            'log': split_log,
            'output_files': output_files
        }
    
    except Exception as e:
        split_log.append(f"✗ Split failed: {str(e)}")
        raise RuntimeError(f"PDF split failed: {str(e)}")


def split_pdf_by_page_count(input_path, output_dir, pages_per_file=1):
    """
    Split a PDF into chunks of specified page count.
    
    Args:
        input_path (str): Path to the input PDF file
        output_dir (str): Directory where split PDFs will be saved
        pages_per_file (int): Number of pages per output file
        
    Returns:
        dict: Result with success status and details
    """
    
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"File not found: {input_path}")
    
    if pages_per_file < 1:
        raise ValueError("pages_per_file must be at least 1")
    
    # Ensure output directory exists
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    split_log = []
    output_files = []
    
    try:
        reader = PdfReader(input_path, strict=False)
        total_pages = len(reader.pages)
        
        split_log.append(f"Input PDF has {total_pages} pages")
        split_log.append(f"Splitting into chunks of {pages_per_file} pages...")
        
        base_name = os.path.splitext(os.path.basename(input_path))[0]
        
        file_num = 1
        for start_page in range(0, total_pages, pages_per_file):
            writer = PdfWriter()
            
            end_page = min(start_page + pages_per_file, total_pages)
            
            for page_num in range(start_page, end_page):
                writer.add_page(reader.pages[page_num])
            
            output_file = os.path.join(output_dir, f"{base_name}_part_{file_num}.pdf")
            with open(output_file, 'wb') as f:
                writer.write(f)
            
            output_files.append(output_file)
            split_log.append(f"✓ Created: {os.path.basename(output_file)} (pages {start_page + 1}-{end_page})")
            file_num += 1
        
        return {
            'success': True,
            'total_pages': total_pages,
            'files_created': len(output_files),
            'pages_per_file': pages_per_file,
            'message': f'Successfully split PDF into {len(output_files)} files',
            'log': split_log,
            'output_files': output_files
        }
    
    except Exception as e:
        split_log.append(f"✗ Split failed: {str(e)}")
        raise RuntimeError(f"PDF split failed: {str(e)}")
