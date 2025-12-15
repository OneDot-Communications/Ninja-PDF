# Ninja PDF Editor Backend

A production-ready Java backend service for PDF editing operations using Apache PDFBox.

## Overview

This service accepts PDFs and layout JSON from a frontend editor (Next.js + PDF.js + Fabric.js) and rebuilds PDFs with edited text positioned exactly as specified.

## Architecture

```
┌─────────────────┐
│   Frontend      │ 
│  (Next.js)      │ → Sends PDF + Layout JSON
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  REST API       │
│  Controller     │ → /api/pdf/edit
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  PDF Service    │ → Coordinate conversion
│                 │ → Font handling
│                 │ → Text rendering
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Apache PDFBox  │ → Low-level PDF operations
└─────────────────┘
```

## API Contract

### POST /api/pdf/edit

**Request:**
- Content-Type: `multipart/form-data`
- Parameters:
  - `pdf` (file): Original PDF file
  - `layout` (string): JSON layout model

**Layout JSON Format:**
```json
{
  "pageWidth": 595,
  "pageHeight": 842,
  "objects": [
    {
      "type": "text",
      "content": "Campus Hiring 2026",
      "x": 210,
      "y": 540,
      "fontSize": 36,
      "fontFamily": "Times-Roman",
      "color": "#000000",
      "rotation": 0
    }
  ]
}
```

**Response:**
- Content-Type: `application/pdf`
- Body: Edited PDF file (binary)

**Error Response:**
```json
{
  "error": "INVALID_INPUT",
  "message": "PDF file is empty"
}
```

### GET /api/pdf/health

Health check endpoint.

**Response:**
```
PDF Editor Service is running
```

## Key Features

### 1. Coordinate System Conversion
- Frontend uses **top-left origin** (web standard)
- PDF uses **bottom-left origin** (PDF standard)
- Service automatically converts: `pdfY = pageHeight - frontendY - fontSize`

### 2. Font Handling
Supports PDF Standard 14 fonts:
- Times (Roman, Bold, Italic, BoldItalic)
- Helvetica (Regular, Bold, Oblique, BoldOblique)
- Courier (Regular, Bold, Oblique, BoldOblique)
- Symbol, ZapfDingbats

Font mapping handles common aliases (e.g., "Arial" → "Helvetica")

### 3. Text Rendering
- Absolute positioning (canvas-style)
- Rotation support (in degrees)
- Color support (hex format)
- Font size scaling

## Tech Stack

- **Java 17**
- **Spring Boot 3.2.0**
- **Apache PDFBox 3.0.1**
- **Maven 3.9.6**
- **Lombok** (for cleaner code)

## Build & Run

### Prerequisites
- JDK 17 or higher
- Maven (or use included Maven wrapper)

### Build
```bash
cd editing_engine/java-pdf-editor-backend
./mvnw clean install
```

### Run
```bash
./mvnw spring-boot:run
```

Server starts on `http://localhost:8080`

### Build JAR
```bash
./mvnw clean package
java -jar target/pdf-editor-backend-1.0.0.jar
```

## Testing with cURL

```bash
curl -X POST http://localhost:8080/api/pdf/edit \
  -F "pdf=@input.pdf" \
  -F 'layout={"pageWidth":595,"pageHeight":842,"objects":[{"type":"text","content":"Hello World","x":100,"y":100,"fontSize":24,"fontFamily":"Helvetica","color":"#FF0000","rotation":0}]}' \
  --output edited.pdf
```

## Testing with Postman

1. Create POST request to `http://localhost:8080/api/pdf/edit`
2. Body → form-data
3. Add key `pdf` (type: File), select your PDF
4. Add key `layout` (type: Text), paste JSON
5. Send → Save response as PDF

## Project Structure

```
src/main/java/com/ninjapdf/editor/
├── PdfEditorApplication.java      # Main Spring Boot app
├── controller/
│   └── PdfEditorController.java   # REST API endpoints
├── service/
│   └── PdfEditorService.java      # Core PDF processing logic
└── model/
    ├── TextObject.java            # Text object model
    ├── LayoutModel.java           # Layout container
    ├── EditRequest.java           # Request DTO
    └── ErrorResponse.java         # Error response model
```

## Configuration

Edit `src/main/resources/application.properties`:

```properties
# Server port
server.port=8080

# Max file upload size
spring.servlet.multipart.max-file-size=50MB
spring.servlet.multipart.max-request-size=50MB

# Logging
logging.level.com.ninjapdf.editor=INFO
```

## Design Decisions

### 1. Why Apache PDFBox?
- Pure Java, no native dependencies
- Comprehensive PDF manipulation
- Active development & good documentation
- Handles Standard 14 fonts without embedding

### 2. Why Append Mode?
- Preserves original PDF structure
- Adds text on top (overlay)
- Faster than full reconstruction
- Can be changed to OVERWRITE if needed

### 3. Single Page Focus
- Current implementation edits page 0
- Easy to extend to multi-page:
  - Add `pageNumber` field to `TextObject`
  - Loop through pages and filter objects

### 4. Standard 14 Fonts First
- No font file embedding needed
- Fast & reliable
- Future: Add TrueType font support

## Future Enhancements

1. **Multi-page Support**
   - Add page number to TextObject
   - Process each page independently

2. **Custom Font Embedding**
   - Accept TTF files from frontend
   - Embed & subset fonts in PDF

3. **OCR Integration**
   - Extract text from image-based PDFs
   - Combine with layout editing

4. **Batch Processing**
   - Process multiple PDFs
   - Async job queue

5. **Image Support**
   - Add image objects to layout
   - Position & scale images

6. **Performance**
   - Caching for large PDFs
   - Streaming for memory efficiency

## Production Considerations

1. **Security**
   - Validate PDF files (check file type, size)
   - Sanitize JSON input
   - Rate limiting
   - Proper CORS configuration

2. **Error Handling**
   - Comprehensive logging
   - Meaningful error messages
   - Fallback strategies

3. **Scaling**
   - Stateless design (ready for horizontal scaling)
   - Can add Redis for caching
   - Consider async processing for large files

4. **Monitoring**
   - Add metrics (processing time, error rates)
   - Health checks
   - Logging aggregation

## Integration Example

### Frontend (Next.js)

```typescript
async function savePdfEdits(pdfFile: File, layout: LayoutModel) {
  const formData = new FormData();
  formData.append('pdf', pdfFile);
  formData.append('layout', JSON.stringify(layout));

  const response = await fetch('http://localhost:8080/api/pdf/edit', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const blob = await response.blob();
  // Download or display edited PDF
  const url = URL.createObjectURL(blob);
  window.open(url);
}
```

## License

[Your License Here]

## Support

For issues or questions, contact [Your Contact Info]
