'use client';

import React from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Progress } from '@/app/components/ui/progress'; // Ensure this exists or use standard
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ProcessingStateProps {
    status: 'idle' | 'created' | 'uploading' | 'validated' | 'queued' | 'processing' | 'success' | 'completed' | 'error' | 'failed';
    progress?: number; // 0-100
    message?: string;
    resultUrl?: string;
    error?: string;
    onReset?: () => void;
}

export function ProcessingState({ status, progress = 0, message, resultUrl, error, onReset }: ProcessingStateProps) {
    if (status === 'idle') return null;

    return (
        <div className="w-full max-w-md mx-auto p-6 border rounded-xl bg-card shadow-sm space-y-4 text-center animate-in fade-in zoom-in duration-300">

            {/* Icons */}
            <div className="flex justify-center mb-4">
                {(status === 'uploading' || status === 'processing') && (
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                )}
                {status === 'success' && (
                    <CheckCircle className="w-12 h-12 text-green-500 animate-bounce" />
                )}
                {status === 'error' && (
                    <XCircle className="w-12 h-12 text-destructive animate-pulse" />
                )}
            </div>

            {/* Title & Message */}
            <h3 className="text-xl font-semibold">
                {status === 'uploading' && "Uploading File..."}
                {status === 'processing' && "Processing..."}
                {status === 'success' && "Complete!"}
                {status === 'error' && "Something went wrong"}
            </h3>

            {message && <p className="text-muted-foreground">{message}</p>}

            {/* Progress Bar */}
            {(status === 'uploading' || status === 'processing') && (
                <div className="w-full space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right">{progress}%</p>
                </div>
            )}

            {/* Actions */}
            {status === 'success' && resultUrl && (
                <div className="pt-2 space-y-2">
                    <Button asChild className="w-full" size="lg">
                        <a href={resultUrl} download>Download File</a>
                    </Button>
                    <Button variant="outline" onClick={onReset} className="w-full">
                        Convert Another
                    </Button>
                </div>
            )}

            {status === 'error' && (
                <div className="pt-2 space-y-2">
                    <p className="text-destructive text-sm bg-destructive/10 p-2 rounded">{error}</p>
                    <Button onClick={onReset} variant="secondary" className="w-full">
                        Try Again
                    </Button>
                </div>
            )}
        </div>
    );
}

// Minimal Progress Component Stub if shadcn/ui one missing
function SimpleProgress({ value, className }: { value: number, className?: string }) {
    return (
        <div className={cn("w-full bg-secondary rounded-full overflow-hidden", className)}>
            <div
                className="bg-primary h-full transition-all duration-500 ease-in-out"
                style={{ width: `${value}%` }}
            />
        </div>
    );
}
