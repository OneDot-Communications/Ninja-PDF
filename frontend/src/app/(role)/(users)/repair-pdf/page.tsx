import { ToolShell } from "@/components/layout/tool-shell";
import { RepairPdfTool } from "@/components/tools/repair-pdf";

export const metadata = {
    title: "Repair PDF - 18+ PDF",
    description: "Repair a damaged PDF and recover data from corrupt PDF.",
};

export default function RepairPdfPage() {
    return (
        <ToolShell
            title="Repair PDF"
            description="Repair a damaged PDF and recover data from corrupt PDF."
        >
            <RepairPdfTool />
        </ToolShell>
    );
}
