package com._pluspdf._plus_pdf_backend.pdf.tool;

import com._pluspdf._plus_pdf_backend.pdf.engine.PdfEngine;
import com._pluspdf._plus_pdf_backend.pdf.model.PdfResult;
import com._pluspdf._plus_pdf_backend.pdf.model.PdfToolRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.apache.pdfbox.pdmodel.PDDocument;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@Component
public class GetPagePreviewsTool implements PdfTool {

    @Autowired
    private PdfEngine pdfEngine;

    @Override
    public PdfResult execute(PdfToolRequest request) {
        PdfResult result = new PdfResult();
        try {
            if (request.getFiles() == null || request.getFiles().length == 0) {
                result.setSuccess(false);
                result.setErrorMessage("No file provided for page previews");
                return result;
            }

            MultipartFile inputFile = request.getFiles()[0];
            File tempFile = convertToFile(inputFile);

            // Get max pages from request or default to 10
            int maxPages = request.getMaxPages() != null ? request.getMaxPages() : 10;

            List<String> previews = pdfEngine.getPagePreviews(tempFile, maxPages);

            // Get the actual total pages in the document
            int actualTotalPages = 0;
            try (PDDocument document = org.apache.pdfbox.Loader.loadPDF(tempFile)) {
                actualTotalPages = document.getNumberOfPages();
            }

            // Return the previews and total pages as JSON
            String jsonResponse = String.format("{\"previews\": [%s], \"totalPages\": %d}",
                previews.stream()
                    .map(p -> "\"" + p + "\"")
                    .reduce((a, b) -> a + "," + b)
                    .orElse(""),
                actualTotalPages);

            result.setOutputBytes(jsonResponse.getBytes());

            result.setSuccess(true);

            // Clean up temp file
            tempFile.delete();

        } catch (Exception e) {
            result.setSuccess(false);
            result.setErrorMessage(e.getMessage());
        }
        return result;
    }

    private File convertToFile(MultipartFile multipartFile) throws Exception {
        Path tempFile = Files.createTempFile("previews-input-", ".pdf");
        multipartFile.transferTo(tempFile);
        return tempFile.toFile();
    }
}