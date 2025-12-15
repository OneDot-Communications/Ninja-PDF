# 🧪 How to Test Your PDF Editor Backend

## ✅ What I Built For You

I created a **Java backend service** that takes a PDF and adds text to it exactly where you want. Think of it like Photoshop but for PDFs - you give it coordinates (x, y) and it places text there.

---

## 🎯 What Does It Do?

### The Problem It Solves:
Your frontend (Next.js + PDF.js + Fabric.js) lets users **visually edit PDFs** - drag text, resize, rotate. But the browser can't save those changes back to a PDF file. That's what this backend does!

### How It Works:
1. **Frontend sends**: Original PDF + JSON with text positions
2. **Backend receives**: Processes using Apache PDFBox
3. **Backend returns**: New PDF with text added at exact positions

### Why This Architecture?
- ✅ **Coordinate conversion**: Web uses top-left origin, PDF uses bottom-left
- ✅ **Font handling**: Maps web fonts to PDF fonts
- ✅ **Precision**: Places text at pixel-perfect positions
- ✅ **Scalable**: Can later add OCR, images, multi-page support

---

## 🚀 Testing Steps

### 1. Make Sure Backend is Running

Open a terminal and run:
```powershell
cd D:\CHN\Ninja-PDF\Ninja-PDF\editing_engine\java-pdf-editor-backend
java -jar target/pdf-editor-backend-1.0.0.jar
```

You should see:
```
Started PdfEditorApplication in X.XXX seconds
Tomcat started on port 8080
```

✅ Backend is now running on **http://localhost:8080**

---

### 2. Open the Test Frontend

Double-click this file:
```
D:\CHN\Ninja-PDF\Ninja-PDF\editing_engine\java-pdf-editor-backend\test-frontend.html
```

Or right-click → Open with → Browser

---

### 3. Test the Backend

#### What You'll See:
- **Status box** at top - should show "✅ Backend Connected"
- **Step 1**: Upload a PDF file
- **Step 2**: Configure text to add (content, position, color, font)
- **Step 3**: Process button

#### How to Test:

1. **Upload any PDF** (Step 1)
   - Click "Select a PDF file"
   - Choose any PDF from your computer
   - You'll see file info appear

2. **Configure text** (Step 2)
   - Text: "Hello from PDF Editor!"
   - X Position: 100 (pixels from left)
   - Y Position: 100 (pixels from top)
   - Font Size: 24
   - Color: Black
   - Watch the **JSON Preview** update in real-time

3. **Process PDF** (Step 3)
   - Click "Process PDF & Download"
   - Backend processes it
   - Edited PDF downloads automatically
   - Open the downloaded PDF - you'll see your text added!

---

## 📋 What Each Part Does

### Backend Components:

```
PdfEditorController.java
├─ Receives: PDF file + JSON
├─ Validates: File exists, JSON valid
└─ Returns: Edited PDF

PdfEditorService.java
├─ Loads PDF using PDFBox
├─ Converts coordinates (top-left → bottom-left)
├─ Maps fonts (Helvetica, Times, Courier)
├─ Draws text at specified position
└─ Saves new PDF

Models (TextObject, LayoutModel)
└─ Define structure of JSON data
```

### Frontend Test Page:

```html
test-frontend.html
├─ File upload
├─ Text configuration form
├─ JSON preview (shows what's sent to backend)
├─ Process button
└─ Auto-download result
```

---

## 🎨 Example Test Scenarios

### Test 1: Simple Text
- Text: "Campus Hiring 2026"
- X: 200, Y: 100
- Font: Helvetica, Size: 36
- Color: Black

### Test 2: Rotated Text
- Text: "CONFIDENTIAL"
- X: 300, Y: 400
- Font: Times-Bold, Size: 48
- Color: Red (#FF0000)
- Rotation: 45

### Test 3: Multiple Positions
Run the test 3 times with different Y positions:
- Y: 100 → "Line 1"
- Y: 150 → "Line 2"
- Y: 200 → "Line 3"

---

## 🔍 Understanding the JSON

When you configure text in the frontend, it creates this JSON:

```json
{
  "pageWidth": 595,     // A4 page width
  "pageHeight": 842,    // A4 page height
  "objects": [
    {
      "type": "text",
      "content": "Hello",
      "x": 100,           // 100px from left
      "y": 100,           // 100px from top
      "fontSize": 24,
      "fontFamily": "Helvetica",
      "color": "#000000",
      "rotation": 0
    }
  ]
}
```

This gets sent to: `POST http://localhost:8080/api/pdf/edit`

---

## 🐛 Troubleshooting

### "Backend Not Running" Error
**Fix**: Start the backend:
```bash
cd editing_engine/java-pdf-editor-backend
java -jar target/pdf-editor-backend-1.0.0.jar
```

### CORS Error in Browser Console
**Fix**: Backend already has CORS enabled with `@CrossOrigin(origins = "*")`

### PDF Not Downloading
1. Check browser's download settings
2. Look for blocked pop-ups
3. Check browser console for errors (F12)

### Text Not Appearing in PDF
1. Check X, Y coordinates are within page bounds (595 x 842)
2. Ensure color isn't white on white background
3. Try increasing font size

---

## 📊 What Gets Logged

In the backend terminal, you'll see:
```
Starting PDF edit operation
Parsed layout with 1 objects
Drawing text 'Hello' at frontend coords (100, 100) -> PDF coords (100, 742)
PDF editing completed successfully
```

This shows:
- Request received ✓
- JSON parsed ✓
- Coordinate conversion ✓
- Text drawn ✓
- PDF saved ✓

---

## 🎯 Key Technical Details

### 1. Coordinate System Conversion
```
Frontend (Web):     Backend (PDF):
┌─────────┐         └─────────┐
│ (0,0)   │         │         │
│         │         │ (0,842) │
│         │         │         │
│    (595,│         ├─────────┘
│     842)│         (595,0)
└─────────┘
```

Formula: `pdfY = pageHeight - webY - fontSize`

### 2. Font Mapping
- Helvetica → PDFBox Standard14Fonts.HELVETICA
- Times-Roman → PDFBox Standard14Fonts.TIMES_ROMAN
- Arial → Mapped to Helvetica (similar)

### 3. Color Conversion
- Web: `#FF0000` (hex)
- PDF: `Color(255, 0, 0)` (RGB)

---

## 🚀 Next Steps

Once testing works:

1. **Integrate with your Next.js frontend**:
   - Use the API: `POST /api/pdf/edit`
   - Send PDF + layout JSON from your editor
   - Download result

2. **Add more features**:
   - Multi-page support (add `pageNumber` to TextObject)
   - Image support
   - Custom fonts
   - OCR integration

3. **Deploy**:
   - Build: `mvn clean package`
   - Run on server
   - Update frontend API URL

---

## 📞 Test Success Checklist

- [ ] Backend starts without errors
- [ ] Test page shows "Backend Connected"
- [ ] Can upload a PDF
- [ ] Can see JSON preview
- [ ] Process button works
- [ ] PDF downloads
- [ ] Opened PDF shows added text
- [ ] Text is at correct position
- [ ] Can change font, color, size
- [ ] Rotation works

**If all checked ✅ → Backend is working perfectly!**

---

## 💡 Understanding the Architecture

```
┌─────────────────────────────────────────────────┐
│                  Your Frontend                   │
│         (Next.js + PDF.js + Fabric.js)          │
│                                                  │
│  User drags text → Fabric.js tracks position    │
│  User edits → Updates coordinates in memory     │
│  User clicks Save → Sends to backend            │
└──────────────────┬──────────────────────────────┘
                   │
                   │ HTTP POST /api/pdf/edit
                   │ {pdf: file, layout: JSON}
                   │
                   ↓
┌─────────────────────────────────────────────────┐
│              Java Backend (This!)                │
│         Spring Boot + Apache PDFBox             │
│                                                  │
│  1. Receives PDF + JSON                         │
│  2. Loads PDF with PDFBox                       │
│  3. Converts coordinates                        │
│  4. Draws text at positions                     │
│  5. Returns new PDF                             │
└──────────────────┬──────────────────────────────┘
                   │
                   │ Returns edited PDF
                   │
                   ↓
┌─────────────────────────────────────────────────┐
│                    Browser                       │
│          Downloads/Displays PDF                  │
└─────────────────────────────────────────────────┘
```

This backend is the **PDF rendering engine** - it takes your visual edits and "burns" them into a real PDF file.

---

**Ready to test? Open test-frontend.html and start uploading PDFs!** 🎉
