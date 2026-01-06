package com._pluspdf._plus_pdf_backend.pdf.controller;

import com._pluspdf._plus_pdf_backend.pdf.service.PdfProcessingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/pdf")
public class PdfToolController {

    @Autowired
    private PdfProcessingService pdfProcessingService;

    @PostMapping(value = "/merge", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<byte[]> merge(
            @RequestParam("files") MultipartFile[] files,
            @RequestParam(value = "outputFileName", required = false) String outputFileName) {
        return pdfProcessingService.merge(files, outputFileName);
    }
}