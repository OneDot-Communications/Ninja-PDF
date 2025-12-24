import sys
import os
import shutil

print(f"Python executable: {sys.executable}")

try:
    import docx2pdf
    print("SUCCESS: docx2pdf is installed.")
except ImportError:
    print("FAILURE: docx2pdf is NOT installed.")

# Check for LibreOffice
paths = [
    r"C:\Program Files\LibreOffice\program\soffice.exe",
    r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
]
found_lo = False
for p in paths:
    if os.path.exists(p):
        print(f"SUCCESS: LibreOffice found at {p}")
        found_lo = True
        break
    
if not found_lo:
    in_path = shutil.which('libreoffice') or shutil.which('soffice')
    if in_path:
        print(f"SUCCESS: LibreOffice found in PATH at {in_path}")
    else:
        print("FAILURE: LibreOffice NOT found in standard paths or PATH.")
