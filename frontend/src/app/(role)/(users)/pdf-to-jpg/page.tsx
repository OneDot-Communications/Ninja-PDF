import { ToolShell } from "@/components/layout/tool-shell";
import { PdfToJpgTool } from "@/components/tools/pdf-to-jpg";

export const metadata = {
    title: "PDF to JPG - 18+ PDF",
    description: "Convert each PDF page into a JPG or extract all images contained in a PDF.",
};

export default function PdfToJpgPage() {
    return (
        <ToolShell
            title="PDF to JPG"
            description="Convert each PDF page into a JPG or extract all images contained in a PDF."
            variant="editor"
        >
            <PdfToJpgTool />
        </ToolShell>
    );
}
