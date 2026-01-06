package com._pluspdf._plus_pdf_backend.pdf.model;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

@Data
public class PdfToolRequest {
    private MultipartFile[] files;
    private String outputFileName;
}