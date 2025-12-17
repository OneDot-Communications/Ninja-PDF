import { ToolShell } from "@/components/layout/tool-shell";
import { PdfToExcelTool } from "@/components/tools/pdf-to-excel";

export default function PdfToExcelPage() {
    return (
        <ToolShell
            title="PDF to Excel"
            description="Pull data straight from PDFs into Excel spreadsheets in a few short seconds."
        >
            <PdfToExcelTool />
        </ToolShell>
    );
}
