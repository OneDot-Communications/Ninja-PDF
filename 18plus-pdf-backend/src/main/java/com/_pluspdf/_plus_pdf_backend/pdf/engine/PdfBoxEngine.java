package com._pluspdf._plus_pdf_backend.pdf.engine;

import org.apache.pdfbox.multipdf.PDFMergerUtility;
import org.springframework.stereotype.Component;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
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
}