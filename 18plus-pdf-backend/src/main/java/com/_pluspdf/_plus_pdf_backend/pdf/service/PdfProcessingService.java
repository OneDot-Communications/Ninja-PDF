package com._pluspdf._plus_pdf_backend.pdf.service;

import com._pluspdf._plus_pdf_backend.pdf.model.*;
import com._pluspdf._plus_pdf_backend.pdf.tool.MergePdfTool;
import com._pluspdf._plus_pdf_backend.pdf.tool.PdfTool;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PdfProcessingService {

    @Autowired
    private MergePdfTool mergePdfTool;

    public ResponseEntity<byte[]> merge(MultipartFile[] files, String outputFileName) {
        PdfToolRequest toolRequest = new PdfToolRequest();
        toolRequest.setFiles(files);
        toolRequest.setOutputFileName(outputFileName);

        PdfResult result = mergePdfTool.execute(toolRequest);

        if (result.isSuccess()) {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            String filename = (outputFileName != null && !outputFileName.isEmpty()) ? outputFileName : "merged.pdf";
            headers.setContentDispositionFormData("attachment", filename);
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(result.getOutputBytes());
        } else {
            // For error, return text response
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.TEXT_PLAIN);
            return ResponseEntity.badRequest()
                    .headers(headers)
                    .body(result.getErrorMessage().getBytes());
        }
    }
}