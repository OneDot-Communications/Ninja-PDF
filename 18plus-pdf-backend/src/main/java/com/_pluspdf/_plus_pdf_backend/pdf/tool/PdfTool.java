package com._pluspdf._plus_pdf_backend.pdf.tool;

import com._pluspdf._plus_pdf_backend.pdf.model.PdfResult;
import com._pluspdf._plus_pdf_backend.pdf.model.PdfToolRequest;

public interface PdfTool {
    PdfResult execute(PdfToolRequest request);
}