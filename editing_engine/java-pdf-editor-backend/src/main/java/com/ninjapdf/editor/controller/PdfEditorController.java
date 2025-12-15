package com.ninjapdf.editor.controller;

import com.ninjapdf.editor.model.ErrorResponse;
import com.ninjapdf.editor.service.PdfEditorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * REST API controller for PDF editing operations.
 * Provides endpoint for receiving PDF + layout JSON and returning edited PDF.
 */
@RestController
@RequestMapping("/api/pdf")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*") // TODO: Configure CORS properly for production
public class PdfEditorController {

    private final PdfEditorService pdfEditorService;

    /**
     * Main endpoint for PDF editing.
     * 
     * POST /api/pdf/edit
     * 
     * @param pdfFile Original PDF file (multipart/form-data)
     * @param layoutJson Layout JSON string from frontend
     * @return Edited PDF file as byte array
     */
    @PostMapping(value = "/edit", 
                 consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
                 produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<?> editPdf(
            @RequestParam("pdf") MultipartFile pdfFile,
            @RequestParam("layout") String layoutJson) {
        
        try {
            log.info("Received PDF edit request - File: {}, Size: {} bytes", 
                     pdfFile.getOriginalFilename(), pdfFile.getSize());
            
            // Validate inputs
            if (pdfFile.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(new ErrorResponse("INVALID_INPUT", "PDF file is empty"));
            }
            
            if (layoutJson == null || layoutJson.isBlank()) {
                return ResponseEntity.badRequest()
                    .body(new ErrorResponse("INVALID_INPUT", "Layout JSON is missing"));
            }
            
            // Process PDF
            byte[] editedPdf = pdfEditorService.editPdf(pdfFile.getInputStream(), layoutJson);
            
            // Set response headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "edited_" + pdfFile.getOriginalFilename());
            headers.setContentLength(editedPdf.length);
            
            log.info("Successfully processed PDF - Output size: {} bytes", editedPdf.length);
            
            return ResponseEntity.ok()
                .headers(headers)
                .body(editedPdf);
                
        } catch (IllegalArgumentException e) {
            log.error("Invalid input: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(new ErrorResponse("INVALID_INPUT", e.getMessage()));
                
        } catch (Exception e) {
            log.error("Error processing PDF", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("PROCESSING_ERROR", "Failed to process PDF: " + e.getMessage()));
        }
    }

    /**
     * Health check endpoint.
     */
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("PDF Editor Service is running");
    }
}
