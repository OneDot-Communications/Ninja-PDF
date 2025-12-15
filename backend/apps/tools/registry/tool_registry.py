"""
Tool Registry
Central registry for all PDF processing tools.
"""
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


@dataclass
class ToolDefinition:
    """Defines a PDF processing tool with complete schema."""
    id: str
    name: str
    category: str
    
    input_mime_types: List[str] = field(default_factory=list)
    max_input_size_bytes: int = 50 * 1024 * 1024
    
    output_mime_type: str = 'application/pdf'
    output_extension: str = '.pdf'
    
    worker_module: Optional[str] = None
    
    requires_pdf_input: bool = False
    max_pages: int = -1
    
    generate_preview: bool = True
    
    is_premium: bool = False
    is_ai: bool = False
    
    description: str = ''
    icon: str = 'file-text'
    
    parameters_schema: Dict[str, Any] = field(default_factory=dict)
    
    def can_process(self, input_mime: str, input_size: int, page_count: int = None) -> tuple:
        if input_mime not in self.input_mime_types:
            return False, f"Unsupported type: {input_mime}"
        if input_size > self.max_input_size_bytes:
            return False, f"File too large"
        if self.max_pages != -1 and page_count and page_count > self.max_pages:
            return False, f"Too many pages (max: {self.max_pages})"
        return True, "OK"


class ToolRegistry:
    """Central registry for all tools."""
    
    _tools: Dict[str, ToolDefinition] = {}
    _initialized: bool = False
    
    @classmethod
    def register(cls, tool: ToolDefinition):
        cls._tools[tool.id] = tool
        logger.info(f"Tool registered: {tool.id}")
    
    @classmethod
    def get(cls, tool_id: str) -> Optional[ToolDefinition]:
        cls._ensure_initialized()
        return cls._tools.get(tool_id)
    
    @classmethod
    def list_all(cls) -> List[ToolDefinition]:
        cls._ensure_initialized()
        return list(cls._tools.values())
    
    @classmethod
    def list_by_category(cls, category: str) -> List[ToolDefinition]:
        cls._ensure_initialized()
        return [t for t in cls._tools.values() if t.category == category]
    
    @classmethod
    def get_categories(cls) -> List[str]:
        cls._ensure_initialized()
        return list(set(t.category for t in cls._tools.values()))
    
    @classmethod
    def _ensure_initialized(cls):
        if not cls._initialized:
            cls._init_tools()
            cls._initialized = True
    
    @classmethod
    def _init_tools(cls):
        """Register all core tools."""
        pdf = ['application/pdf']
        doc = ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        xlsx = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
        pptx = ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
        img = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        
        tools_list = [
            # Converters - To PDF
            ToolDefinition(id='WORD_TO_PDF', name='Word to PDF', category='converters', input_mime_types=doc, worker_module='apps.tools.converters.word_to_pdf', description='Convert Word to PDF', icon='file-word'),
            ToolDefinition(id='EXCEL_TO_PDF', name='Excel to PDF', category='converters', input_mime_types=xlsx, worker_module='apps.tools.converters.excel_to_pdf', description='Convert Excel to PDF', icon='file-excel'),
            ToolDefinition(id='PPT_TO_PDF', name='PowerPoint to PDF', category='converters', input_mime_types=pptx, worker_module='apps.tools.converters.ppt_to_pdf', description='Convert PowerPoint to PDF', icon='file-powerpoint'),
            ToolDefinition(id='IMAGE_TO_PDF', name='Image to PDF', category='converters', input_mime_types=img, worker_module='apps.tools.converters.image_to_pdf', description='Convert images to PDF', icon='image'),
            ToolDefinition(id='HTML_TO_PDF', name='HTML to PDF', category='converters', input_mime_types=['text/html'], worker_module='apps.tools.converters.html_to_pdf', description='Convert HTML to PDF', icon='code'),
            
            # Converters - From PDF  
            ToolDefinition(id='PDF_TO_WORD', name='PDF to Word', category='converters', input_mime_types=pdf, requires_pdf_input=True, output_mime_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document', output_extension='.docx', worker_module='apps.tools.converters.pdf_to_word', description='Convert PDF to Word', icon='file-word'),
            ToolDefinition(id='PDF_TO_EXCEL', name='PDF to Excel', category='converters', input_mime_types=pdf, requires_pdf_input=True, output_mime_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', output_extension='.xlsx', worker_module='apps.tools.converters.pdf_to_excel', description='Convert PDF to Excel', icon='file-excel'),
            ToolDefinition(id='PDF_TO_IMAGE', name='PDF to Image', category='converters', input_mime_types=pdf, requires_pdf_input=True, output_mime_type='application/zip', output_extension='.zip', worker_module='apps.tools.converters.pdf_to_image', description='Convert PDF to images', icon='image'),
            
            # Optimizers
            ToolDefinition(id='COMPRESS_PDF', name='Compress PDF', category='optimizers', input_mime_types=pdf, requires_pdf_input=True, worker_module='apps.tools.optimizers.compress', description='Reduce file size', icon='compress', parameters_schema={'level': {'type': 'string', 'enum': ['low', 'medium', 'high'], 'default': 'medium'}}),
            
            # Editors
            ToolDefinition(id='MERGE_PDF', name='Merge PDFs', category='editors', input_mime_types=pdf, requires_pdf_input=True, worker_module='apps.tools.editors.merge', description='Combine PDFs', icon='object-group'),
            ToolDefinition(id='SPLIT_PDF', name='Split PDF', category='editors', input_mime_types=pdf, requires_pdf_input=True, worker_module='apps.tools.editors.split', description='Split PDF', icon='object-ungroup'),
            ToolDefinition(id='ROTATE_PDF', name='Rotate PDF', category='editors', input_mime_types=pdf, requires_pdf_input=True, worker_module='apps.tools.editors.rotate', description='Rotate pages', icon='rotate-right'),
            ToolDefinition(id='DELETE_PAGES', name='Delete Pages', category='editors', input_mime_types=pdf, requires_pdf_input=True, worker_module='apps.tools.editors.delete_pages', description='Remove pages', icon='trash'),
            ToolDefinition(id='REORDER_PAGES', name='Reorder Pages', category='editors', input_mime_types=pdf, requires_pdf_input=True, worker_module='apps.tools.editors.reorder', description='Rearrange pages', icon='sort'),
            ToolDefinition(id='WATERMARK', name='Add Watermark', category='editors', input_mime_types=pdf, requires_pdf_input=True, worker_module='apps.tools.editors.watermark', description='Add watermark', icon='tint'),
            ToolDefinition(id='PAGE_NUMBERS', name='Add Page Numbers', category='editors', input_mime_types=pdf, requires_pdf_input=True, worker_module='apps.tools.editors.page_numbers', description='Add page numbers', icon='sort-numeric-up'),
            
            # Security
            ToolDefinition(id='ENCRYPT_PDF', name='Protect PDF', category='security', input_mime_types=pdf, requires_pdf_input=True, is_premium=True, worker_module='apps.tools.security.protect', description='Password protect', icon='lock'),
            ToolDefinition(id='DECRYPT_PDF', name='Unlock PDF', category='security', input_mime_types=pdf, requires_pdf_input=True, worker_module='apps.tools.security.unlock', description='Remove password', icon='unlock'),
            ToolDefinition(id='SIGN_PDF', name='Sign PDF', category='security', input_mime_types=pdf, requires_pdf_input=True, worker_module='apps.tools.security.sign', description='Digital signature', icon='signature'),
            ToolDefinition(id='REDACT_PDF', name='Redact PDF', category='security', input_mime_types=pdf, requires_pdf_input=True, is_premium=True, worker_module='apps.tools.security.redact', description='Redact content', icon='eraser'),
            
            # AI
            ToolDefinition(id='OCR_PDF', name='OCR', category='ai', input_mime_types=pdf, requires_pdf_input=True, is_premium=True, is_ai=True, worker_module='apps.tools.ai.ocr', description='Extract text with OCR', icon='text'),
            ToolDefinition(id='SUMMARIZE_PDF', name='Summarize', category='ai', input_mime_types=pdf, requires_pdf_input=True, is_premium=True, is_ai=True, worker_module='apps.tools.ai.summarize', description='AI summary', icon='brain'),
            
            # Repair
            ToolDefinition(id='REPAIR_PDF', name='Repair PDF', category='repair', input_mime_types=pdf, requires_pdf_input=True, worker_module='apps.tools.repair.repair', description='Fix corrupted PDF', icon='wrench'),
        ]
        
        for tool in tools_list:
            cls.register(tool)


def get_tool(tool_id: str) -> Optional[ToolDefinition]:
    return ToolRegistry.get(tool_id)
