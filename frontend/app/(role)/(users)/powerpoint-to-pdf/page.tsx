import { ToolShell } from "@/app/components/layout/tool-shell";
import { PowerPointToPdfTool } from "@/app/components/tools/powerpoint-to-pdf";

export default function PowerPointToPdfPage() {
    return (
        <ToolShell
            title="PowerPoint to PDF"
            description="Make PPT and PPTX slideshows easy to view by converting them to PDF."
        >
            <PowerPointToPdfTool />
        </ToolShell>
    );
}
