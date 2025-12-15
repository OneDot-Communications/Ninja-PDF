package com.ninjapdf.editor.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ninjapdf.editor.model.LayoutModel;
import com.ninjapdf.editor.model.TextObject;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.util.Matrix;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

/**
 * Core service for PDF editing operations.
 * Handles coordinate transformations and text rendering using Apache PDFBox.
 */
@Service
@Slf4j
public class PdfEditorService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Main method to edit PDF based on layout JSON.
     * 
     * @param pdfInputStream Original PDF file stream
     * @param layoutJson JSON string containing layout model
     * @return Byte array of the edited PDF
     * @throws Exception if processing fails
     */
    public byte[] editPdf(InputStream pdfInputStream, String layoutJson) throws Exception {
        log.info("Starting PDF edit operation");
        
        // Parse layout JSON
        LayoutModel layout = objectMapper.readValue(layoutJson, LayoutModel.class);
        log.info("Parsed layout with {} objects", layout.getObjects().size());
        
        // Load original PDF
        try (PDDocument document = Loader.loadPDF(pdfInputStream.readAllBytes())) {
            
            // For now, we edit the first page
            // TODO: Support multi-page editing by adding pageNumber to TextObject
            if (document.getNumberOfPages() == 0) {
                throw new IllegalArgumentException("PDF has no pages");
            }
            
            PDPage page = document.getPage(0);
            PDRectangle mediaBox = page.getMediaBox();
            
            log.info("Original page size: {}x{}", mediaBox.getWidth(), mediaBox.getHeight());
            log.info("Target page size from layout: {}x{}", layout.getPageWidth(), layout.getPageHeight());
            
            // Create content stream for drawing
            try (PDPageContentStream contentStream = new PDPageContentStream(
                    document, page, PDPageContentStream.AppendMode.APPEND, true, true)) {
                
                // Process each text object
                for (TextObject textObj : layout.getObjects()) {
                    if ("text".equals(textObj.getType())) {
                        drawTextObject(contentStream, textObj, layout.getPageHeight());
                    }
                }
            }
            
            // Save to byte array
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            document.save(outputStream);
            log.info("PDF editing completed successfully");
            
            return outputStream.toByteArray();
        }
    }

    /**
     * Draws a single text object on the PDF page.
     * 
     * @param contentStream PDFBox content stream
     * @param textObj Text object from frontend
     * @param pageHeight Page height for coordinate conversion
     * @throws Exception if drawing fails
     */
    private void drawTextObject(PDPageContentStream contentStream, TextObject textObj, double pageHeight) 
            throws Exception {
        
        // Convert frontend coordinates (top-left origin) to PDF coordinates (bottom-left origin)
        double pdfX = textObj.getX();
        double pdfY = pageHeight - textObj.getY() - textObj.getFontSize();
        
        log.debug("Drawing text '{}' at frontend coords ({}, {}) -> PDF coords ({}, {})", 
                 textObj.getContent(), textObj.getX(), textObj.getY(), pdfX, pdfY);
        
        // Get font
        PDFont font = getFontByName(textObj.getFontFamily());
        
        // Parse color
        Color color = parseColor(textObj.getColor());
        
        // Begin text rendering
        contentStream.beginText();
        
        // Set font and color
        contentStream.setFont(font, (float) textObj.getFontSize());
        contentStream.setNonStrokingColor(color);
        
        // Handle rotation if specified
        if (textObj.getRotation() != 0) {
            // Create transformation matrix for rotation
            double radians = Math.toRadians(textObj.getRotation());
            Matrix matrix = Matrix.getRotateInstance(radians, (float) pdfX, (float) pdfY);
            contentStream.setTextMatrix(matrix);
        } else {
            // Simple positioning without rotation
            contentStream.newLineAtOffset((float) pdfX, (float) pdfY);
        }
        
        // Draw text
        contentStream.showText(textObj.getContent());
        
        contentStream.endText();
    }

    /**
     * Maps font family name from frontend to PDFBox font.
     * 
     * @param fontFamily Font family name (e.g., "Times-Roman", "Helvetica")
     * @return PDFont instance
     */
    private PDFont getFontByName(String fontFamily) {
        if (fontFamily == null || fontFamily.isEmpty()) {
            return new PDType1Font(Standard14Fonts.FontName.HELVETICA);
        }
        
        // Map common font names to Standard 14 fonts
        return switch (fontFamily.toLowerCase()) {
            case "times-roman", "times new roman", "times" -> 
                new PDType1Font(Standard14Fonts.FontName.TIMES_ROMAN);
            case "times-bold" -> 
                new PDType1Font(Standard14Fonts.FontName.TIMES_BOLD);
            case "times-italic" -> 
                new PDType1Font(Standard14Fonts.FontName.TIMES_ITALIC);
            case "times-bolditalic" -> 
                new PDType1Font(Standard14Fonts.FontName.TIMES_BOLD_ITALIC);
            case "helvetica", "arial" -> 
                new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            case "helvetica-bold" -> 
                new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            case "helvetica-oblique" -> 
                new PDType1Font(Standard14Fonts.FontName.HELVETICA_OBLIQUE);
            case "helvetica-boldoblique" -> 
                new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD_OBLIQUE);
            case "courier", "courier new" -> 
                new PDType1Font(Standard14Fonts.FontName.COURIER);
            case "courier-bold" -> 
                new PDType1Font(Standard14Fonts.FontName.COURIER_BOLD);
            case "courier-oblique" -> 
                new PDType1Font(Standard14Fonts.FontName.COURIER_OBLIQUE);
            case "courier-boldoblique" -> 
                new PDType1Font(Standard14Fonts.FontName.COURIER_BOLD_OBLIQUE);
            case "symbol" -> 
                new PDType1Font(Standard14Fonts.FontName.SYMBOL);
            case "zapfdingbats" -> 
                new PDType1Font(Standard14Fonts.FontName.ZAPF_DINGBATS);
            default -> {
                log.warn("Unknown font family '{}', defaulting to Helvetica", fontFamily);
                yield new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            }
        };
    }

    /**
     * Parses hex color string to AWT Color.
     * 
     * @param hexColor Hex color string (e.g., "#000000" or "000000")
     * @return Color instance
     */
    private Color parseColor(String hexColor) {
        if (hexColor == null || hexColor.isEmpty()) {
            return Color.BLACK;
        }
        
        // Remove # if present
        String hex = hexColor.startsWith("#") ? hexColor.substring(1) : hexColor;
        
        try {
            int rgb = Integer.parseInt(hex, 16);
            return new Color(rgb);
        } catch (NumberFormatException e) {
            log.warn("Invalid color format '{}', defaulting to black", hexColor);
            return Color.BLACK;
        }
    }
}
