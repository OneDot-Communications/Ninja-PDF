package com.ninjapdf.editor.model;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

/**
 * Request object for PDF editing endpoint.
 * Contains the original PDF file and the layout JSON.
 */
@Data
public class EditRequest {
    
    private MultipartFile pdfFile;
    private String layoutJson;
}
