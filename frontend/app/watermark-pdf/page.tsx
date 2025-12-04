import { ToolShell } from "../components/layout/tool-shell";
import { WatermarkPdfTool } from "../components/tools/watermark-pdf";

export const metadata = {
    title: "Watermark PDF - OneDot PDF",
    description: "Stamp an image or text over your PDF in seconds. Choose the typography, transparency and position.",
};

export default function WatermarkPdfPage() {
    return (
        <ToolShell
            title="Watermark PDF"
            description="Stamp an image or text over your PDF in seconds. Choose the typography, transparency and position."
        >
            <WatermarkPdfTool />
        </ToolShell>
    );
}
