"""
Compare PDF Module
Compare two PDF files and highlight differences
"""
from pypdf import PdfReader
import fitz  # PyMuPDF
from PIL import Image
import io


def compare_pdfs(pdf1_path, pdf2_path, output_path):
    """
    Compare two PDF files and create a visual comparison.
    
    Args:
        pdf1_path: Path to first PDF
        pdf2_path: Path to second PDF
        output_path: Path to save comparison result
        
    Returns:
        dict: Result with comparison info
    """
    try:
        # Open both PDFs with PyMuPDF for rendering
        doc1 = fitz.open(pdf1_path)
        doc2 = fitz.open(pdf2_path)
        
        # Get page counts
        pages1 = len(doc1)
        pages2 = len(doc2)
        max_pages = max(pages1, pages2)
        
        # Create output PDF
        output_doc = fitz.open()
        
        differences = []
        
        for page_num in range(max_pages):
            # Create a new page in output for comparison
            output_page = output_doc.new_page(width=595*2 + 30, height=842)
            
            # Add page from first PDF
            if page_num < pages1:
                page1 = doc1[page_num]
                pix1 = page1.get_pixmap(matrix=fitz.Matrix(1, 1))
                img1_bytes = pix1.tobytes("png")
                output_page.insert_image(fitz.Rect(10, 10, 595+10, 842+10), stream=img1_bytes)
                
                # Add label
                output_page.insert_text((10, 830), "Document 1", fontsize=10, color=(0, 0, 1))
            else:
                # No page in first PDF
                output_page.draw_rect(fitz.Rect(10, 10, 595+10, 842+10), color=(0.9, 0.9, 0.9), fill=(0.95, 0.95, 0.95))
                output_page.insert_text((250, 400), "No page", fontsize=16, color=(0.5, 0.5, 0.5))
            
            # Add page from second PDF
            if page_num < pages2:
                page2 = doc2[page_num]
                pix2 = page2.get_pixmap(matrix=fitz.Matrix(1, 1))
                img2_bytes = pix2.tobytes("png")
                output_page.insert_image(fitz.Rect(615, 10, 1210, 842+10), stream=img2_bytes)
                
                # Add label
                output_page.insert_text((615, 830), "Document 2", fontsize=10, color=(1, 0, 0))
            else:
                # No page in second PDF
                output_page.draw_rect(fitz.Rect(615, 10, 1210, 842+10), color=(0.9, 0.9, 0.9), fill=(0.95, 0.95, 0.95))
                output_page.insert_text((850, 400), "No page", fontsize=16, color=(0.5, 0.5, 0.5))
            
            # Add separator line
            output_page.draw_line((605, 0), (605, 842), color=(0, 0, 0), width=2)
            
            # Compare text content if both pages exist
            if page_num < pages1 and page_num < pages2:
                text1 = doc1[page_num].get_text()
                text2 = doc2[page_num].get_text()
                
                if text1.strip() != text2.strip():
                    differences.append({
                        'page': page_num + 1,
                        'type': 'text_difference',
                        'message': 'Text content differs'
                    })
            elif page_num >= pages1:
                differences.append({
                    'page': page_num + 1,
                    'type': 'missing_page',
                    'message': 'Page missing in Document 1'
                })
            else:
                differences.append({
                    'page': page_num + 1,
                    'type': 'extra_page',
                    'message': 'Extra page in Document 1'
                })
        
        # Save output
        output_doc.save(output_path)
        output_doc.close()
        doc1.close()
        doc2.close()
        
        return {
            'success': True,
            'pages_compared': max_pages,
            'pages_doc1': pages1,
            'pages_doc2': pages2,
            'differences': differences,
            'total_differences': len(differences),
            'message': f'Compared {max_pages} pages, found {len(differences)} differences'
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'message': 'PDF comparison failed'
        }


def get_text_differences(pdf1_path, pdf2_path):
    """
    Get detailed text differences between two PDFs.
    
    Args:
        pdf1_path: Path to first PDF
        pdf2_path: Path to second PDF
        
    Returns:
        dict: Detailed text comparison
    """
    try:
        reader1 = PdfReader(pdf1_path)
        reader2 = PdfReader(pdf2_path)
        
        differences = []
        
        max_pages = max(len(reader1.pages), len(reader2.pages))
        
        for i in range(max_pages):
            page_diff = {'page': i + 1}
            
            if i < len(reader1.pages):
                text1 = reader1.pages[i].extract_text()
            else:
                text1 = ""
                page_diff['note'] = "Page missing in Document 1"
            
            if i < len(reader2.pages):
                text2 = reader2.pages[i].extract_text()
            else:
                text2 = ""
                page_diff['note'] = "Page missing in Document 2"
            
            if text1 != text2:
                page_diff['text1_length'] = len(text1)
                page_diff['text2_length'] = len(text2)
                page_diff['has_difference'] = True
                differences.append(page_diff)
        
        return {
            'success': True,
            'total_pages': max_pages,
            'pages_with_differences': len(differences),
            'differences': differences
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }
