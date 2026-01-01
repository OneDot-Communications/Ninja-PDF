import { ToolShell } from "@/components/layout/tool-shell";
import { OrganizePdfTool } from "@/components/tools/organize-pdf";

export const metadata = {
    title: "Organize PDF - 18+ PDF",
    description: "Reorganize PDF pages with drag-and-drop simplicity. Rearrange page order, delete unwanted pages, duplicate important sections, and create the perfect document structure.",
};

export default function OrganizePdfPage() {
    return (
        <ToolShell
            title="Organize PDF"
            description="Reorganize PDF pages with drag-and-drop simplicity. Rearrange page order, delete unwanted pages, duplicate important sections, and create the perfect document structure."
            variant="editor"
        >
            <OrganizePdfTool />
        </ToolShell>
    );
}
