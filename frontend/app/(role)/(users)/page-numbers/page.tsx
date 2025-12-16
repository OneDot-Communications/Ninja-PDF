import { ToolShell } from "@/app/components/layout/tool-shell";
import { PageNumbersTool } from "@/app/components/tools/page-numbers";

export const metadata = {
    title: "Page Numbers - 18+ PDF",
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
