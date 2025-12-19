import { ToolShell } from "@/components/layout/tool-shell";
import { SignPdfTool } from "@/components/tools/sign-pdf";

export const metadata = {
    title: "Sign PDF - 18+ PDF",
    description: "Sign yourself or request electronic signatures from others.",
};

export default function SignPdfPage() {
    return (
        <ToolShell
            title="Sign PDF"
            description="Sign yourself or request electronic signatures from others."
        >
            <SignPdfTool />
        </ToolShell>
    );
}
