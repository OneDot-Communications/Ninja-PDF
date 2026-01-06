package com._pluspdf._plus_pdf_backend.pdf.model;

import lombok.Data;

@Data
public class PdfResult {
    private byte[] outputBytes;
    private boolean success;
    private String errorMessage;
}