import { ToolShell } from "../components/layout/tool-shell";
import { OrganizePdfTool } from "../components/tools/organize-pdf";

export const metadata = {
    title: "Organize PDF - OneDot PDF",
    description: "Sort pages of your PDF file however you like. Delete PDF pages or add PDF pages to your document at your convenience.",
};

export default function OrganizePdfPage() {
    return (
        <ToolShell
            title="Organize PDF"
            description="Sort pages of your PDF file however you like. Delete PDF pages or add PDF pages to your document at your convenience."
        >
            <OrganizePdfTool />
        </ToolShell>
    );
}
