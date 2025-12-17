import { ToolShell } from "@/components/layout/tool-shell";
import { ExcelToPdfTool } from "@/components/tools/excel-to-pdf";

export default function ExcelToPdfPage() {
    return (
        <ToolShell
            title="Excel to PDF"
            description="Make EXCEL spreadsheets easy to read by converting them to PDF."
        >
            <ExcelToPdfTool />
        </ToolShell>
    );
}
