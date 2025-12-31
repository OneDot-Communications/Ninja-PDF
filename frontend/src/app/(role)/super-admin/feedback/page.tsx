"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Search, SlidersHorizontal, FileText, FileSpreadsheet, RefreshCw, Mail, Calendar, Check, Trash2, ArrowLeft, ExternalLink, Users } from "lucide-react";
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
    const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
    const [adminNotes, setAdminNotes] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

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
            setAdminNotes("");
            fetchFeedbacks();
            setSelectedFeedback(null);
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
            setSelectedFeedback(null);
        } catch (error: any) {
            console.error("Error deleting feedback:", error);
            toast.error(error.message || "Failed to delete feedback");
        }
    };

    const openDetails = (feedback: Feedback) => {
        setSelectedFeedback(feedback);
        setAdminNotes(feedback.admin_notes || "");
    };

    const pendingCount = feedbacks.filter(f => !f.is_resolved).length;
    const resolvedCount = feedbacks.filter(f => f.is_resolved).length;

    const filteredFeedbacks = feedbacks.filter(feedback => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            feedback.name.toLowerCase().includes(query) ||
            feedback.email.toLowerCase().includes(query) ||
            feedback.description.toLowerCase().includes(query) ||
            feedback.feedback_type.toLowerCase().includes(query)
        );
    });

    const totalPages = Math.ceil(totalCount / 20);

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    // Detail View
    if (selectedFeedback) {
        return (
            <div className="space-y-6">
                {/* Back Button */}
                <button
                    onClick={() => setSelectedFeedback(null)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Feedback Management
                </button>

                {/* Subtitle */}
                <p className="text-sm text-gray-600">Review submission from: <span className="font-semibold">{selectedFeedback.name}</span></p>

                {/* Title */}
                <h1 className="text-2xl font-bold text-gray-900">Feedback Details</h1>

                {/* Main Content Grid */}
                <div className="grid grid-cols-3 gap-6">
                    {/* Left Column - Feedback Info */}
                    <div className="col-span-2 space-y-6">
                        {/* User Info Card */}
                        <Card className="p-5 bg-gray-50 border-gray-200">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                                    {getInitials(selectedFeedback.name)}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900">{selectedFeedback.name}</h3>
                                    <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                                        <Mail className="w-3.5 h-3.5" />
                                        {selectedFeedback.email}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Calendar className="w-4 h-4" />
                                    <div>
                                        <div className="text-xs text-gray-500">Submitted</div>
                                        <div className="font-medium">{new Date(selectedFeedback.created_at).toLocaleDateString()}</div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Feedback Category */}
                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Feedback Category</label>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-md border border-blue-200">
                                <span className="text-blue-600">🏠</span>
                                {selectedFeedback.feedback_type}
                            </span>
                        </div>

                        {/* Feedback Message */}
                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Feedback Message</label>
                            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {selectedFeedback.description}
                                </p>
                            </div>
                        </div>

                        {/* Attached Images */}
                        {selectedFeedback.proof_link && (
                            <div>
                                <label className="text-sm font-semibold text-gray-700 mb-2 block">Attached Images</label>
                                <a
                                    href={selectedFeedback.proof_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                    View Proof Link
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Actions */}
                    <div className="space-y-6">
                        {/* Current Status */}
                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Current Status</label>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border ${selectedFeedback.is_resolved
                                    ? 'bg-green-50 text-green-700 border-green-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                <span className={`w-2 h-2 rounded-full ${selectedFeedback.is_resolved ? 'bg-green-600' : 'bg-amber-600'
                                    }`} />
                                {selectedFeedback.is_resolved ? 'Resolved' : 'Pending Review'}
                            </span>
                        </div>

                        {/* Quick Actions */}
                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-3 block">Quick Actions</label>
                            <div className="space-y-2">
                                {!selectedFeedback.is_resolved && (
                                    <Button
                                        onClick={handleResolve}
                                        disabled={actionLoading}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                                    >
                                        <Check className="w-4 h-4" />
                                        Mark as Resolved
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    className="w-full gap-2 border-gray-200"
                                    onClick={() => toast.info("Assign to Team - Coming soon")}
                                >
                                    <Users className="w-4 h-4" />
                                    Assign to Team
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={() => handleDelete(selectedFeedback.id, selectedFeedback.name)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Feedback
                                </Button>
                            </div>
                        </div>

                        {/* Internal Notes */}
                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Internal Notes</label>
                            <Textarea
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                placeholder="Add notes visible only to admins..."
                                rows={6}
                                className="resize-none"
                            />
                            <Button
                                onClick={() => toast.success("Notes saved")}
                                className="w-full mt-2 bg-gray-900 hover:bg-gray-800"
                            >
                                Save Note
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // List View
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Feedback Management</h1>
                <p className="text-sm text-gray-600 mt-1">Review and manage user feedback submissions.</p>
            </div>

            {/* Search and Actions Bar */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-10 h-10 bg-white border-gray-200 rounded-lg"
                    />
                    <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-xs text-gray-500 bg-gray-100 border border-gray-200 rounded">
                        /
                    </kbd>
                </div>
                <Button variant="outline" className="h-10 gap-2 border-gray-200">
                    <SlidersHorizontal className="w-4 h-4" />
                    Filter
                </Button>
                <Button className="h-10 bg-blue-600 hover:bg-blue-700 text-white">
                    Sort By
                </Button>
            </div>

            {/* Filter Pills and Export */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { setStatusFilter('all'); setPage(1); }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === 'all'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        All ({totalCount})
                    </button>
                    <button
                        onClick={() => { setStatusFilter('pending'); setPage(1); }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === 'pending'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        Pending ({pendingCount})
                    </button>
                    <button
                        onClick={() => { setStatusFilter('resolved'); setPage(1); }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === 'resolved'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        Resolved ({resolvedCount})
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        className="w-9 h-9 flex items-center justify-center bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        onClick={() => toast.info("Export as PDF - Coming soon")}
                    >
                        <FileText className="w-5 h-5 text-red-600" />
                    </button>
                    <button
                        className="w-9 h-9 flex items-center justify-center bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                        onClick={() => toast.info("Export as Excel - Coming soon")}
                    >
                        <FileSpreadsheet className="w-5 h-5 text-green-600" />
                    </button>
                    <button
                        className="w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        onClick={fetchFeedbacks}
                    >
                        <RefreshCw className="w-5 h-5 text-gray-700" />
                    </button>
                </div>
            </div>

            {/* Feedbacks List */}
            {loading ? (
                <div className="text-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">Loading feedbacks...</p>
                </div>
            ) : filteredFeedbacks.length === 0 ? (
                <Card className="p-8 text-center text-gray-500">
                    No feedback submissions found.
                </Card>
            ) : (
                <div className="space-y-4">
                    {filteredFeedbacks.map((feedback) => (
                        <Card
                            key={feedback.id}
                            className="overflow-hidden border-gray-200 bg-white relative cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => openDetails(feedback)}
                        >
                            {/* Left border indicator */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${feedback.is_resolved ? 'bg-transparent' : 'bg-amber-400'
                                }`} />

                            <div className="p-5 pl-6">
                                <div className="flex items-start justify-between">
                                    {/* Left content */}
                                    <div className="flex-1 space-y-3">
                                        {/* Name and badges */}
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h3 className="font-bold text-gray-900 uppercase tracking-wide">{feedback.name}</h3>
                                            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-200">
                                                {feedback.feedback_type}
                                            </span>
                                            <span className={`px-2.5 py-0.5 text-xs rounded-md border flex items-center gap-1 ${feedback.is_resolved
                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${feedback.is_resolved ? 'bg-green-600' : 'bg-amber-600'
                                                    }`} />
                                                {feedback.is_resolved ? 'Resolved' : 'Pending'}
                                            </span>
                                        </div>

                                        {/* Email and Date */}
                                        <div className="flex items-center gap-4 text-sm text-gray-600">
                                            <div className="flex items-center gap-1.5">
                                                <Mail className="w-4 h-4 text-gray-400" />
                                                <span>{feedback.email}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                <span>{new Date(feedback.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right actions */}
                                    <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                                        {!feedback.is_resolved && (
                                            <Button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openDetails(feedback);
                                                }}
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-700 text-white gap-1.5 h-9"
                                            >
                                                <Check className="w-4 h-4" />
                                                Resolve
                                            </Button>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(feedback.id, feedback.name);
                                            }}
                                            className="flex items-center gap-1.5 text-red-600 hover:text-red-700 text-sm font-medium px-3 h-9"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 pt-6">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed font-medium"
                    >
                        &lt; Previous
                    </button>
                    {Array.from({ length: Math.min(totalPages, 4) }, (_, i) => i + 1).map((pageNum) => (
                        <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${page === pageNum
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            {pageNum}
                        </button>
                    ))}
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed font-medium"
                    >
                        Next &gt;
                    </button>
                </div>
            )}
        </div>
    );
}
