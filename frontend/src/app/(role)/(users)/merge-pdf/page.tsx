import { DynamicToolShell } from "@/components/layout/dynamic-tool-shell";
import { MergePdfTool } from "@/components/tools/merge-pdf";

export const metadata = {
    title: "Merge PDF - 18+ PDF",
    description: "Combine multiple PDF files into a single document effortlessly. Arrange pages in any order, merge unlimited files, and maintain original quality with our professional PDF merger tool.",
};

export default function MergePdfPage() {
    return (
        <DynamicToolShell
            toolCode="merge-pdf"
            defaultTitle="Merge PDF"
            defaultDescription="Combine multiple PDF files into a single document effortlessly. Arrange pages in any order, merge unlimited files, and maintain original quality with our professional PDF merger tool."
            toolVariant="editor" // use editor layout to hide footer for a cleaner upload experience
        >
            <MergePdfTool />
        </DynamicToolShell>
    );
}
