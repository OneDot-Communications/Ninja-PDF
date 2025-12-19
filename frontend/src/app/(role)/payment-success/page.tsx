"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/services/api";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const PaymentSuccessContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("session_id");
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [message, setMessage] = useState("Verifying payment...");
    const hasVerified = useRef(false);

    useEffect(() => {
        if (!sessionId) {
            setStatus('error');
            setMessage("Invalid Session ID");
            return;
        }

        if (hasVerified.current) return;
        hasVerified.current = true;

        const verify = async () => {
            try {
                await api.verifyPayment({ session_id: sessionId });
                setStatus('success');
                setMessage("Payment Successful! Upgrading your plan...");
                setTimeout(() => router.push("/"), 3000);
            } catch (error: any) {
                console.error(error);
                setStatus('error');
                setMessage(error.message || "Payment verification failed");
            }
        };
        verify();
    }, [sessionId, router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center p-4">
            {status === 'verifying' && (
                <>
                    <Loader2 className="w-16 h-16 animate-spin text-violet-600" />
                    <h2 className="text-2xl font-bold">Verifying Payment...</h2>
                    <p className="text-muted-foreground">Please wait while we confirm your transaction.</p>
                </>
            )}

            {status === 'success' && (
                <>
                    <CheckCircle className="w-16 h-16 text-green-500" />
                    <h2 className="text-2xl font-bold">Success!</h2>
                    <p className="text-muted-foreground">Your plan has been upgraded. Redirecting to home in 3 seconds...</p>
                    <Button onClick={() => router.push("/")}>Go to Home Now</Button>
                </>
            )}

            {status === 'error' && (
                <>
                    <XCircle className="w-16 h-16 text-red-500" />
                    <h2 className="text-2xl font-bold">Verification Failed</h2>
                    <p className="text-muted-foreground">{message}</p>
                    <Button onClick={() => router.push("/pricing")}>Return to Pricing</Button>
                </>
            )}
        </div>
    );
};

export default function PaymentSuccessPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="w-10 h-10 animate-spin" /></div>}>
            <PaymentSuccessContent />
        </Suspense>
    );
}
