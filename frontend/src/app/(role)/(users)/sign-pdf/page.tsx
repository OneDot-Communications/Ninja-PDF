import { ToolShell } from "@/components/layout/tool-shell";
import { SignPdfTool } from "@/components/tools/sign-pdf";

export const metadata = {
    title: "Sign PDF - 18+ PDF",
    description: "Add legally binding electronic signatures to PDF documents. Create signature requests, place signatures anywhere on the document, and track signing progress in real-time.",
};

export default function SignPdfPage() {
    return (
        <ToolShell
            title="Sign PDF"
            description="Add legally binding electronic signatures to PDF documents. Create signature requests, place signatures anywhere on the document, and track signing progress in real-time."
            variant="editor"
        >
            <SignPdfTool />
        </ToolShell>
    );
}
