"use client";

import { useState, useEffect, useCallback } from "react";

export function useSimulatedProgress(isProcessing: boolean) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isProcessing) {
            setProgress(0);
            interval = setInterval(() => {
                setProgress((prev) => {
                    // Fast initially, then slower as it approaches 90%
                    if (prev >= 90) return prev;

                    const jump = prev < 30 ? 10 : prev < 60 ? 5 : 1;
                    return Math.min(prev + jump, 90);
                });
            }, 500);
        } else {
            // When processing stops, jump to 100% then reset after a delay
            if (progress > 0 && progress < 100) {
                setProgress(100);
            }
        }

        return () => clearInterval(interval);
    }, [isProcessing]);

    return progress;
}
