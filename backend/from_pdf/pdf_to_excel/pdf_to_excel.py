# pdf_to_excel.py
"""
PDF to Excel conversion module.
Converts PDF pages to spreadsheet-friendly rows using PyMuPDF for text extraction.
Supports XLSX, XLS, and CSV outputs with page/line metadata to preserve context.
"""

import io
import os
from typing import List, Tuple

import fitz  # PyMuPDF
from openpyxl import Workbook


def parse_page_range(page_range: str, total_pages: int) -> List[int]:
    """
    Parse a page range string (e.g., "1-3,5") into a list of 1-based page numbers.
    """
    if not page_range or page_range.lower() == "all":
        return list(range(1, total_pages + 1))

    pages = set()
    parts = page_range.split(",")
    for part in parts:
        part = part.strip()
        if "-" in part:
            try:
                start, end = map(int, part.split("-"))
            except ValueError:
                continue
            start = max(1, start)
            end = min(total_pages, end)
            for p in range(start, end + 1):
                pages.add(p)
        else:
            try:
                p = int(part)
            except ValueError:
                continue
            if 1 <= p <= total_pages:
                pages.add(p)

    return sorted(pages)


def extract_text_lines(pdf_file, page_numbers: List[int]) -> List[Tuple[int, List[str]]]:
    """
    Extract text lines for the given pages.

    Returns: list of tuples (page_number, [lines...])
    """
    if hasattr(pdf_file, "read"):
        pdf_file.seek(0)
        pdf_bytes = pdf_file.read()
        pdf_file.seek(0)
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    else:
        doc = fitz.open(pdf_file)

    try:
        results = []
        for page_num in page_numbers:
            page = doc[page_num - 1]
            text = page.get_text("text") or ""
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            results.append((page_num, lines))
        return results
    finally:
        doc.close()


def build_xlsx(rows: List[Tuple[int, int, str]]) -> bytes:
    """
    Build XLSX bytes from rows: (page, line_index, text).
    """
    wb = Workbook()
    ws = wb.active
    ws.title = "PDF Text"

    # Header
    ws.append(["Page", "Line", "Text"])

    for page, line_idx, text in rows:
        ws.append([page, line_idx, text])

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output.read()


def build_csv(rows: List[Tuple[int, int, str]]) -> bytes:
    import csv

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Page", "Line", "Text"])
    for page, line_idx, text in rows:
        writer.writerow([page, line_idx, text])
    return output.getvalue().encode("utf-8")


def build_xls(rows: List[Tuple[int, int, str]]) -> bytes:
    try:
        import xlwt
    except ImportError:
        # Fallback: generate XLSX if xlwt is unavailable
        return build_xlsx(rows)

    wb = xlwt.Workbook()
    ws = wb.add_sheet("PDF Text")

    headers = ["Page", "Line", "Text"]
    for col, header in enumerate(headers):
        ws.write(0, col, header)

    for row_idx, (page, line_idx, text) in enumerate(rows, start=1):
        ws.write(row_idx, 0, page)
        ws.write(row_idx, 1, line_idx)
        ws.write(row_idx, 2, text)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output.read()


def convert_pdf_to_excel(pdf_file, options=None):
    """
    Convert PDF file to Excel/CSV.

    Args:
        pdf_file: Django UploadedFile or file-like object
        options: dict with keys:
            - page_range: "1-5,8" or "all" (default)
            - format: "xlsx" (default), "xls", or "csv"

    Returns:
        tuple: (filename, file_bytes)
    """
    if options is None:
        options = {}

    # Determine output format
    output_format = (options.get("format", "xlsx") or "xlsx").lower()
    if output_format not in {"xlsx", "xls", "csv"}:
        output_format = "xlsx"

    # Open PDF once to resolve page count
    if hasattr(pdf_file, "read"):
        pdf_file.seek(0)
        pdf_bytes = pdf_file.read()
        pdf_file.seek(0)
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    else:
        doc = fitz.open(pdf_file)

    try:
        total_pages = doc.page_count
    finally:
        doc.close()

    page_range = options.get("page_range", "all")
    pages = parse_page_range(page_range, total_pages)
    if not pages:
        raise ValueError("No valid pages selected")

    # Extract text lines
    page_text = extract_text_lines(pdf_file, pages)

    # Flatten to rows with line numbers
    rows: List[Tuple[int, int, str]] = []
    for page_num, lines in page_text:
        for idx, line in enumerate(lines, start=1):
            rows.append((page_num, idx, line))

    # Build output bytes
    if output_format == "xlsx":
        file_bytes = build_xlsx(rows)
        ext = ".xlsx"
    elif output_format == "xls":
        file_bytes = build_xls(rows)
        ext = ".xls"
    else:
        file_bytes = build_csv(rows)
        ext = ".csv"

    original_name = getattr(pdf_file, "name", "document.pdf")
    filename = os.path.splitext(original_name)[0] + ext

    return filename, file_bytes