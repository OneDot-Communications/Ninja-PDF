import { ToolShell } from "../components/layout/tool-shell";
import { CompressPdfTool } from "../components/tools/compress-pdf";

export const metadata = {
    title: "Compress PDF - Ninja PDF",
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
