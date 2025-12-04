import { ToolShell } from "../components/layout/tool-shell";
import { MergePdfTool } from "../components/tools/merge-pdf";

export const metadata = {
    title: "Merge PDF - OneDot PDF",
    description: "Combine PDFs in the order you want with the easiest PDF merger available.",
};

export default function MergePdfPage() {
    return (
        <ToolShell
            title="Merge PDF"
            description="Combine PDFs in the order you want with the easiest PDF merger available."
        >
            <MergePdfTool />
        </ToolShell>
    );
}
