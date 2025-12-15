import { ToolShell } from "@/app/components/layout/tool-shell";
import { OcrPdfTool } from "@/app/components/tools/ocr-pdf";

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
