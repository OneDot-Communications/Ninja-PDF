import { ToolShell } from "@/app/components/layout/tool-shell";
import { AdvancedPdfEditor } from "@/app/components/tools/live-edit";

export const metadata = {
    title: "Live Edit PDF - 18+ PDF",
    description: "Advanced real-time PDF editor with layers, rich text, and media support.",
};

export default function LiveEditPage() {
    return (
        <ToolShell
            title="Live Edit PDF"
            description="Advanced real-time PDF editor with layers, rich text, and media support."
            variant="editor"
        >
            <AdvancedPdfEditor />
        </ToolShell>
    );
}
