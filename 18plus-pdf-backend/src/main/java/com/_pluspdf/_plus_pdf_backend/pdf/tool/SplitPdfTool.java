package com._pluspdf._plus_pdf_backend.pdf.tool;

import com._pluspdf._plus_pdf_backend.pdf.engine.PdfEngine;
import com._pluspdf._plus_pdf_backend.pdf.model.PdfResult;
import com._pluspdf._plus_pdf_backend.pdf.model.PdfToolRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Component
public class SplitPdfTool implements PdfTool {

    @Autowired
    private PdfEngine pdfEngine;

    @Override
    public PdfResult execute(PdfToolRequest request) {
        PdfResult result = new PdfResult();
        try {
            if (request.getFiles() == null || request.getFiles().length == 0) {
                result.setSuccess(false);
                result.setErrorMessage("No file provided for splitting");
                return result;
            }

            MultipartFile inputFile = request.getFiles()[0];
            File tempFile = convertToFile(inputFile);

            List<byte[]> splitResults = pdfEngine.split(tempFile, request.getPages() != null ?
                java.util.Arrays.stream(request.getPages()).boxed().toList() :
                java.util.Collections.emptyList());

            if (request.getPages() != null && request.getPages().length > 0) {
                // Extract mode: merge selected pages into a single PDF
                if (!splitResults.isEmpty()) {
                    // If only one page selected, return it directly
                    if (splitResults.size() == 1) {
                        result.setOutputBytes(splitResults.get(0));
                    } else {
                        // Merge multiple pages into one PDF
                        result.setOutputBytes(pdfEngine.mergeByteArrays(splitResults));
                    }
                    result.setSuccess(true);
                } else {
                    result.setSuccess(false);
                    result.setErrorMessage("No pages were extracted");
                }
            } else {
                // Explode mode: return first result for now
                // TODO: Handle explode mode properly (return ZIP with all pages)
                if (!splitResults.isEmpty()) {
                    result.setOutputBytes(splitResults.get(0));
                    result.setSuccess(true);
                } else {
                    result.setSuccess(false);
                    result.setErrorMessage("No pages were split");
                }
            }

            // Clean up temp file
            tempFile.delete();

        } catch (Exception e) {
            result.setSuccess(false);
            result.setErrorMessage(e.getMessage());
        }
        return result;
    }

    private File convertToFile(MultipartFile multipartFile) throws Exception {
        Path tempFile = Files.createTempFile("split-input-", ".pdf");
        multipartFile.transferTo(tempFile);
        return tempFile.toFile();
    }
}