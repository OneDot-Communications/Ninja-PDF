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

@Component
public class CompressPdfTool implements PdfTool {

    @Autowired
    private PdfEngine pdfEngine;

    @Override
    public PdfResult execute(PdfToolRequest request) {
        PdfResult result = new PdfResult();
        try {
            if (request.getFiles() == null || request.getFiles().length == 0) {
                result.setSuccess(false);
                result.setErrorMessage("No file provided for compression");
                return result;
            }

            MultipartFile inputFile = request.getFiles()[0];
            File tempFile = convertToFile(inputFile);

            String level = request.getLevel() != null ? request.getLevel() : "recommended";
            byte[] compressed = pdfEngine.compress(tempFile, level);

            result.setOutputBytes(compressed);
            result.setSuccess(true);

            tempFile.delete();
        } catch (Exception e) {
            result.setSuccess(false);
            result.setErrorMessage(e.getMessage());
        }
        return result;
    }

    private File convertToFile(MultipartFile multipartFile) throws Exception {
        Path tempFile = Files.createTempFile("compress-input-", ".pdf");
        multipartFile.transferTo(tempFile);
        return tempFile.toFile();
    }
}
