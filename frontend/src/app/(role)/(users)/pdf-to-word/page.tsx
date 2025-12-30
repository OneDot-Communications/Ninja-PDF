import { ToolShell } from "@/components/layout/tool-shell";
import { PdfToWordTool } from "@/components/tools/pdf-to-word";

export const metadata = {
    title: "PDF to Word - 18+ PDF",
    description: "Easily convert your PDF files into easy to edit DOC and DOCX documents.",
};

export default function PdfToWordPage() {
    return (
        <ToolShell
            title="PDF to Word"
            description="Easily convert your PDF files into easy to edit DOC and DOCX documents."
            variant="editor"
        >
            <PdfToWordTool />
        </ToolShell>
    );
}
