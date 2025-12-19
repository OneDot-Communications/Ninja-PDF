"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface PromptDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    label?: string;
    placeholder?: string;
    defaultValue?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: (value: string) => void;
    inputType?: string; // e.g. "text", "password", "email"
}

export function PromptDialog({
    open,
    onOpenChange,
    title,
    description,
    label,
    placeholder,
    defaultValue = "",
    confirmText = "Submit",
    cancelText = "Cancel",
    onConfirm,
    inputType = "text",
}: PromptDialogProps) {
    const [value, setValue] = useState(defaultValue);

    // Reset value when dialog opens
    useEffect(() => {
        if (open) {
            setValue(defaultValue);
        }
    }, [open, defaultValue]);

    const handleSubmit = () => {
        onConfirm(value);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        {label && <Label htmlFor="prompt-input">{label}</Label>}
                        <Input
                            id="prompt-input"
                            type={inputType}
                            placeholder={placeholder}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {cancelText}
                    </Button>
                    <Button onClick={handleSubmit}>{confirmText}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
