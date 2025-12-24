import sys
import os
import traceback

# Create a dummy docx file
try:
    from docx import Document
    doc = Document()
    doc.add_paragraph("Test Document for PDF Conversion V2")
    test_docx = os.path.abspath("test_debug_v2.docx")
    doc.save(test_docx)
    print(f"Created {test_docx}")
except ImportError:
    print("python-docx not found, skipping creation (file might exist)")
    test_docx = os.path.abspath("test_debug_v2.docx")

output_pdf = os.path.abspath("test_debug_v2.pdf")

print("Attempting to import docx2pdf...")
try:
    from docx2pdf import convert
    print("Import successful. calling convert()...")
    
    # Run conversion
    # Note: This requires MS Word
    convert(test_docx, output_pdf)
    
    if os.path.exists(output_pdf):
        print("SUCCESS: PDF created.")
    else:
        print("FAILURE: convert() returned but no PDF found.")

except Exception as e:
    print(f"EXCEPTION: {e}")
    traceback.print_exc()
