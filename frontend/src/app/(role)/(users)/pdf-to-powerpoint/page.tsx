import { ToolShell } from "@/components/layout/tool-shell";
import { PdfToPowerPointTool } from "@/components/tools/pdf-to-powerpoint";

export default function PdfToPowerPointPage() {
    return (
        <ToolShell
            title="PDF to PowerPoint"
            description="Turn your PDF files into easy to edit PPT and PPTX slideshows."
        >
            <PdfToPowerPointTool />
        </ToolShell>
    );
}
