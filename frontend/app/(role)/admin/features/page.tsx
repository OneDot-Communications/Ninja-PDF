"use client";

// Reusing the Super Admin component for now, but we can add 'readOnly' prop later if needed
// or strict permissions check inside the component.
// For now, let's just make sure the page exists.
import SuperAdminFeaturesPage from "@/app/(role)/super-admin/features/page";

export default function AdminFeaturesPage() {
    return <SuperAdminFeaturesPage />;
}
