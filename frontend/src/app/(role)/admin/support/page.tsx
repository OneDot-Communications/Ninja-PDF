"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/services/api";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MessageSquare, User, Lock, Send, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Use real data types
interface Ticket {
    id: number;
    subject: string;
    description: string;
    status: string;
    priority: string;
    user_email: string;
    created_at: string;
    assigned_to_name?: string;
    assigned_to?: number;
}

interface Message {
    id: number;
    user_name: string;
    message: string;
    created_at: string;
    is_internal: boolean;
    is_staff: boolean;
}

export default function SupportTicketsPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("OPEN");

    // Detail View
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [isInternalNote, setIsInternalNote] = useState(false);

    useEffect(() => {
        loadTickets();
    }, [filterStatus]);

    const loadTickets = async () => {
        setLoading(true);
        try {
            // Add 'status' filter if not 'ALL'
            const params: any = {};
            if (filterStatus !== "ALL") params.status = filterStatus;

            const data = await api.getSupportTickets(params);
            setTickets(Array.isArray(data) ? data : data.results || []);
        } catch (error) {
            console.error("Failed to load tickets", error);
            // Fallback to empty if API fails (or use mock if desperate)
            setTickets([]);
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (ticketId: number) => {
        setMessagesLoading(true);
        try {
            const msgs = await api.getTicketMessages(ticketId);
            setMessages(Array.isArray(msgs) ? msgs : []);
        } catch (error) {
            toast.error("Failed to load messages");
        } finally {
            setMessagesLoading(false);
        }
    };

    const handleSelectTicket = (ticket: Ticket) => {
        setSelectedTicket(ticket);
        loadMessages(ticket.id);
    };

    const handleReply = async () => {
        if (!selectedTicket || !replyText.trim()) return;
        try {
            await api.replyToTicket(selectedTicket.id, replyText, isInternalNote);
            toast.success("Reply sent");
            setReplyText("");
            setIsInternalNote(false);
            loadMessages(selectedTicket.id);
        } catch (error) {
            toast.error("Failed to send reply");
        }
    };

    const handleStatusChange = async (action: 'close' | 'reopen') => {
        if (!selectedTicket) return;
        try {
            if (action === 'close') {
                await api.closeTicket(selectedTicket.id);
                toast.success("Ticket closed");
            } else {
                await api.reopenTicket(selectedTicket.id);
                toast.success("Ticket reopened");
            }
            loadTickets(); // Refresh list
            setSelectedTicket(null); // Close detail view
        } catch (error) {
            toast.error(`Failed to ${action} ticket`);
        }
    };

    const handleAssign = async () => {
        if (!selectedTicket) return;
        const adminId = prompt("Enter Admin ID to assign:");
        if (!adminId) return;
        try {
            await api.assignTicket(selectedTicket.id, adminId);
            toast.success("Ticket assigned");
            loadTickets();
        } catch (error) {
            toast.error("Failed to assign ticket");
        }
    }

    const StatusBadge = ({ status }: { status: string }) => {
        const colors: Record<string, string> = {
            'OPEN': 'bg-green-100 text-green-700',
            'IN_PROGRESS': 'bg-blue-100 text-blue-700',
            'WAITING_CUSTOMER': 'bg-yellow-100 text-yellow-700',
            'CLOSED': 'bg-gray-100 text-gray-700'
        };
        return <Badge className={colors[status] || 'bg-gray-100'}>{status.replace('_', ' ')}</Badge>;
    };

    return (
        <div className="container mx-auto p-6 space-y-6 h-[calc(100vh-80px)] flex flex-col">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-3xl font-bold">Support Requests</h1>
                    <p className="text-muted-foreground">Manage customer inquiries and issues</p>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Status</SelectItem>
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="WAITING_CUSTOMER">Waiting (Customer)</SelectItem>
                        <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* List Column */}
                <Card className="md:col-span-1 flex flex-col min-h-0">
                    <CardHeader className="py-4 px-6 border-b shrink-0">
                        <CardTitle className="text-lg">Tickets</CardTitle>
                    </CardHeader>
                    <div className="flex-1 overflow-auto">
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                        ) : tickets.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">No tickets found</div>
                        ) : (
                            <div className="divide-y">
                                {tickets.map(ticket => (
                                    <div
                                        key={ticket.id}
                                        className={cn(
                                            "p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                                            selectedTicket?.id === ticket.id && "bg-muted border-l-4 border-l-primary"
                                        )}
                                        onClick={() => handleSelectTicket(ticket)}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-medium truncate max-w-[150px]">{ticket.subject}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {format(new Date(ticket.created_at), "MMM d")}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <StatusBadge status={ticket.status} />
                                            {ticket.priority === 'HIGH' && (
                                                <Badge variant="destructive" className="text-[10px] h-5">High</Badge>
                                            )}
                                        </div>
                                        <div className="mt-2 text-xs text-muted-foreground truncate">
                                            {ticket.user_email}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>

                {/* Detail Column */}
                <Card className="md:col-span-2 flex flex-col min-h-0">
                    {selectedTicket ? (
                        <>
                            <CardHeader className="py-4 px-6 border-b shrink-0 bg-card z-10">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h2 className="text-xl font-bold">{selectedTicket.subject}</h2>
                                            <StatusBadge status={selectedTicket.status} />
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            From: <span className="font-medium text-foreground">{selectedTicket.user_email}</span> • Ticket #{selectedTicket.id}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={handleAssign}>
                                            <User className="h-4 w-4 mr-2" />
                                            {selectedTicket.assigned_to_name || "Assign"}
                                        </Button>
                                        {selectedTicket.status === 'CLOSED' ? (
                                            <Button variant="outline" size="sm" onClick={() => handleStatusChange('reopen')}>
                                                <CheckCircle className="h-4 w-4 mr-2" /> Reopen
                                            </Button>
                                        ) : (
                                            <Button variant="destructive" size="sm" onClick={() => handleStatusChange('close')}>
                                                <XCircle className="h-4 w-4 mr-2" /> Close
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>

                            <div className="flex-1 overflow-auto p-6 space-y-6">
                                {/* Original Description */}
                                <div className="bg-muted/30 p-4 rounded-lg border">
                                    <p className="text-sm font-medium mb-2 text-muted-foreground">Description:</p>
                                    <p className="whitespace-pre-wrap">{selectedTicket.description}</p>
                                </div>

                                {/* Thread */}
                                {messagesLoading ? (
                                    <div className="flex justify-center py-4">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {messages.map((msg) => (
                                            <div
                                                key={msg.id}
                                                className={cn(
                                                    "flex flex-col max-w-[85%] rounded-lg p-3 text-sm",
                                                    msg.is_staff ? "ml-auto bg-primary text-primary-foreground" : "bg-muted",
                                                    msg.is_internal && "bg-yellow-100 text-yellow-900 border border-yellow-300 ml-auto"
                                                )}
                                            >
                                                <div className="flex justify-between items-center mb-1 gap-4">
                                                    <span className="font-semibold text-xs opacity-90">
                                                        {msg.user_name}
                                                        {msg.is_internal && " (Internal Note)"}
                                                    </span>
                                                    <span className="text-[10px] opacity-70">
                                                        {format(new Date(msg.created_at), "MMM d, HH:mm")}
                                                    </span>
                                                </div>
                                                <p className="whitespace-pre-wrap">{msg.message}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Reply Box */}
                            <div className="p-4 border-t bg-card shrink-0">
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <label className="text-xs cursor-pointer flex items-center gap-2 font-medium leading-none">
                                            <input
                                                type="checkbox"
                                                checked={isInternalNote}
                                                onChange={e => setIsInternalNote(e.target.checked)}
                                                className="rounded border-gray-300"
                                            />
                                            <Lock className="h-3 w-3" /> Internal Note (Only visible to admins)
                                        </label>
                                    </div>
                                    <div className="flex gap-2">
                                        <Textarea
                                            value={replyText}
                                            onChange={e => setReplyText(e.target.value)}
                                            placeholder="Type your reply..."
                                            className="min-h-[80px]"
                                        />
                                        <Button className="h-[auto]" onClick={handleReply} disabled={!replyText.trim()}>
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
                            <p>Select a ticket to view details</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
