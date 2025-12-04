import { ToolShell } from "../components/layout/tool-shell";
import { HtmlToPdfTool } from "../components/tools/html-to-pdf";

export const metadata = {
    title: "HTML to PDF - OneDot PDF",
    description: "Convert webpages in HTML to PDF.",
};

export default function HtmlToPdfPage() {
    return (
        <ToolShell
            title="HTML to PDF"
            description="Convert webpages in HTML to PDF."
        >
            <HtmlToPdfTool />
        </ToolShell>
    );
}
