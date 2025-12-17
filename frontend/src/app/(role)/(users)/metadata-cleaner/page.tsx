import { Metadata } from "next";
import { MetadataCleanerTool } from "@/components/tools/metadata-cleaner";
import { ToolShell } from "@/components/layout/tool-shell";

export const metadata: Metadata = {
    title: "Metadata Cleaner - Remove Hidden Data from PDF | 18+ PDF",
    description: "Clean hidden metadata from your PDF files including author, title, keywords, and creation date for enhanced privacy.",
};

export default function MetadataCleanerPage() {
    return (
        <ToolShell
            title="Metadata Cleaner"
            description="Remove hidden metadata and personal information from your PDF files."
        >
            <MetadataCleanerTool />
        </ToolShell>
    );
}
