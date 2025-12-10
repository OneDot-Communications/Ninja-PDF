package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"

	pdfapi "github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/types"
)

// These structs must match what you send from React
type RectAnnotation struct {
	ID     string  `json:"id"`
	Page   int     `json:"page"`
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
}

type TextAnnotation struct {
	ID   string  `json:"id"`
	Page int     `json:"page"`
	X    float64 `json:"x"`
	Y    float64 `json:"y"`
	Text string  `json:"text"`
}

// TextEdit represents a text modification from the frontend
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
	Scale        float64 `json:"scale"` // Frontend scale for coordinate conversion
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/pdf/apply-edits", applyEditsHandler)

	// Wrap with simple CORS so your Next app can call it
	handler := withCORS(mux)

	addr := ":8080"
	log.Printf("PDF backend listening on %s ...", addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatal(err)
	}
}

// CORS middleware for local dev (Next runs on :3000)
func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
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

	// Max 32MB form
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		http.Error(w, "invalid multipart form: "+err.Error(), http.StatusBadRequest)
		return
	}

	// 1) Get the PDF file
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

	// 2) Get annotations JSON
	rectJSON := r.FormValue("rectAnnotations")
	textJSON := r.FormValue("textAnnotations")
	textEditsJSON := r.FormValue("textEdits")

	var rects []RectAnnotation
	var texts []TextAnnotation
	var textEdits []TextEdit

	if rectJSON != "" {
		if err := json.Unmarshal([]byte(rectJSON), &rects); err != nil {
			http.Error(w, "invalid rectAnnotations JSON: "+err.Error(), http.StatusBadRequest)
			return
		}
	}

	if textJSON != "" {
		if err := json.Unmarshal([]byte(textJSON), &texts); err != nil {
			http.Error(w, "invalid textAnnotations JSON: "+err.Error(), http.StatusBadRequest)
			return
		}
	}

	if textEditsJSON != "" {
		if err := json.Unmarshal([]byte(textEditsJSON), &textEdits); err != nil {
			http.Error(w, "invalid textEdits JSON: "+err.Error(), http.StatusBadRequest)
			return
		}
	}

	log.Printf("Received %d rects, %d texts, %d textEdits for %s\n", len(rects), len(texts), len(textEdits), header.Filename)

	// 3) Apply edits using pdfcpu
	pdfBytes := pdfBuf.Bytes()
	var resultBuf bytes.Buffer

	// Apply text edits if any
	if len(textEdits) > 0 {
		editedBytes, err := applyTextEdits(pdfBytes, textEdits)
		if err != nil {
			log.Printf("Error applying text edits: %v", err)
			// Fall back to optimization only
			in := bytes.NewReader(pdfBytes)
			if err := pdfapi.Optimize(in, &resultBuf, nil); err != nil {
				http.Error(w, "pdfcpu optimize failed: "+err.Error(), http.StatusInternalServerError)
				return
			}
		} else {
			resultBuf.Write(editedBytes)
		}
	} else {
		// No text edits, just optimize
		in := bytes.NewReader(pdfBytes)
		if err := pdfapi.Optimize(in, &resultBuf, nil); err != nil {
			http.Error(w, "pdfcpu optimize failed: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}

	// 4) Send the edited PDF back
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, editedFilename(header.Filename)))
	if _, err := w.Write(resultBuf.Bytes()); err != nil {
		log.Println("failed to write response:", err)
	}
}

// applyTextEdits applies text modifications to the PDF using pdfcpu watermarks
func applyTextEdits(pdfBytes []byte, edits []TextEdit) ([]byte, error) {
	currentBytes := pdfBytes

	// Group edits by page
	editsByPage := make(map[int][]TextEdit)
	for _, edit := range edits {
		editsByPage[edit.Page] = append(editsByPage[edit.Page], edit)
	}

	// Process each page with edits
	for pageNum, pageEdits := range editsByPage {
		// For each edit on this page, add a white rectangle and then the new text
		for _, edit := range pageEdits {
			// Convert screen coordinates to PDF points
			// Frontend uses scaled coordinates, need to convert back
			scale := edit.Scale
			if scale == 0 {
				scale = 1.3 // Default scale if not provided
			}

			// Get page dimensions first
			pdfReader := bytes.NewReader(currentBytes)
			dims, err := pdfapi.PageDims(pdfReader, nil)
			if err != nil {
				return nil, fmt.Errorf("failed to get page dims: %w", err)
			}

			if pageNum > len(dims) || pageNum < 1 {
				continue
			}

			pageDim := dims[pageNum-1]
			pageHeight := pageDim.Height

			// Convert coordinates from screen space to PDF space
			// PDF origin is bottom-left, screen origin is top-left
			pdfX := edit.X / scale
			pdfY := pageHeight - (edit.Y/scale + edit.Height/scale) // Flip Y and adjust for height
			pdfWidth := edit.Width / scale
			pdfHeight := edit.Height / scale

			// Step 1: Add white rectangle to cover original text
			whiteRect, err := addWhiteRectangle(currentBytes, pageNum, pdfX, pdfY, pdfWidth, pdfHeight)
			if err != nil {
				log.Printf("Warning: failed to add white rectangle for edit %s: %v", edit.ID, err)
				continue
			}
			currentBytes = whiteRect

			// Step 2: Add new text at the same position
			withText, err := addTextWatermark(currentBytes, pageNum, pdfX, pdfY, edit.NewText, edit.FontSize)
			if err != nil {
				log.Printf("Warning: failed to add text watermark for edit %s: %v", edit.ID, err)
				continue
			}
			currentBytes = withText
		}
	}

	return currentBytes, nil
}

// addWhiteRectangle adds a white filled rectangle to cover original text
func addWhiteRectangle(pdfBytes []byte, pageNum int, x, y, width, height float64) ([]byte, error) {
	// Create a white rectangle as a PDF watermark/stamp
	// Using a simple 1x1 white image scaled to cover the area
	// Alternative approach: use pdfcpu's color-based watermark

	// Create a simple 1x1 pixel white image in memory
	// Actually, pdfcpu TextWatermark with spaces can create a white block
	whiteText := " " // Single space
	fontSize := int(math.Max(height, 12))

	// Create text watermark configuration for a white background block
	wmDesc := fmt.Sprintf("pos:bl, off:%.2f %.2f, sc:1 abs, rot:0, font:Helvetica, points:%d, fillc:#FFFFFF, bgcol:#FFFFFF, op:1, margins:0",
		x, y, fontSize)

	wm, err := pdfapi.TextWatermark(whiteText, wmDesc, true, false, types.POINTS)
	if err != nil {
		// Try a simpler approach - just return original and log
		log.Printf("Could not create white rectangle watermark: %v", err)
		return pdfBytes, nil
	}

	wm.OnTop = true

	pages := []string{fmt.Sprintf("%d", pageNum)}

	in := bytes.NewReader(pdfBytes)
	var out bytes.Buffer

	if err := pdfapi.AddWatermarks(in, &out, pages, wm, nil); err != nil {
		return nil, fmt.Errorf("failed to add white rectangle: %w", err)
	}

	return out.Bytes(), nil
}

// addTextWatermark adds text overlay at specified position
func addTextWatermark(pdfBytes []byte, pageNum int, x, y float64, text string, fontSize float64) ([]byte, error) {
	if fontSize < 6 {
		fontSize = 12 // Default font size
	}

	// Create text watermark with absolute positioning
	// pos:bl = position bottom-left, off = offset from that position
	wmDesc := fmt.Sprintf("pos:bl, off:%.2f %.2f, sc:1 abs, rot:0, font:Helvetica, points:%d, fillc:#000000, op:1",
		x, y, int(math.Round(fontSize)))

	wm, err := pdfapi.TextWatermark(text, wmDesc, true, false, types.POINTS)
	if err != nil {
		return nil, fmt.Errorf("failed to create text watermark: %w", err)
	}

	wm.OnTop = true

	// Apply to specific page
	pages := []string{fmt.Sprintf("%d", pageNum)}

	in := bytes.NewReader(pdfBytes)
	var out bytes.Buffer

	if err := pdfapi.AddWatermarks(in, &out, pages, wm, nil); err != nil {
		return nil, fmt.Errorf("failed to add text watermark: %w", err)
	}

	return out.Bytes(), nil
}

func editedFilename(orig string) string {
	if len(orig) == 0 {
		return "edited.pdf"
	}
	// naive: just append -edited
	return orig + "-edited.pdf"
}
