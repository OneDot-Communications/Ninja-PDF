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
import java.util.List;

@Component
public class MergePdfTool implements PdfTool {

    @Autowired
    private PdfEngine pdfEngine;

    @Override
    public PdfResult execute(PdfToolRequest request) {
        PdfResult result = new PdfResult();
        try {
            List<File> files = convertMultipartFilesToFiles(request.getFiles());
            byte[] mergedBytes = pdfEngine.merge(files);
            result.setOutputBytes(mergedBytes);
            result.setSuccess(true);
            // Clean up temp files
            files.forEach(File::delete);
        } catch (Exception e) {
            result.setSuccess(false);
            result.setErrorMessage(e.getMessage());
        }
        return result;
    }

    private List<File> convertMultipartFilesToFiles(MultipartFile[] multipartFiles) throws Exception {
        List<File> files = new ArrayList<>();
        for (MultipartFile multipartFile : multipartFiles) {
            files.add(convertToFile(multipartFile));
        }
        return files;
    }

    private File convertToFile(MultipartFile multipartFile) throws Exception {
        Path tempFile = Files.createTempFile("upload-", ".pdf");
        multipartFile.transferTo(tempFile);
        return tempFile.toFile();
    }
}