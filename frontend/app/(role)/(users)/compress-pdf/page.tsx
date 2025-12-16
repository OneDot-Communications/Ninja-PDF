import { ToolShell } from "@/app/components/layout/tool-shell";
import { CompressPdfTool } from "@/app/components/tools/compress-pdf";

export const metadata = {
    title: "Compress PDF - 18+ PDF",
    description: "Reduce file size while optimizing for maximal PDF quality.",
};

export default function CompressPdfPage() {
    return (
        <ToolShell
            title="Compress PDF"
            description="Reduce file size while optimizing for maximal PDF quality."
        >
            <CompressPdfTool />
        </ToolShell>
    );
}
