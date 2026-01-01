import { ToolShell } from "@/components/layout/tool-shell";
import { EditPdfTool } from "@/components/tools/edit-pdf";

export const metadata = {
    title: "Edit PDF - 18+ PDF",
    description: "Modify PDF content with our intuitive editor. Add text, images, shapes, annotations, and highlights. Edit existing text, resize elements, and create professional documents.",
};

export default function EditPdfPage() {
    return (
        <ToolShell
            title="Edit PDF"
            description="Modify PDF content with our intuitive editor. Add text, images, shapes, annotations, and highlights. Edit existing text, resize elements, and create professional documents."
            variant="editor"
        >
            <EditPdfTool />
        </ToolShell>
    );
}
