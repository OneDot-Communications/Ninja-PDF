import { ToolShell } from "../components/layout/tool-shell";
import { SplitPdfTool } from "../components/tools/split-pdf";

export const metadata = {
    title: "Split PDF - 18+ PDF",
    description: "Separate one page or a whole set for easy conversion into independent PDF files.",
};

export default function SplitPdfPage() {
    return (
        <ToolShell
            title="Split PDF"
            description="Separate one page or a whole set for easy conversion into independent PDF files."
        >
            <SplitPdfTool />
        </ToolShell>
    );
}
