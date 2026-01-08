package com._pluspdf._plus_pdf_backend.pdf.model;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

@Data
public class PdfToolRequest {
    private MultipartFile[] files;
    private String outputFileName;
    private int[] pages; // For split operations - specific pages to extract
    private Integer maxPages; // For page previews - maximum number of pages to preview
    private String level; // For compression level (recommended|extreme)
}