package com.ninjapdf.editor.model;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Standard error response for API.
 */
@Data
@AllArgsConstructor
public class ErrorResponse {
    private String error;
    private String message;
}
