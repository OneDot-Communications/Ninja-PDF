package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "log"
    "math"
    "net/http"
    "strings"

    pdfapi "github.com/pdfcpu/pdfcpu/pkg/api"
    "github.com/pdfcpu/pdfcpu/pkg/pdfcpu/types"
)

type RectAnnotation struct {
    ID     string  `json:"id"`
    Page   int     `json:"page"`
    X      float64 `json:"x"`
    Y      float64 `json:"y"`
    Width  float64 `json:"width"`
    Height float64 `json:"height"`
    Type   string  `json:"type"`
    Color  string  `json:"color"`
}

type TextAnnotation struct {
    ID         string  `json:"id"`
    Page       int     `json:"page"`
    X          float64 `json:"x"`
    Y          float64 `json:"y"`
    Text       string  `json:"text"`
    FontSize   float64 `json:"fontSize"`
    FontFamily string  `json:"fontFamily"`
    Color      string  `json:"color"`
}

type TextEdit struct {
    ID           string  `json:"id"`
    Page         int     `json:"page"`
    X            float64 `json:"x"`
    Y            float64 `json:"y"`
    Width        float64 `json:"width"`
    Height       float64 `json:"height"`
    OriginalText string  `json:"originalText"`
    NewText      string  `json:"newText"`
    FontSize     float64 `json:"fontSize"`
    FontFamily   string  `json:"fontFamily"`
    Scale        float64 `json:"scale"`
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("/api/pdf/apply-edits", applyEditsHandler)

    handler := withCORS(mux)

    addr := ":8080"
    log.Printf("PDF backend listening on %s ...", addr)
    if err := http.ListenAndServe(addr, handler); err != nil {
        log.Fatal(err)
    }
}

func withCORS(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

        if r.Method == http.MethodOptions {
            w.WriteHeader(http.StatusNoContent)
            return
        }

        next.ServeHTTP(w, r)
    })
}

func applyEditsHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "only POST allowed", http.StatusMethodNotAllowed)
        return
    }

    if err := r.ParseMultipartForm(32 << 20); err != nil {
        http.Error(w, "invalid multipart form: "+err.Error(), http.StatusBadRequest)
        return
    }

    file, header, err := r.FormFile("file")
    if err != nil {
        http.Error(w, "missing file field: "+err.Error(), http.StatusBadRequest)
        return
    }
    defer file.Close()

    var pdfBuf bytes.Buffer
    if _, err := io.Copy(&pdfBuf, file); err != nil {
        http.Error(w, "failed to read pdf: "+err.Error(), http.StatusInternalServerError)
        return
    }

    rectJSON := r.FormValue("rectAnnotations")
    textJSON := r.FormValue("textAnnotations")
    textEditsJSON := r.FormValue("textEdits")

    var rects []RectAnnotation
    var texts []TextAnnotation
    var textEdits []TextEdit

    if rectJSON != "" {
        if err := json.Unmarshal([]byte(rectJSON), &rects); err != nil {
            log.Printf("Warning: invalid rectAnnotations JSON: %v", err)
        }
    }

    if textJSON != "" {
        if err := json.Unmarshal([]byte(textJSON), &texts); err != nil {
            log.Printf("Warning: invalid textAnnotations JSON: %v", err)
        }
    }

    if textEditsJSON != "" {
        log.Printf("Received textEditsJSON: %s", textEditsJSON)
        if err := json.Unmarshal([]byte(textEditsJSON), &textEdits); err != nil {
            log.Printf("Warning: invalid textEdits JSON: %v", err)
        }
    }

    log.Printf("Processing: %d rects, %d texts, %d textEdits for %s\n", len(rects), len(texts), len(textEdits), header.Filename)

    pdfBytes := pdfBuf.Bytes()
    var resultBuf bytes.Buffer

    // Apply text edits first
    if len(textEdits) > 0 {
        editedBytes, err := applyTextEdits(pdfBytes, textEdits)
        if err != nil {
            log.Printf("Error applying text edits: %v", err)
            // Fall back to original PDF
            in := bytes.NewReader(pdfBytes)
            if err := pdfapi.Optimize(in, &resultBuf, nil); err != nil {
                http.Error(w, "pdfcpu optimize failed: "+err.Error(), http.StatusInternalServerError)
                return
            }
        } else {
            pdfBytes = editedBytes
        }
    }

    // Apply annotations (highlights, underlines, etc.)
    if len(rects) > 0 || len(texts) > 0 {
        annotatedBytes, err := applyAnnotations(pdfBytes, rects, texts)
        if err != nil {
            log.Printf("Error applying annotations: %v", err)
        } else {
            pdfBytes = annotatedBytes
        }
    }

    // Final optimization
    in := bytes.NewReader(pdfBytes)
    if err := pdfapi.Optimize(in, &resultBuf, nil); err != nil {
        log.Printf("Warning: optimization failed: %v", err)
        resultBuf.Write(pdfBytes)
    }

    w.Header().Set("Content-Type", "application/pdf")
    w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, editedFilename(header.Filename)))
    if _, err := w.Write(resultBuf.Bytes()); err != nil {
        log.Println("failed to write response:", err)
    }
}

func applyTextEdits(pdfBytes []byte, edits []TextEdit) ([]byte, error) {
    currentBytes := pdfBytes

    editsByPage := make(map[int][]TextEdit)
    for _, edit := range edits {
        editsByPage[edit.Page] = append(editsByPage[edit.Page], edit)
    }

    // Get page dimensions
    pdfReader := bytes.NewReader(currentBytes)
    dims, err := pdfapi.PageDims(pdfReader, nil)
    if err != nil {
        return nil, fmt.Errorf("failed to get page dims: %w", err)
    }

    for pageNum, pageEdits := range editsByPage {
        if pageNum > len(dims) || pageNum < 1 {
            log.Printf("Warning: Invalid page number %d, skipping.", pageNum)
            continue
        }

        pageDim := dims[pageNum-1]
        pageHeight := pageDim.Height

        for _, edit := range pageEdits {
            scale := edit.Scale
            if scale == 0 {
                scale = 1.3
            }

            // Convert screen coordinates to PDF points
            pdfX := edit.X / scale
            pdfY := pageHeight - (edit.Y / scale) - (edit.Height / scale)
            pdfWidth := edit.Width / scale
            pdfHeight := edit.Height / scale

            // Add generous padding
            padding := 3.0
            pdfX -= padding
            pdfY -= padding
            pdfWidth += 2 * padding
            pdfHeight += 2 * padding

            log.Printf("Editing text on page %d at (%.2f, %.2f) size (%.2f x %.2f)", 
                pageNum, pdfX, pdfY, pdfWidth, pdfHeight)

            // Step 1: Cover original text with white rectangle
            whiteRect, err := addWhiteRectangle(currentBytes, pageNum, pdfX, pdfY, pdfWidth, pdfHeight)
            if err != nil {
                log.Printf("Warning: failed to add white rectangle for edit %s: %v", edit.ID, err)
                continue
            }
            currentBytes = whiteRect

            // Step 2: Add new text
            textX := pdfX + padding
            textY := pdfY + padding
            pdfFontSize := edit.FontSize / scale
            
            withText, err := addTextWatermark(currentBytes, pageNum, textX, textY, edit.NewText, pdfFontSize)
            if err != nil {
                log.Printf("Warning: failed to add text watermark for edit %s: %v", edit.ID, err)
                continue
            }
            currentBytes = withText

            log.Printf("Successfully edited text: '%s' -> '%s'", edit.OriginalText, edit.NewText)
        }
    }

    return currentBytes, nil
}

func addWhiteRectangle(pdfBytes []byte, pageNum int, x, y, width, height float64) ([]byte, error) {
    // Use filled rectangle approach with large font block characters
    fontSize := math.Max(height*1.5, 14)
    charWidth := fontSize * 0.55
    numChars := int(math.Ceil(width/charWidth)) + 3

    // Create block of white characters
    whiteText := strings.Repeat("█", numChars)

    wmDesc := fmt.Sprintf("pos:bl, off:%.2f %.2f, scale:1 abs, rot:0, font:Helvetica, points:%d, fillc:#FFFFFF, op:1",
        x, y-height*0.1, int(fontSize))

    wm, err := pdfapi.TextWatermark(whiteText, wmDesc, true, false, types.POINTS)
    if err != nil {
        // Fallback to spaces with background
        log.Printf("Block character approach failed, trying spaces: %v", err)
        spaces := strings.Repeat(" ", numChars*3)
        wmDesc2 := fmt.Sprintf("pos:bl, off:%.2f %.2f, scale:1 abs, rot:0, font:Courier, points:%d, bgcol:#FFFFFF, op:1",
            x, y, int(fontSize))
        wm, err = pdfapi.TextWatermark(spaces, wmDesc2, true, false, types.POINTS)
        if err != nil {
            return nil, fmt.Errorf("failed to create white rectangle: %w", err)
        }
    }

    wm.OnTop = true
    pages := []string{fmt.Sprintf("%d", pageNum)}

    in := bytes.NewReader(pdfBytes)
    var out bytes.Buffer

    if err := pdfapi.AddWatermarks(in, &out, pages, wm, nil); err != nil {
        return nil, fmt.Errorf("failed to add white rectangle watermark: %w", err)
    }

    return out.Bytes(), nil
}

func addTextWatermark(pdfBytes []byte, pageNum int, x, y float64, text string, fontSize float64) ([]byte, error) {
    if fontSize < 6 {
        fontSize = 12
    }

    // Ensure text is not empty
    if strings.TrimSpace(text) == "" {
        text = " "
    }

    wmDesc := fmt.Sprintf("pos:bl, off:%.2f %.2f, scale:1 abs, rot:0, font:Helvetica, points:%d, fillc:#000000, op:1",
        x, y, int(math.Round(fontSize)))

    wm, err := pdfapi.TextWatermark(text, wmDesc, true, false, types.POINTS)
    if err != nil {
        return nil, fmt.Errorf("failed to create text watermark: %w", err)
    }

    wm.OnTop = true
    pages := []string{fmt.Sprintf("%d", pageNum)}

    in := bytes.NewReader(pdfBytes)
    var out bytes.Buffer

    if err := pdfapi.AddWatermarks(in, &out, pages, wm, nil); err != nil {
        return nil, fmt.Errorf("failed to add text watermark: %w", err)
    }

    return out.Bytes(), nil
}

func applyAnnotations(pdfBytes []byte, rects []RectAnnotation, texts []TextAnnotation) ([]byte, error) {
    currentBytes := pdfBytes

    // Apply rectangle annotations (highlights, underlines, etc.)
    for _, rect := range rects {
        log.Printf("Applying %s annotation on page %d", rect.Type, rect.Page)
        // Implementation depends on annotation type
        // For highlights, you could use colored rectangles
        // This is a placeholder - you'd implement based on rect.Type
    }

    // Apply text annotations
    for _, text := range texts {
        log.Printf("Applying text annotation on page %d: %s", text.Page, text.Text)
        fontSize := text.FontSize
        if fontSize == 0 {
            fontSize = 12
        }

        annotatedBytes, err := addTextWatermark(currentBytes, text.Page, text.X, text.Y, text.Text, fontSize)
        if err != nil {
            log.Printf("Warning: failed to add text annotation: %v", err)
            continue
        }
        currentBytes = annotatedBytes
    }

    return currentBytes, nil
}

func editedFilename(orig string) string {
    if len(orig) == 0 {
        return "edited.pdf"
    }
    if strings.HasSuffix(strings.ToLower(orig), ".pdf") {
        return orig[:len(orig)-4] + "-edited.pdf"
    }
    return orig + "-edited.pdf"
}