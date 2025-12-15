"""
Tool Registry & Definitions
Defines available PDF tools with input/output schemas.
"""
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


@dataclass
class ToolDefinition:
    """
    Defines a PDF processing tool with complete schema.
    Tools are UI/Billing blind - they only know input requirements.
    """
    id: str
    name: str
    category: str
    
    input_mime_types: List[str] = field(default_factory=list)
    max_input_size_bytes: int = 50 * 1024 * 1024
    
    output_mime_type: str = 'application/pdf'
    output_extension: str = '.pdf'
    
    worker_class: Optional[str] = None
    
    requires_pdf_input: bool = False
    requires_page_count: bool = False
    max_pages: int = -1
    
    generate_preview: bool = True
    
    is_premium: bool = False
    is_ai: bool = False
    
    description: str = ''
    icon: str = 'file-text'
    
    parameters_schema: Dict[str, Any] = field(default_factory=dict)
    
    def can_process(self, input_mime: str, input_size: int, page_count: int = None) -> tuple:
        """
        Check if tool can process given input.
        Returns (can_process: bool, reason: str)
        """
        if input_mime not in self.input_mime_types:
            return False, f"Unsupported file type: {input_mime}"
        
        if input_size > self.max_input_size_bytes:
            max_mb = self.max_input_size_bytes / (1024 * 1024)
            return False, f"File too large. Maximum: {max_mb:.0f}MB"
        
        if self.max_pages != -1 and page_count and page_count > self.max_pages:
            return False, f"Too many pages. Maximum: {self.max_pages}"
        
        return True, "OK"
    
    def validate_parameters(self, params: dict) -> tuple:
        """
        Validate tool parameters against schema.
        Returns (valid: bool, errors: list)
        """
        errors = []
        
        for key, schema in self.parameters_schema.items():
            if schema.get('required') and key not in params:
                errors.append(f"Missing required parameter: {key}")
                continue
            
            if key in params:
                value = params[key]
                expected_type = schema.get('type')
                
                type_map = {'string': str, 'integer': int, 'boolean': bool, 'array': list}
                if expected_type and not isinstance(value, type_map.get(expected_type, object)):
                    errors.append(f"Invalid type for {key}")
        
        return len(errors) == 0, errors


class ToolRegistry:
    """Central registry for all available tools."""
    
    _tools: Dict[str, ToolDefinition] = {}
    _initialized: bool = False
    
    @classmethod
    def register(cls, tool: ToolDefinition):
        """Register a tool."""
        cls._tools[tool.id] = tool
        logger.info(f"Tool registered: {tool.id}")
    
    @classmethod
    def get(cls, tool_id: str) -> Optional[ToolDefinition]:
        """Get tool by ID."""
        cls._ensure_initialized()
        return cls._tools.get(tool_id)
    
    @classmethod
    def list_all(cls) -> List[ToolDefinition]:
        """Get all registered tools."""
        cls._ensure_initialized()
        return list(cls._tools.values())
    
    @classmethod
    def list_by_category(cls, category: str) -> List[ToolDefinition]:
        """Get tools by category."""
        cls._ensure_initialized()
        return [t for t in cls._tools.values() if t.category == category]
    
    @classmethod
    def get_categories(cls) -> List[str]:
        """Get all unique categories."""
        cls._ensure_initialized()
        return list(set(t.category for t in cls._tools.values()))
    
    @classmethod
    def _ensure_initialized(cls):
        """Initialize core tools if not already done."""
        if not cls._initialized:
            cls._init_core_tools()
            cls._initialized = True
    
    @classmethod
    def _init_core_tools(cls):
        """Register all core PDF tools."""
        
        pdf_types = ['application/pdf']
        doc_types = [
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
        excel_types = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ]
        ppt_types = [
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        ]
        image_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        
        tools = [
            ToolDefinition(id='WORD_TO_PDF', name='Word to PDF', category='conversion', input_mime_types=doc_types, description='Convert Word documents to PDF', icon='file-word'),
            ToolDefinition(id='EXCEL_TO_PDF', name='Excel to PDF', category='conversion', input_mime_types=excel_types, description='Convert Excel spreadsheets to PDF', icon='file-excel'),
            ToolDefinition(id='PPT_TO_PDF', name='PowerPoint to PDF', category='conversion', input_mime_types=ppt_types, description='Convert presentations to PDF', icon='file-powerpoint'),
            ToolDefinition(id='IMAGE_TO_PDF', name='Image to PDF', category='conversion', input_mime_types=image_types, description='Convert images to PDF', icon='image'),
            ToolDefinition(id='PDF_TO_WORD', name='PDF to Word', category='conversion', input_mime_types=pdf_types, requires_pdf_input=True, output_mime_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document', output_extension='.docx', description='Convert PDF to editable Word', icon='file-word'),
            ToolDefinition(id='PDF_TO_EXCEL', name='PDF to Excel', category='conversion', input_mime_types=pdf_types, requires_pdf_input=True, output_mime_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', output_extension='.xlsx', description='Convert PDF tables to Excel', icon='file-excel'),
            ToolDefinition(id='PDF_TO_IMAGE', name='PDF to Image', category='conversion', input_mime_types=pdf_types, requires_pdf_input=True, output_mime_type='application/zip', output_extension='.zip', description='Convert PDF pages to images', icon='image'),
            
            ToolDefinition(id='COMPRESS_PDF', name='Compress PDF', category='compression', input_mime_types=pdf_types, requires_pdf_input=True, description='Reduce PDF file size', icon='compress', parameters_schema={'level': {'type': 'string', 'enum': ['low', 'medium', 'high'], 'default': 'medium'}}),
            
            ToolDefinition(id='MERGE_PDF', name='Merge PDFs', category='editing', input_mime_types=pdf_types, requires_pdf_input=True, description='Combine multiple PDFs', icon='object-group'),
            ToolDefinition(id='SPLIT_PDF', name='Split PDF', category='editing', input_mime_types=pdf_types, requires_pdf_input=True, description='Split PDF into pages', icon='object-ungroup', requires_page_count=True, parameters_schema={'mode': {'type': 'string', 'enum': ['all', 'range', 'custom']}, 'pages': {'type': 'string'}}),
            ToolDefinition(id='ROTATE_PDF', name='Rotate PDF', category='editing', input_mime_types=pdf_types, requires_pdf_input=True, description='Rotate PDF pages', icon='rotate-right', parameters_schema={'angle': {'type': 'integer', 'enum': [90, 180, 270], 'required': True}}),
            ToolDefinition(id='DELETE_PAGES', name='Delete Pages', category='editing', input_mime_types=pdf_types, requires_pdf_input=True, description='Remove pages from PDF', icon='trash', requires_page_count=True, parameters_schema={'pages': {'type': 'string', 'required': True}}),
            ToolDefinition(id='REORDER_PAGES', name='Reorder Pages', category='editing', input_mime_types=pdf_types, requires_pdf_input=True, description='Rearrange PDF pages', icon='sort', parameters_schema={'order': {'type': 'array', 'required': True}}),
            ToolDefinition(id='WATERMARK', name='Add Watermark', category='editing', input_mime_types=pdf_types, requires_pdf_input=True, description='Add watermark to PDF', icon='tint', parameters_schema={'text': {'type': 'string'}, 'image_path': {'type': 'string'}, 'position': {'type': 'string'}, 'opacity': {'type': 'number'}}),
            ToolDefinition(id='ADD_PAGE_NUMBERS', name='Add Page Numbers', category='editing', input_mime_types=pdf_types, requires_pdf_input=True, description='Add page numbers to PDF', icon='sort-numeric-up', parameters_schema={'position': {'type': 'string', 'enum': ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'], 'default': 'bottom-center'}}),
            
            ToolDefinition(id='ENCRYPT_PDF', name='Protect PDF', category='security', input_mime_types=pdf_types, requires_pdf_input=True, is_premium=True, description='Add password protection', icon='lock', parameters_schema={'password': {'type': 'string', 'required': True}, 'permissions': {'type': 'object'}}),
            ToolDefinition(id='DECRYPT_PDF', name='Unlock PDF', category='security', input_mime_types=pdf_types, requires_pdf_input=True, description='Remove password protection', icon='unlock', parameters_schema={'password': {'type': 'string', 'required': True}}),
            ToolDefinition(id='REDACT_PDF', name='Redact PDF', category='security', input_mime_types=pdf_types, requires_pdf_input=True, is_premium=True, description='Permanently remove sensitive content', icon='eraser', parameters_schema={'areas': {'type': 'array', 'required': True}}),
            ToolDefinition(id='SIGN_PDF', name='Sign PDF', category='security', input_mime_types=pdf_types, requires_pdf_input=True, description='Add digital signature', icon='signature'),
            
            ToolDefinition(id='OCR_PDF', name='OCR', category='ai', input_mime_types=pdf_types, requires_pdf_input=True, is_premium=True, is_ai=True, description='Extract text from scanned PDFs', icon='text', timeout_seconds=600, parameters_schema={'language': {'type': 'string', 'default': 'eng'}, 'deskew': {'type': 'boolean', 'default': True}}),
            ToolDefinition(id='SUMMARIZE_PDF', name='Summarize', category='ai', input_mime_types=pdf_types, requires_pdf_input=True, is_premium=True, is_ai=True, description='AI-powered document summary', icon='brain', max_pages=100),
            ToolDefinition(id='TRANSLATE_PDF', name='Translate', category='ai', input_mime_types=pdf_types, requires_pdf_input=True, is_premium=True, is_ai=True, description='Translate PDF content', icon='language', parameters_schema={'target_language': {'type': 'string', 'required': True}}),
            
            ToolDefinition(id='REPAIR_PDF', name='Repair PDF', category='repair', input_mime_types=pdf_types, description='Fix corrupted PDFs', icon='wrench'),
        ]
        
        for tool in tools:
            cls.register(tool)


def get_tool(tool_id: str) -> Optional[ToolDefinition]:
    """Convenience function."""
    return ToolRegistry.get(tool_id)


def register_tool(tool: ToolDefinition):
    """Convenience function."""
    return ToolRegistry.register(tool)
