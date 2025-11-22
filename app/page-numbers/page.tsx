import { ToolShell } from "../components/layout/tool-shell";
import { PageNumbersTool } from "../components/tools/page-numbers";

export const metadata = {
    title: "Page Numbers - OneDot PDF",
    description: "Add page numbers into PDFs with ease. Choose your positions, dimensions, typography.",
};

export default function PageNumbersPage() {
    return (
        <ToolShell
            title="Page Numbers"
            description="Add page numbers into PDFs with ease. Choose your positions, dimensions, typography."
        >
            <PageNumbersTool />
        </ToolShell>
    );
}
