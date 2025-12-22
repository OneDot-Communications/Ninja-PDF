"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus } from "lucide-react";

export function FeedbackButton() {
    // Simple mailto link for MVP feedback
    // In a real app, this would open a modal or Intercom widget
    const handleFeedback = () => {
        window.location.href = "mailto:support@18pluspdf.com?subject=Feedback for 18+ PDF";
    };

    return (
        <div className="fixed bottom-6 right-6 z-40">
            <Button
                onClick={handleFeedback}
                className="rounded-full h-12 w-12 shadow-lg bg-[#714B67] hover:bg-[#5a3a52] transition-all hover:scale-105"
                size="icon"
                title="Send Feedback"
            >
                <MessageSquarePlus className="h-6 w-6 text-white" />
            </Button>
        </div>
    );
}
