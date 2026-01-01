import { ToolShell } from "@/components/layout/tool-shell";
import { WordToPdfTool } from "@/components/tools/word-to-pdf";

export const metadata = {
    title: "Word to PDF - 18+ PDF",
    description: "Convert Microsoft Word documents (DOC, DOCX) to professional PDF format. Preserve formatting, images, and layout while ensuring universal compatibility and security.",
};

export default function WordToPdfPage() {
    return (
        <ToolShell
            title="Word to PDF"
            description="Convert Microsoft Word documents (DOC, DOCX) to professional PDF format. Preserve formatting, images, and layout while ensuring universal compatibility and security."
            variant="editor"
        >
            <WordToPdfTool />
        </ToolShell>
    );
}
