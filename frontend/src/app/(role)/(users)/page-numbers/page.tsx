import { ToolShell } from "@/components/layout/tool-shell";
import { PageNumbersTool } from "@/components/tools/page-numbers";

export const metadata = {
    title: "Page Numbers - 18+ PDF",
    description: "Add professional page numbering to PDF documents. Customize position, style, format, and appearance to create perfectly organized and navigable documents.",
};

export default function PageNumbersPage() {
    return (
        <ToolShell
            title="Page Numbers"
            description="Add professional page numbering to PDF documents. Customize position, style, format, and appearance to create perfectly organized and navigable documents."
            variant="editor"
        >
            <PageNumbersTool />
        </ToolShell>
    );
}
