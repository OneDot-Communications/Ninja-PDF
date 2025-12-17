"use client";

import { PromptDialog } from "@/components/ui/prompt-dialog";

interface PasswordDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: string;
    onConfirm: (password: string) => void;
    confirmText?: string;
    requirePassword?: boolean;
}

export function PasswordDialog({
    open,
    onOpenChange,
    title = "Enter Password",
    description = "Please enter your password to continue.",
    onConfirm,
    confirmText = "Confirm",
    requirePassword = false,
}: PasswordDialogProps) {
    return (
        <PromptDialog
            open={open}
            onOpenChange={onOpenChange}
            title={title}
            description={description}
            label="Password"
            inputType="password"
            placeholder="••••••••"
            confirmText={confirmText}
            onConfirm={onConfirm}
        />
    );
}
