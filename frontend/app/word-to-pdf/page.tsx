import { ToolShell } from "../components/layout/tool-shell";
import { WordToPdfTool } from "../components/tools/word-to-pdf";

export const metadata = {
    title: "Word to PDF - 18+ PDF",
    description: "Make DOC and DOCX files easy to read by converting them to PDF.",
};

export default function WordToPdfPage() {
    return (
        <ToolShell
            title="Word to PDF"
            description="Make DOC and DOCX files easy to read by converting them to PDF."
        >
            <WordToPdfTool />
        </ToolShell>
    );
}
