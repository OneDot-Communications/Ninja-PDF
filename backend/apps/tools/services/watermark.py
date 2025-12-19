"""
Watermark Service for Free Tier Users

Adds watermarks to PDFs processed by free tier users.
Premium users bypass this.
"""
import io
import logging
import fitz  # PyMuPDF

logger = logging.getLogger(__name__)


class WatermarkService:
    """
    Adds watermarks to PDF documents.
    Used to mark PDFs processed by free tier users.
    """
    
    DEFAULT_TEXT = "Created with NinjaPDF - Free Tier"
    DEFAULT_FONT_SIZE = 40
    DEFAULT_OPACITY = 0.3
    DEFAULT_ANGLE = 45  # Diagonal
    DEFAULT_COLOR = (0.7, 0.7, 0.7)  # Light gray
    
    @classmethod
    def add_watermark(
        cls,
        pdf_bytes: bytes,
        text: str = None,
        font_size: int = None,
        opacity: float = None,
        color: tuple = None,
        angle: int = None,
    ) -> bytes:
        """
        Add a watermark to all pages of a PDF.
        
        Args:
            pdf_bytes: PDF content as bytes
            text: Watermark text (default: "Created with NinjaPDF - Free Tier")
            font_size: Font size (default: 40)
            opacity: Transparency 0.0-1.0 (default: 0.3)
            color: RGB tuple 0.0-1.0 (default: light gray)
            angle: Rotation angle in degrees (default: 45)
        
        Returns:
            Watermarked PDF as bytes
        """
        text = text or cls.DEFAULT_TEXT
        font_size = font_size or cls.DEFAULT_FONT_SIZE
        opacity = opacity or cls.DEFAULT_OPACITY
        color = color or cls.DEFAULT_COLOR
        angle = angle or cls.DEFAULT_ANGLE
        
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            
            for page in doc:
                rect = page.rect
                
                # Calculate center position
                center_x = rect.width / 2
                center_y = rect.height / 2
                
                # Create rotation matrix
                import math
                rad = math.radians(angle)
                
                # Insert text with rotation
                # Using shape for more control
                text_width = len(text) * font_size * 0.5  # Approximate
                
                # Position for diagonal watermark
                point = fitz.Point(
                    center_x - text_width / 2,
                    center_y
                )
                
                # Add invisible watermark text (render mode 3 = invisible but selectable)
                # For visible watermark, use render mode 0
                page.insert_text(
                    point,
                    text,
                    fontsize=font_size,
                    color=color,
                    rotate=angle,
                    overlay=True,
                    render_mode=0,  # Visible, filled
                )
            
            # Save to bytes
            output = io.BytesIO()
            doc.save(output)
            doc.close()
            output.seek(0)
            
            return output.read()
            
        except Exception as e:
            logger.error(f"Watermark failed: {e}")
            # Return original if watermarking fails
            return pdf_bytes
    
    @classmethod
    def add_corner_watermark(
        cls,
        pdf_bytes: bytes,
        text: str = None,
        position: str = "bottom-right",
        font_size: int = 10,
    ) -> bytes:
        """
        Add a small watermark in the corner of each page.
        
        Args:
            pdf_bytes: PDF content as bytes
            text: Watermark text
            position: bottom-right, bottom-left, top-right, top-left
            font_size: Font size (default: 10)
        
        Returns:
            Watermarked PDF as bytes
        """
        text = text or "NinjaPDF Free"
        
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            
            for page in doc:
                rect = page.rect
                margin = 20
                
                # Calculate position
                if position == "bottom-right":
                    x = rect.width - margin - len(text) * font_size * 0.5
                    y = rect.height - margin
                elif position == "bottom-left":
                    x = margin
                    y = rect.height - margin
                elif position == "top-right":
                    x = rect.width - margin - len(text) * font_size * 0.5
                    y = margin + font_size
                else:  # top-left
                    x = margin
                    y = margin + font_size
                
                page.insert_text(
                    fitz.Point(x, y),
                    text,
                    fontsize=font_size,
                    color=(0.5, 0.5, 0.5),
                    overlay=True,
                )
            
            output = io.BytesIO()
            doc.save(output)
            doc.close()
            output.seek(0)
            
            return output.read()
            
        except Exception as e:
            logger.error(f"Corner watermark failed: {e}")
            return pdf_bytes
    
    @classmethod
    def should_add_watermark(cls, user) -> bool:
        """
        Determine if watermark should be added for this user.
        
        Args:
            user: User instance
        
        Returns:
            True if watermark should be added
        """
        if not user or not user.is_authenticated:
            # Always watermark anonymous users
            return True
        
        # Don't watermark premium users
        if hasattr(user, 'is_premium') and user.is_premium:
            return False
        
        # Don't watermark admins
        if hasattr(user, 'is_admin') and user.is_admin:
            return False
        
        # Watermark free tier users
        return user.subscription_tier == 'FREE'
    
    @classmethod
    def process_with_watermark(cls, pdf_bytes: bytes, user) -> bytes:
        """
        Convenience method to conditionally add watermark.
        
        Args:
            pdf_bytes: PDF content
            user: User making the request
        
        Returns:
            PDF bytes (with or without watermark)
        """
        if cls.should_add_watermark(user):
            return cls.add_corner_watermark(pdf_bytes)
        return pdf_bytes


def add_watermark_to_output(pdf_bytes: bytes, user) -> bytes:
    """
    Convenience function for adding watermark to tool output.
    
    Args:
        pdf_bytes: Output PDF from a tool
        user: Request user
    
    Returns:
        PDF with watermark if user is free tier
    """
    return WatermarkService.process_with_watermark(pdf_bytes, user)
