package com.ninjapdf.editor.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.List;

/**
 * Represents the complete layout model from frontend.
 * Contains page dimensions and all text objects.
 */
@Data
public class LayoutModel {
    
    @JsonProperty("pageWidth")
    private double pageWidth; // PDF page width in points
    
    @JsonProperty("pageHeight")
    private double pageHeight; // PDF page height in points
    
    @JsonProperty("objects")
    private List<TextObject> objects;
}
