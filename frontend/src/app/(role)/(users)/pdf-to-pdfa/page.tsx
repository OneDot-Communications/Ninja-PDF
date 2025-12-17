import { ToolShell } from "@/components/layout/tool-shell";
import { PdfToPdfATool } from "@/components/tools/pdf-to-pdfa";

export const metadata = {
    title: "PDF to PDF/A - 18+ PDF",
    description: "Transform your PDF to PDF/A, the ISO-standardized version of PDF for long-term archiving.",
};

export default function PdfToPdfAPage() {
    return (
        <ToolShell
            title="PDF to PDF/A"
            description="Transform your PDF to PDF/A, the ISO-standardized version of PDF for long-term archiving."
        >
            <PdfToPdfATool />
        </ToolShell>
    );
}
