"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, XCircle, Trash2, User, Mail, Calendar, MessageSquare } from "lucide-react";
import { api } from "@/lib/services/api";

interface Feedback {
    id: number;
    user: number | null;
    user_email: string | null;
    user_username: string | null;
    user_full_name: string | null;
    name: string;
    email: string;
    feedback_type: string;
    description: string;
    proof_link?: string;
    created_at: string;
    is_resolved: boolean;
    resolved_at: string | null;
    resolved_by_username: string | null;
    admin_notes: string;
}

interface PaginatedResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: Feedback[];
}

export default function AdminFeedbackPage() {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved'>('all');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
    const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
    const [adminNotes, setAdminNotes] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    const fetchFeedbacks = async () => {
        setLoading(true);
        try {
            const response: PaginatedResponse = await api.getAdminFeedbacks(statusFilter, page, 20);
            setFeedbacks(response.results);
            setTotalCount(response.count);
        } catch (error: any) {
            console.error("Error fetching feedbacks:", error);
            toast.error("Failed to load feedbacks");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeedbacks();
    }, [statusFilter, page]);

    const handleResolve = async () => {
        if (!selectedFeedback) return;

        setActionLoading(true);
        try {
            await api.resolveFeedback(selectedFeedback.id, adminNotes);
            toast.success("Feedback marked as resolved");
            setResolveDialogOpen(false);
            setAdminNotes("");
            setSelectedFeedback(null);
            fetchFeedbacks();
        } catch (error: any) {
            console.error("Error resolving feedback:", error);
            toast.error(error.message || "Failed to resolve feedback");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (feedbackId: number, feedbackName: string) => {
        if (!confirm(`Are you sure you want to delete feedback from ${feedbackName}?`)) {
            return;
        }

        try {
            await api.deleteFeedback(feedbackId);
            toast.success("Feedback deleted successfully");
            fetchFeedbacks();
        } catch (error: any) {
            console.error("Error deleting feedback:", error);
            toast.error(error.message || "Failed to delete feedback");
        }
    };

    const getFeedbackTypeBadge = (type: string) => {
        const colors: Record<string, string> = {
            bug: "bg-red-100 text-red-800",
            functionality: "bg-blue-100 text-blue-800",
            ui: "bg-purple-100 text-purple-800",
        };
        return colors[type] || "bg-gray-100 text-gray-800";
    };

    const totalPages = Math.ceil(totalCount / 20);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Feedback Management</h2>
                <p className="text-muted-foreground">Review and manage user feedback submissions</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 border-b">
                <button
                    onClick={() => { setStatusFilter('all'); setPage(1); }}
                    className={`pb-2 px-4 ${statusFilter === 'all' ? 'border-b-2 border-[#3371eb] text-[#3371eb]' : 'text-gray-500'}`}
                >
                    All ({totalCount})
                </button>
                <button
                    onClick={() => { setStatusFilter('pending'); setPage(1); }}
                    className={`pb-2 px-4 ${statusFilter === 'pending' ? 'border-b-2 border-[#3371eb] text-[#3371eb]' : 'text-gray-500'}`}
                >
                    Pending
                </button>
                <button
                    onClick={() => { setStatusFilter('resolved'); setPage(1); }}
                    className={`pb-2 px-4 ${statusFilter === 'resolved' ? 'border-b-2 border-[#3371eb] text-[#3371eb]' : 'text-gray-500'}`}
                >
                    Resolved
                </button>
            </div>

            {/* Feedbacks List */}
            {loading ? (
                <div className="text-center py-8">Loading feedbacks...</div>
            ) : feedbacks.length === 0 ? (
                <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                        No feedback submissions found.
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {feedbacks.map((feedback) => (
                        <Card key={feedback.id}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1 flex-1">
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-lg">{feedback.name}</CardTitle>
                                            <Badge className={getFeedbackTypeBadge(feedback.feedback_type)}>
                                                {feedback.feedback_type}
                                            </Badge>
                                            {feedback.is_resolved && (
                                                <Badge className="bg-green-100 text-green-800">
                                                    Resolved
                                                </Badge>
                                            )}
                                        </div>
                                        <CardDescription className="flex items-center gap-4 text-sm">
                                            <span className="flex items-center gap-1">
                                                <Mail className="w-3 h-3" />
                                                {feedback.email}
                                            </span>
                                            {feedback.user && (
                                                <span className="flex items-center gap-1">
                                                    <User className="w-3 h-3" />
                                                    {feedback.user_username}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(feedback.created_at).toLocaleDateString()}
                                            </span>
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        {!feedback.is_resolved && (
                                            <Button
                                                onClick={() => {
                                                    setSelectedFeedback(feedback);
                                                    setResolveDialogOpen(true);
                                                }}
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                <CheckCircle className="w-4 h-4 mr-1" />
                                                Resolve
                                            </Button>
                                        )}
                                        <Button
                                            onClick={() => handleDelete(feedback.id, feedback.name)}
                                            size="sm"
                                            variant="destructive"
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <p className="text-sm whitespace-pre-wrap">{feedback.description}</p>

                                    {feedback.proof_link && (
                                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                            <p className="text-xs font-semibold text-blue-800 mb-1">Proof Link:</p>
                                            <a
                                                href={feedback.proof_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-600 hover:text-blue-800 underline break-all"
                                            >
                                                {feedback.proof_link}
                                            </a>
                                        </div>
                                    )}

                                    {feedback.is_resolved && feedback.resolved_by_username && (
                                        <div className="mt-4 p-3 bg-green-50 rounded-lg text-sm">
                                            <p className="font-medium text-green-800">
                                                Resolved by {feedback.resolved_by_username} on {new Date(feedback.resolved_at!).toLocaleDateString()}
                                            </p>
                                            {feedback.admin_notes && (
                                                <p className="mt-1 text-green-700">
                                                    <strong>Notes:</strong> {feedback.admin_notes}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                    <Button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        variant="outline"
                    >
                        Previous
                    </Button>
                    <span className="flex items-center px-4">
                        Page {page} of {totalPages}
                    </span>
                    <Button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        variant="outline"
                    >
                        Next
                    </Button>
                </div>
            )}

            {/* Resolve Dialog */}
            <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Resolve Feedback</DialogTitle>
                        <DialogDescription>
                            Mark this feedback as resolved and optionally add admin notes.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="admin-notes">Admin Notes (Optional)</Label>
                            <Textarea
                                id="admin-notes"
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                placeholder="Add any notes about the resolution..."
                                rows={4}
                                className="mt-2"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setResolveDialogOpen(false);
                                setAdminNotes("");
                                setSelectedFeedback(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleResolve}
                            disabled={actionLoading}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {actionLoading ? "Resolving..." : "Mark as Resolved"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
