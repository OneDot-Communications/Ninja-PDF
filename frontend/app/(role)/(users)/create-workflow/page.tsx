import { ToolShell } from "@/app/components/layout/tool-shell";
import { CreateWorkflowTool } from "@/app/components/tools/create-workflow";

export default function CreateWorkflowPage() {
    return (
        <ToolShell
            title="Create Workflow"
            description="Create custom workflows with your favorite tools, automate tasks, and reuse them anytime."
        >
            <CreateWorkflowTool />
        </ToolShell>
    );
}
