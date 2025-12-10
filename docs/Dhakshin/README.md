# PDF Conversion Libraries - Documentation

This document provides a brief overview of the libraries used in each PDF conversion module.

---

## 1. PowerPoint to PDF (`powerpoint_pdf/powerpoint_to_pdf.py`)

**Supported Formats:** `.ppt`, `.pptx`

**Libraries Used:**
- **python-pptx** - Reads and extracts text from `.pptx` files (XML-based format)
- **olefile** - Parses binary `.ppt` files (OLE format) to extract text
- **reportlab** - Generates PDF documents from extracted text

**How It Works:**
- `.pptx` files: Uses python-pptx to read slide content and shapes
- `.ppt` files: Uses olefile to parse binary format and extract text
- Outputs landscape-oriented PDF with text content only (no images)

---

## 2. Word to PDF (`word_pdf/word_to_pdf.py`)

**Supported Formats:** `.doc`, `.docx`

**Libraries Used:**
- **mammoth** - Converts `.docx` files to HTML (primary method)
- **olefile** - Extracts text from legacy `.doc` files (binary OLE format)
- **xhtml2pdf** - Converts HTML to PDF

**How It Works:**
- `.docx` files: Mammoth converts to HTML, then xhtml2pdf generates PDF
- `.doc` files: Olefile extracts raw text, formatted as simple HTML, then converted to PDF
- Preserves basic formatting and structure

---

## 3. Excel to PDF (`excel_pdf/excel_to_pdf.py`)

**Supported Formats:** `.xls`, `.xlsx`

**Libraries Used:**
- **openpyxl** - Reads `.xlsx` files (modern Excel format)
- **xlrd** - Reads `.xls` files (legacy Excel format)
- **reportlab** - Generates PDF with table layout

**How It Works:**
- Extracts cell data from all sheets (max 500 rows per sheet)
- Creates PDF tables using reportlab's Table component
- Each sheet becomes a separate page in landscape orientation
- Automatically adjusts column widths and applies grid styling

---

## 4. HTML to PDF (`html_pdf/html_to_pdf.py`)

**Supported Formats:** `.html`

**Libraries Used:**
- **xhtml2pdf (pisa)** - Converts HTML/CSS to PDF

**How It Works:**
- Reads HTML file with UTF-8 encoding
- Directly converts HTML and CSS to PDF
- Preserves styles, formatting, and layout from the HTML source

---

## 5. JPG to PDF (`jpg_pdf/jpg_to_pdf.py`)

**Supported Formats:** `.jpg`, `.jpeg`

**Libraries Used:**
- **img2pdf** - Converts images to PDF without quality loss

**How It Works:**
- Embeds JPG image directly into PDF format
- No re-encoding or compression (lossless conversion)
- Image maintains original dimensions and quality

---

## 6. Markdown to PDF (`markdown_pdf/markdown_to_pdf.py`)

**Supported Formats:** `.md`

**Libraries Used:**
- **markdown** - Converts Markdown syntax to HTML
- **xhtml2pdf (pisa)** - Converts HTML to PDF

**How It Works:**
- Parses Markdown with extensions (tables, code highlighting, etc.)
- Wraps HTML with styled CSS template for professional appearance
- Converts styled HTML to PDF with proper formatting for headers, code blocks, tables, and quotes

---

## Installation

All required libraries are listed in `requirements.txt`:

```
python-pptx
olefile
reportlab
mammoth
xhtml2pdf
openpyxl
xlrd
img2pdf
markdown
```

Install with:
```bash
pip install -r requirements.txt
```

---

## Notes

- All converters support basic error handling and file validation
- Text-based conversions (PPT, Word, Excel) extract content but may not preserve complex layouts
- Image-based conversions (JPG) preserve original quality
- HTML and Markdown conversions maintain styling and formatting.

## 7. Metadata Cleaner (`metadata_cleaner/clean_metadata.py`)

**Supported Formats:** `.pdf`

**Libraries Used:**
- **pypdf (PdfReader, PdfWriter)** - Reads and writes PDF files
- **pikepdf** - Alternative PDF manipulation library with advanced metadata handling

**How It Works:**
- Reads the input PDF file using pypdf's PdfReader
- Creates a new PDF with PdfWriter, copying all pages without metadata
- Explicitly clears all metadata fields:
  - `/Title` - Document title
  - `/Author` - Document author
  - `/Subject` - Document subject
  - `/Creator` - Creating application name
  - `/Producer` - PDF producer software
  - `/CreationDate` - File creation timestamp
  - `/ModDate` - Last modification timestamp
  - Custom properties and XMP metadata
- Outputs a clean PDF with identical content but no metadata

**Use Cases:**
- Remove sensitive information before sharing documents
- Strip author/company information for privacy
- Remove creation software traces
- Clean documents for anonymous submissions

**API Endpoint:**
- `/api/v1/edit/clean-metadata/` - REST API endpoint for frontend integration

**Components:**
- **Backend:** Django REST API view in `to_pdf/views.py`
- **Frontend:** React component in `frontend/app/components/tools/`
- **Template:** HTML form in `to_pdf/templates/to_pdf/convert_form.html`

**Error Handling:**
- Validates PDF format before processing
- Returns clear error messages for corrupted or encrypted PDFs
- Automatic cleanup of temporary files

---

## Recovery & Digitization Tools

### 8. Repair PDF (`recovery/repair_pdf.py`)

**Purpose:** Analyze and repair corrupted PDF files

**Libraries Used:**
- **pikepdf** - Primary PDF repair library with robust error handling
- **pypdf** - Fallback for reading/reconstructing PDF structure

**Library Selection Rationale:**
- **pikepdf** chosen for its C++ QPDF backend which handles malformed files better than pure Python solutions
- Can repair broken XREF tables, fix EOF markers, and reconstruct document structure
- Success rate: ~70-80% for common corruption types (incomplete downloads, header issues)
- **pypdf** as fallback for simpler repairs and validation

**How It Works:**
1. Attempts to open PDF with pikepdf (which auto-repairs on load)
2. If successful, saves repaired version
3. Falls back to pypdf for validation and basic structure fixes
4. Returns detailed error report if unrepairable

**Limitations:**
- Cannot repair password-encrypted corrupted files
- Cannot recover completely missing pages or content
- Severe file truncation (>50% missing) may be unrepairable
- Cannot fix intentionally malformed PDFs (malware)

**Architecture:**
- Isolated error handling to prevent crashes
- Stream-based processing to handle large files
- Validates output before returning
- Comprehensive logging of repair attempts

---

### 9. Scan to PDF (`recovery/scan_to_pdf.py`)

**Purpose:** Convert scanned document images to optimized PDF format

**Libraries Used:**
- **Pillow (PIL)** - Image processing and enhancement
- **img2pdf** - Efficient image-to-PDF conversion
- **opencv-python** - Advanced image processing (deskewing, denoising)

**Library Selection Rationale:**
- **Pillow** for basic image enhancements (contrast, brightness, sharpness)
- **OpenCV** for advanced processing (deskew detection, noise reduction, binarization)
- **img2pdf** maintains image quality while creating standards-compliant PDFs
- No OCR included - focuses on image optimization for readability

**How It Works:**
1. Load scanned image (supports TIFF, PNG, JPG, BMP)
2. Apply automatic image enhancements:
   - Auto-contrast adjustment
   - Deskewing (straighten tilted scans)
   - Noise reduction
   - Sharpening for text clarity
3. Convert enhanced image to PDF
4. Optimize PDF size while maintaining quality

**Limitations:**
- Maximum resolution: 600 DPI (larger images downscaled for performance)
- Does not perform OCR (text remains as image)
- Multi-page scans require multiple inputs
- Works best with black & white or grayscale documents

**Architecture:**
- Preprocessing pipeline with configurable enhancement levels
- Memory-efficient processing for large scans
- Batch processing support
- Quality vs. size optimization options

---

## Installation (Recovery Tools)

Additional dependencies for recovery tools:

```bash
pip install pikepdf opencv-python-headless Pillow img2pdf
```

---

## Usage Notes

**Repair PDF API:**
- Endpoint: `/api/v1/recovery/repair-pdf/`
- Input: Corrupted PDF file
- Output: Repaired PDF or detailed error report
- Response includes repair status and issues found

**Scan to PDF API:**
- Endpoint: `/api/v1/recovery/scan-to-pdf/`
- Input: Scanned image file (PNG, JPG, TIFF, BMP)
- Output: Optimized PDF
- Optional parameters: enhancement_level (low/medium/high)
