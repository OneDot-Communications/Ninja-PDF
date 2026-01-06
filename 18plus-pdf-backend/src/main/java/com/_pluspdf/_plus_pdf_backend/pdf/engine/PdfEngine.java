package com._pluspdf._plus_pdf_backend.pdf.engine;

import java.io.File;
import java.util.List;

public interface PdfEngine {
    byte[] merge(List<File> files) throws Exception;
    byte[] mergeByteArrays(List<byte[]> pdfByteArrays) throws Exception;
    List<byte[]> split(File file, List<Integer> pages) throws Exception;
    List<String> getPagePreviews(File file, int maxPages) throws Exception;
}