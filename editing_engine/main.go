package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"

	pdfapi "github.com/pdfcpu/pdfcpu/pkg/api"
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

	var rects []RectAnnotation
	var texts []TextAnnotation

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

	// For now: just log them so you can see data flowing
	log.Printf("Received %d rects, %d texts for %s\n", len(rects), len(texts), header.Filename)

	// 3) Use pdfcpu on the bytes.
	// Right now we just "Optimize" as a placeholder. Later:
	// - map rects/texts to pdfcpu watermarks/annotations.
	in := bytes.NewReader(pdfBuf.Bytes())
	var out bytes.Buffer

	if err := pdfapi.Optimize(in, &out, nil); err != nil {
		http.Error(w, "pdfcpu optimize failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 4) Send the edited PDF back
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, editedFilename(header.Filename)))
	if _, err := w.Write(out.Bytes()); err != nil {
		log.Println("failed to write response:", err)
	}
}

func editedFilename(orig string) string {
	if len(orig) == 0 {
		return "edited.pdf"
	}
	// naive: just append -edited
	return orig + "-edited.pdf"
}
