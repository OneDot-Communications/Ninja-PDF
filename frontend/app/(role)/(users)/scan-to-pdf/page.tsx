import { ToolShell } from "@/app/components/layout/tool-shell";
import { ScanToPdfTool } from "@/app/components/tools/scan-to-pdf";

export default function ScanToPdfPage() {
    return (
        <ToolShell
            title="Scan to PDF"
            description="Capture document scans from your mobile device and send them instantly to your browser."
        >
            <ScanToPdfTool />
        </ToolShell>
    );
}
