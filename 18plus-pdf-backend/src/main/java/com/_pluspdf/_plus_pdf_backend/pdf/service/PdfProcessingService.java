package com._pluspdf._plus_pdf_backend.pdf.service;

import com._pluspdf._plus_pdf_backend.pdf.model.*;
import com._pluspdf._plus_pdf_backend.pdf.tool.CompressPdfTool;
import com._pluspdf._plus_pdf_backend.pdf.tool.MergePdfTool;
import com._pluspdf._plus_pdf_backend.pdf.tool.SplitPdfTool;
import com._pluspdf._plus_pdf_backend.pdf.tool.GetPagePreviewsTool;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ContentDisposition;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PdfProcessingService {

    @Autowired
    private MergePdfTool mergePdfTool;

    @Autowired
    private SplitPdfTool splitPdfTool;

    @Autowired
    private GetPagePreviewsTool getPagePreviewsTool;

    @Autowired
    private CompressPdfTool compressPdfTool;

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

    public ResponseEntity<byte[]> compress(MultipartFile file, String level, String outputFileName) {
        PdfToolRequest toolRequest = new PdfToolRequest();
        toolRequest.setFiles(new MultipartFile[]{file});
        toolRequest.setLevel(level);
        toolRequest.setOutputFileName(outputFileName);

        PdfResult result = compressPdfTool.execute(toolRequest);

        if (result.isSuccess()) {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            String filename = (outputFileName != null && !outputFileName.isEmpty()) ? outputFileName : "compressed.pdf";
            headers.setContentDisposition(ContentDisposition.attachment().filename(filename).build());
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(result.getOutputBytes());
        } else {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.TEXT_PLAIN);
            return ResponseEntity.badRequest()
                    .headers(headers)
                    .body(result.getErrorMessage().getBytes());
        }
    }

    public ResponseEntity<byte[]> split(MultipartFile file, int[] pages, String outputFileName) {
        PdfToolRequest toolRequest = new PdfToolRequest();
        toolRequest.setFiles(new MultipartFile[]{file});
        toolRequest.setPages(pages);
        toolRequest.setOutputFileName(outputFileName);

        PdfResult result = splitPdfTool.execute(toolRequest);

        if (result.isSuccess()) {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            String filename = (outputFileName != null && !outputFileName.isEmpty()) ? outputFileName : "split.pdf";
            headers.setContentDispositionFormData("attachment", filename);
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(result.getOutputBytes());
        } else {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.TEXT_PLAIN);
            return ResponseEntity.badRequest()
                    .headers(headers)
                    .body(result.getErrorMessage().getBytes());
        }
    }

    public ResponseEntity<String> getPagePreviews(MultipartFile file, Integer maxPages) {
        PdfToolRequest toolRequest = new PdfToolRequest();
        toolRequest.setFiles(new MultipartFile[]{file});
        toolRequest.setMaxPages(maxPages);

        PdfResult result = getPagePreviewsTool.execute(toolRequest);

        if (result.isSuccess()) {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(new String(result.getOutputBytes()));
        } else {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.TEXT_PLAIN);
            return ResponseEntity.badRequest()
                    .headers(headers)
                    .body(result.getErrorMessage());
        }
    }
}