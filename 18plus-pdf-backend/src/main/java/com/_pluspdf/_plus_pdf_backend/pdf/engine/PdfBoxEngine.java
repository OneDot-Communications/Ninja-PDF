package com._pluspdf._plus_pdf_backend.pdf.engine;

import org.apache.pdfbox.multipdf.PDFMergerUtility;
import org.apache.pdfbox.multipdf.Splitter;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Component;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@Component
public class PdfBoxEngine implements PdfEngine {

    @Override
    public byte[] merge(List<File> files) throws Exception {
        PDFMergerUtility merger = new PDFMergerUtility();
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        merger.setDestinationStream(outputStream);

        for (File file : files) {
            merger.addSource(file);
        }

        merger.mergeDocuments(null);
        return outputStream.toByteArray();
    }

    public byte[] mergeByteArrays(List<byte[]> pdfByteArrays) throws Exception {
        if (pdfByteArrays == null || pdfByteArrays.isEmpty()) {
            throw new IllegalArgumentException("No PDF byte arrays provided");
        }

        if (pdfByteArrays.size() == 1) {
            return pdfByteArrays.get(0);
        }

        PDFMergerUtility merger = new PDFMergerUtility();
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        merger.setDestinationStream(outputStream);

        for (byte[] pdfBytes : pdfByteArrays) {
            // Create a temporary file from byte array
            File tempFile = File.createTempFile("pdf_merge_", ".pdf");
            try (java.io.FileOutputStream fos = new java.io.FileOutputStream(tempFile)) {
                fos.write(pdfBytes);
            }
            merger.addSource(tempFile);
            // Note: temp file will be deleted when JVM exits
            tempFile.deleteOnExit();
        }

        merger.mergeDocuments(null);
        return outputStream.toByteArray();
    }

    @Override
    public List<byte[]> split(File file, List<Integer> pages) throws Exception {
        List<byte[]> result = new ArrayList<>();

        try (PDDocument document = org.apache.pdfbox.Loader.loadPDF(file)) {
            int totalPages = document.getNumberOfPages();

            // If no specific pages provided, split all pages individually
            if (pages == null || pages.isEmpty()) {
                Splitter splitter = new Splitter();
                List<PDDocument> splitDocuments = splitter.split(document);

                for (PDDocument splitDoc : splitDocuments) {
                    ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
                    splitDoc.save(outputStream);
                    splitDoc.close();
                    result.add(outputStream.toByteArray());
                }
            } else {
                // Split specific pages into separate documents
                for (Integer pageNum : pages) {
                    if (pageNum >= 1 && pageNum <= totalPages) {
                        PDDocument splitDoc = new PDDocument();
                        splitDoc.addPage(document.getPage(pageNum - 1)); // PDFBox uses 0-based indexing

                        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
                        splitDoc.save(outputStream);
                        splitDoc.close();
                        result.add(outputStream.toByteArray());
                    }
                }
            }
        }

        return result;
    }

    @Override
    public List<String> getPagePreviews(File file, int maxPages) throws Exception {
        List<String> previews = new ArrayList<>();

        try (PDDocument document = org.apache.pdfbox.Loader.loadPDF(file)) {
            PDFRenderer renderer = new PDFRenderer(document);
            int totalPages = Math.min(document.getNumberOfPages(), maxPages);

            for (int pageIndex = 0; pageIndex < totalPages; pageIndex++) {
                // Render page at 150 DPI for reasonable quality and size
                BufferedImage image = renderer.renderImageWithDPI(pageIndex, 150);

                // Convert to JPEG format
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ImageIO.write(image, "JPEG", baos);
                byte[] imageBytes = baos.toByteArray();

                // Convert to base64
                String base64Image = Base64.getEncoder().encodeToString(imageBytes);
                previews.add("data:image/jpeg;base64," + base64Image);
            }
        }

        return previews;
    }
}