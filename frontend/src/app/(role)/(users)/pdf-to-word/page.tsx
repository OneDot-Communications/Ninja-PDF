import { ToolShell } from "@/components/layout/tool-shell";
import { PdfToWordTool } from "@/components/tools/pdf-to-word";

export const metadata = {
    title: "PDF to Word - 18+ PDF",
    description: "Transform PDF documents into fully editable Word files (DOC/DOCX). Extract text, images, and formatting with high accuracy for seamless document editing and collaboration.",
};

export default function PdfToWordPage() {
    return (
        <ToolShell
            title="PDF to Word"
            description="Transform PDF documents into fully editable Word files (DOC/DOCX). Extract text, images, and formatting with high accuracy for seamless document editing and collaboration."
            variant="editor"
        >
            <PdfToWordTool />
        </ToolShell>
    );
}
