import { ToolShell } from "../components/layout/tool-shell";
import { OcrPdfTool } from "../components/tools/ocr-pdf";

export default function OcrPdfPage() {
    return (
        <ToolShell
            title="OCR PDF"
            description="Easily convert scanned PDF into searchable and selectable documents."
        >
            <OcrPdfTool />
        </ToolShell>
    );
}
