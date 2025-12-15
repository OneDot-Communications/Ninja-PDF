"""
PDF Merge Tool
Pure transformation - no Django, no DB.
"""
import logging

logger = logging.getLogger(__name__)


def merge(input_paths: list, output_path: str, **parameters) -> dict:
    """
    Merge multiple PDFs into one.
    
    Args:
        input_paths: List of paths to input PDFs
        output_path: Path for merged PDF
        
    Returns:
        dict: {success, page_count, files_merged}
    """
    try:
        import pikepdf
        
        merged = pikepdf.Pdf.new()
        total_pages = 0
        
        for path in input_paths:
            with pikepdf.open(path) as pdf:
                merged.pages.extend(pdf.pages)
                total_pages += len(pdf.pages)
        
        merged.save(output_path)
        
        logger.info(f"Merged {len(input_paths)} PDFs: {total_pages} pages")
        
        return {
            'success': True,
            'page_count': total_pages,
            'files_merged': len(input_paths),
        }
        
    except Exception as e:
        logger.error(f"Merge failed: {e}")
        return {'success': False, 'message': str(e)}


def split(input_path: str, output_dir: str, mode: str = 'all', pages: str = None, **parameters) -> dict:
    """
    Split PDF into individual pages or ranges.
    
    Args:
        input_path: Path to input PDF
        output_dir: Directory for output PDFs
        mode: 'all' (each page), 'range' (specific range)
        pages: Page specification (e.g., "1-5,8,10-12")
        
    Returns:
        dict: {success, files_created}
    """
    import os
    
    try:
        import pikepdf
        
        with pikepdf.open(input_path) as pdf:
            total = len(pdf.pages)
            files_created = []
            
            if mode == 'all':
                page_list = range(total)
            else:
                page_list = _parse_page_spec(pages, total)
            
            for i, page_idx in enumerate(page_list):
                output_pdf = pikepdf.Pdf.new()
                output_pdf.pages.append(pdf.pages[page_idx])
                
                output_path = os.path.join(output_dir, f'page_{page_idx + 1}.pdf')
                output_pdf.save(output_path)
                files_created.append(output_path)
        
        logger.info(f"Split PDF: {len(files_created)} files")
        
        return {
            'success': True,
            'files_created': len(files_created),
            'output_paths': files_created,
        }
        
    except Exception as e:
        logger.error(f"Split failed: {e}")
        return {'success': False, 'message': str(e)}


def _parse_page_spec(spec: str, total: int) -> list:
    """Parse page specification like '1-5,8,10-12'."""
    pages = []
    if not spec:
        return list(range(total))
    
    for part in spec.split(','):
        part = part.strip()
        if '-' in part:
            start, end = part.split('-')
            pages.extend(range(int(start) - 1, int(end)))
        else:
            pages.append(int(part) - 1)
    
    return [p for p in pages if 0 <= p < total]
