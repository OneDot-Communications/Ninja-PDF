package com._pluspdf._plus_pdf_backend.pdf.engine;

import java.io.File;
import java.util.List;

public interface PdfEngine {
    byte[] merge(List<File> files) throws Exception;
}