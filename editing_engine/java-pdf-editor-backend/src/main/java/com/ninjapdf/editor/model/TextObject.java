package com.ninjapdf.editor.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * Represents a text object from the frontend with absolute positioning.
 * Coordinates use top-left origin (frontend convention).
 */
@Data
public class TextObject {
    
    @JsonProperty("type")
    private String type; // "text"
    
    @JsonProperty("content")
    private String content;
    
    @JsonProperty("x")
    private double x; // X coordinate (pixels, top-left origin)
    
    @JsonProperty("y")
    private double y; // Y coordinate (pixels, top-left origin)
    
    @JsonProperty("fontSize")
    private double fontSize;
    
    @JsonProperty("fontFamily")
    private String fontFamily; // e.g., "Times-Roman", "Helvetica"
    
    @JsonProperty("color")
    private String color; // Hex color, e.g., "#000000"
    
    @JsonProperty("rotation")
    private double rotation; // Rotation in degrees
}
