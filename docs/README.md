# PDF Conversion Library Research & Implementation

## Overview
This document outlines the libraries and tools chosen for converting various file formats to PDF within the Ninja-PDF backend. The goal is to ensure high fidelity, layout preservation, and efficient processing.

## Chosen Libraries

### 1. Word, PowerPoint, Excel to PDF
**Library/Tool:** `LibreOffice` (Headless Mode)
*   **Reason for Selection:** 
    *   **Fidelity:** LibreOffice offers the best open-source rendering engine for Microsoft Office formats, preserving fonts, layouts, and pagination far better than pure Python alternatives like `pypandoc` or `python-docx`.
    *   **Versatility:** Handles `.docx`, `.pptx`, and `.xlsx` uniformly.
    *   **Cost:** Free and open-source (Self-hosted).
*   **Architecture:** 
    *   The Python backend uses the `subprocess` module to invoke LibreOffice in headless mode (`--headless --convert-to pdf`).
    *   Input files are passed to the command, and the output PDF is generated in the specified directory.
*   **Limitations:**
    *   **Dependency:** Requires LibreOffice to be installed on the host machine.
    *   **Performance:** Heavier than pure Python scripts; starting the process for each file can be slow (mitigated by using a listener or keeping it warm, though simple subprocess is used for simplicity here).
    *   **Fonts:** Server must have the same fonts installed as the document to render correctly.

### 2. JPG to PDF
**Library/Tool:** `img2pdf`
*   **Reason for Selection:**
    *   **Lossless:** Embeds JPEG data directly into the PDF without re-encoding, preserving original quality.
    *   **Speed:** Extremely fast as it avoids image processing overhead.
    *   **Control:** Offers precise control over layout and DPI.
*   **Architecture:**
    *   Python script reads the image bytes and uses `img2pdf.convert()` to generate PDF bytes.
*   **Limitations:**
    *   Strictly for images; doesn't handle text extraction or OCR (unless combined with other tools).

### 3. HTML to PDF
**Library/Tool:** `WeasyPrint`
*   **Reason for Selection:**
    *   **CSS Support:** Excellent support for CSS Paged Media, allowing for print-quality layouts.
    *   **Python Native:** Integrates well with Python web frameworks.
*   **Architecture:**
    *   `HTML(string=...)` or `HTML(filename=...)` is used to parse the content, and `.write_pdf()` generates the output.
*   **Limitations:**
    *   **JavaScript:** Does not execute JavaScript. Dynamic content must be pre-rendered.
    *   **System Dependencies:** Requires GTK3 libraries (Pango, GdkPixbuf) to be installed on the system.

## Usage Notes

### Prerequisites
Ensure the following are installed on the system:
1.  **LibreOffice**: Add `soffice` (or `libreoffice`) to your system PATH.
2.  **Python Packages**:
    ```bash
    pip install img2pdf WeasyPrint
    ```
3.  **GTK3** (for WeasyPrint): Follow WeasyPrint installation guide for your OS.

### Basic Usage
Each converter module exposes a function (e.g., `convert_to_pdf`) that accepts an input file path and an output file path.

```python
# Example: Word to PDF
from backend.to_pdf.word_pdf.word_to_pdf import convert_word_to_pdf
convert_word_to_pdf("input.docx", "output.pdf")
```

## Folder Structure
The conversion modules are located in `backend/to_pdf/`:
*   `word-pdf/` -> Word conversion logic
*   `powerpoint-pdf/` -> PowerPoint conversion logic
*   `excel-pdf/` -> Excel conversion logic
*   `jpg-pdf/` -> JPG conversion logic
*   `html-pdf/` -> HTML conversion logic
