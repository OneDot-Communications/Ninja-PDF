import { ToolShell } from "@/components/layout/tool-shell";
import { OcrPdfTool } from "@/components/tools/ocr-pdf";

export default function OcrPdfPage() {
    return (
        <ToolShell
            title="OCR PDF"
            description="Transform scanned PDFs and images into searchable, editable text documents. Our advanced OCR technology recognizes text in multiple languages with high accuracy."
            variant="editor"
        >
            <OcrPdfTool />
        </ToolShell>
    );
}
