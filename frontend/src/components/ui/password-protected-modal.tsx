"use client";

import { Lock, X } from "lucide-react";
import { Button } from "./button";
import { useRouter } from "next/navigation";

interface PasswordProtectedModalProps {
    isOpen: boolean;
    onClose: () => void;
    toolName?: string;
}

export function PasswordProtectedModal({
    isOpen,
    onClose,
    toolName = "processing"
}: PasswordProtectedModalProps) {
    const router = useRouter();

    if (!isOpen) return null;

    const handleGoToUnlock = () => {
        router.push('/unlock-pdf');
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in-95 duration-200">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Lock Icon */}
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-[#4383BF]/10 flex items-center justify-center">
                        <Lock className="h-10 w-10 text-[#4383BF]" />
                    </div>
                </div>

                {/* Title and Message */}
                <h2 className="text-2xl font-bold text-center text-[#111418] mb-2">
                    Password Protected PDF
                </h2>
                <p className="text-[#617289] text-center text-sm mb-6">
                    This PDF is password-protected and cannot be opened without the correct password.
                    Please unlock it first before {toolName}.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3">
                    <Button
                        onClick={handleGoToUnlock}
                        className="w-full h-12 bg-[#4383BF] hover:bg-[#3470A0] text-white rounded-xl font-semibold flex items-center justify-center gap-2"
                    >
                        <Lock className="h-5 w-5" />
                        Go to Unlock PDF
                    </Button>
                    <button
                        onClick={onClose}
                        className="w-full h-12 bg-gray-100 hover:bg-gray-200 text-[#617289] rounded-xl font-semibold transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
