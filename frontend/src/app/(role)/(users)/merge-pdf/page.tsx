import { DynamicToolShell } from "@/components/layout/dynamic-tool-shell";
import { MergePdfTool } from "@/components/tools/merge-pdf";

export const metadata = {
    title: "Merge PDF - 18+ PDF",
    description: "Combine PDFs in the order you want with the easiest PDF merger available.",
};

export default function MergePdfPage() {
    return (
        <DynamicToolShell
            toolCode="merge-pdf"
            defaultTitle="Merge PDF"
            defaultDescription="Combine PDFs in the order you want with the easiest PDF merger available."
            toolVariant="editor" // use editor layout to hide footer for a cleaner upload experience
        >
            <MergePdfTool />
        </DynamicToolShell>
    );
}
