# PDF Editor Module Documentation

## Overview
This module implements the core suite of PDF editing and organization tools for the Ninja-PDF application. It focuses on direct manipulation of PDF structure and content layers.

## Chosen Libraries & Tools

### 1. `pdf-lib`
*   **Purpose:** Core PDF manipulation (modification, organization, creation).
*   **Why Selected:**
    *   Pure JavaScript, works in browser and Node.js.
    *   Excellent support for splitting, merging, rotating, and cropping pages.
    *   Allows drawing text, images, and shapes (SVG paths) on top of existing pages.
    *   Supports modifying metadata.
*   **Used For:**
    *   Page Organization (Reorder, Add, Delete, Rotate).
    *   Cropping (modifying MediaBox/CropBox).
    *   Watermarking & Page Numbers.
    *   Visual Redaction (drawing rectangles).
    *   Metadata Cleaning.

### 2. `pdfjs-dist`
*   **Purpose:** PDF Rendering and Text Extraction.
*   **Why Selected:**
    *   Industry standard for rendering PDFs in the browser.
    *   Essential for the UI of interactive tools (Crop, Redact, Organize).
*   **Used For:**
    *   Generating thumbnails for the "Organize PDF" tool.
    *   Rendering pages for the "Crop" and "Redact" UI.
    *   Extracting text coordinates for "Search & Redact".
    *   Rendering pages to canvas for "Compare PDF".

### 3. `pixelmatch` (To be added)
*   **Purpose:** Visual comparison of PDF pages.
*   **Why Selected:**
    *   Fast and simple pixel-level image comparison.
*   **Used For:**
    *   "Compare PDF" feature (Visual Diff).

## High-Level Architecture

The PDF editing tools follow a client-side heavy architecture to ensure privacy and speed.

1.  **UI Layer (React/Next.js):**
    *   Users interact with a visual representation of the PDF (rendered via `pdfjs-dist`).
    *   Actions (e.g., "Rotate Page 90deg", "Crop to [x,y,w,h]") are stored in a local state object.
    *   No changes are applied to the actual PDF binary until the user clicks "Download" or "Process".

2.  **Service Layer (`pdf-service.ts`):**
    *   Receives the original PDF `File` and the `operations` state.
    *   Loads the PDF into `pdf-lib`.
    *   Applies the operations in sequence (e.g., Rotate -> Crop -> Watermark).
    *   Saves the modified PDF as a `Uint8Array` -> `Blob`.

3.  **Output:**
    *   The browser downloads the generated Blob directly.

## Limitations & Constraints

### 1. Text Editing
*   **Limitation:** We cannot perform "Word-processor like" editing (reflow text, change font of existing text).
*   **Solution:** We implement "Add Text" (overlay) and "Whiteout & Typeover" (visual replacement).
*   **Constraint:** Users must manually handle line breaks. Matching original fonts exactly is difficult as we only have access to standard fonts or embedded fonts if we extract them (complex). We will stick to standard fonts (Helvetica, Times, Courier) for additions.

### 2. Redaction
*   **Limitation:** `pdf-lib` does not support removing underlying content stream operators easily.
*   **Constraint:** We implement **Visual Redaction** (drawing black rectangles).
*   **Security Warning:** The underlying text remains in the file. This is suitable for printing or flattening, but not for high-security digital sanitization.

### 3. Undo/Redo
*   **Limitation:** `pdf-lib` documents are mutable.
*   **Solution:** We manage state in the React UI (e.g., a list of actions). "Undo" simply removes the last action from the list. The PDF is re-generated from the original + action list when needed (or we keep a preview).

## Usage Notes

### Coordinate Systems
*   **PDF Coordinates:** Origin (0,0) is usually at the **bottom-left**.
*   **Canvas/UI Coordinates:** Origin (0,0) is at the **top-left**.
*   **Conversion:** When applying UI edits (like a crop box) to the PDF, we must convert coordinates:
    ```typescript
    pdf_y = page_height - ui_y - ui_height
    ```

### Backend API
The `pdfStrategyManager` in `lib/pdf-service.ts` is the entry point.
New strategies to implement:
*   `'organize'`: `{ pageOrder: number[], rotations: Record<number, number> }`
*   `'crop'`: `{ pageIndex: number, cropBox: { x, y, width, height } }`
*   `'watermark'`: `{ text: string, opacity: number, ... }`
*   `'redact'`: `{ rects: { pageIndex, x, y, w, h }[] }`
*   `'compare'`: `{ file2: File }`
