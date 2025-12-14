from celery import shared_task
from django.core.files.storage import default_storage
import os
import tempfile
from .word_pdf.word_to_pdf import convert_word_to_pdf
import logging

logger = logging.getLogger(__name__)

@shared_task
def convert_word_to_pdf_task(file_path):
    """
    Async task to convert Word to PDF.
    file_path: Relative path in default storage (local or S3).
    Returns: Dict with status and output_url.
    """
    tmp_input_path = None
    tmp_output_path = None
    
    try:
        # 1. Download/Open from Storage
        with tempfile.NamedTemporaryFile(delete=False) as tmp_input:
            with default_storage.open(file_path, 'rb') as f:
                tmp_input.write(f.read())
            tmp_input_path = tmp_input.name
        
        tmp_output_path = tmp_input_path + '.pdf'
        
        # 2. Convert
        # Note: convert_word_to_pdf likely shells out to LibreOffice.
        # Ensure LibreOffice is installed in the worker environment.
        convert_word_to_pdf(tmp_input_path, tmp_output_path)
        
        # 3. Upload Result
        output_storage_path = file_path.replace('.docx', '.pdf').replace('.doc', '.pdf')
        if output_storage_path == file_path:
             output_storage_path += '.pdf'
             
        # If using S3, we save the bytes
        with open(tmp_output_path, 'rb') as f:
            default_storage.save(output_storage_path, f)
            
        # 4. Get URL
        output_url = default_storage.url(output_storage_path)
        
        return {
            'status': 'success', 
            'output_url': output_url,
            'output_path': output_storage_path
        }
        
    except Exception as e:
        logger.error(f"Task Failed: {e}", exc_info=True)
        return {'status': 'failed', 'error': str(e)}
    finally:
        if tmp_output_path and os.path.exists(tmp_output_path): 
            try: os.unlink(tmp_output_path)
            except: pass

@shared_task
def convert_document_task(file_path, conversion_type):
    """
    Generic async task for document conversion.
    conversion_type: 'word', 'excel', 'powerpoint', 'jpg', 'html', 'markdown'
    """
    from .excel_pdf.excel_to_pdf import convert_excel_to_pdf
    from .powerpoint_pdf.powerpoint_to_pdf import convert_powerpoint_to_pdf
    from .jpg_pdf.jpg_to_pdf import convert_jpg_to_pdf
    from .html_pdf.html_to_pdf import convert_html_to_pdf
    from .markdown_pdf.markdown_to_pdf import convert_markdown_to_pdf
    # word is handled separately or can be merged here
    
    converters = {
        'excel': convert_excel_to_pdf,
        'powerpoint': convert_powerpoint_to_pdf,
        'jpg': convert_jpg_to_pdf,
        'html': convert_html_to_pdf,
        'markdown': convert_markdown_to_pdf
    }
    
    converter = converters.get(conversion_type)
    if not converter:
        return {'status': 'failed', 'error': f'Unknown conversion type: {conversion_type}'}

    tmp_input_path = None
    tmp_output_path = None
    
    try:
        # 1. Download/Open
        with tempfile.NamedTemporaryFile(delete=False) as tmp_input:
            with default_storage.open(file_path, 'rb') as f:
                tmp_input.write(f.read())
            tmp_input_path = tmp_input.name
        
        tmp_output_path = tmp_input_path + '.pdf'
        
        # 2. Convert
        converter(tmp_input_path, tmp_output_path)
        
        # 3. Upload Result
        # Handle extension replacement logic
        base_name = os.path.basename(file_path)
        name_no_ext = os.path.splitext(base_name)[0]
        output_storage_path = os.path.join(os.path.dirname(file_path), name_no_ext + '.pdf')
             
        with open(tmp_output_path, 'rb') as f:
            default_storage.save(output_storage_path, f)
            
        # 4. Get URL
        output_url = default_storage.url(output_storage_path)
        
        return {
            'status': 'success', 
            'output_url': output_url,
            'output_path': output_storage_path
        }
        
    except Exception as e:
        logger.error(f"Task Failed ({conversion_type}): {e}", exc_info=True)
        return {'status': 'failed', 'error': str(e)}
    finally:
        if tmp_input_path and os.path.exists(tmp_input_path): 
            try: os.unlink(tmp_input_path)
            except: pass
        if tmp_output_path and os.path.exists(tmp_output_path): 
            try: os.unlink(tmp_output_path)
            except: pass
