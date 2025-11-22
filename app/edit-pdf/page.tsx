import { ToolShell } from "../components/layout/tool-shell";
import { EditPdfTool } from "../components/tools/edit-pdf";

export const metadata = {
    title: "Edit PDF - OneDot PDF",
    description: "Add text, images, shapes or freehand annotations to a PDF document.",
};

export default function EditPdfPage() {
    return (
        <ToolShell
            title="Edit PDF"
            description="Add text, images, shapes or freehand annotations to a PDF document."
        >
            <EditPdfTool />
        </ToolShell>
    );
}
