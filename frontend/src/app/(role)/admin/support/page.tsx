"use client";

import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { MessageSquare, Plus, Clock, CheckCircle, XCircle, User, ArrowRight } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/app/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Ticket {
    id: number;
    ticket_number: string;
    subject: string;
    description: string;
    user_email: string;
    status: string;
    priority: string;
    category: string;
    is_priority: boolean;
    assigned_to_email: string | null;
    created_at: string;
    messages_count: number;
}

interface TicketMessage {
    id: number;
    user_email: string;
    user_name: string;
    is_staff: boolean;
    message: string;
    is_internal: boolean;
    created_at: string;
}

const statusColors: Record<string, string> = {
    OPEN: 'bg-yellow-500',
    IN_PROGRESS: 'bg-blue-500',
    WAITING_CUSTOMER: 'bg-purple-500',
    RESOLVED: 'bg-green-500',
    CLOSED: 'bg-slate-500',
};

const priorityColors: Record<string, string> = {
    LOW: 'bg-slate-400',
    MEDIUM: 'bg-yellow-500',
    HIGH: 'bg-orange-500',
    URGENT: 'bg-red-500',
};

export default function AdminSupportPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [messages, setMessages] = useState<TicketMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [reply, setReply] = useState('');
    const [isInternal, setIsInternal] = useState(false);
    const [filter, setFilter] = useState('all');
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        loadTickets();
        loadStats();
    }, [filter]);

    const loadTickets = async () => {
        try {
            let url = '/core/content/support-tickets/';
            if (filter !== 'all') {
                url += `?status=${filter}`;
            }
            const data = await api.request('GET', url);
            setTickets(data.results || data || []);
        } catch (error) {
            toast.error("Failed to load tickets");
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const data = await api.request('GET', '/core/content/support-tickets/stats/');
            setStats(data);
        } catch (error) {
            console.error("Failed to load stats");
        }
    };

    const loadMessages = async (ticket: Ticket) => {
        setSelectedTicket(ticket);
        try {
            const data = await api.request('GET', `/core/content/support-tickets/${ticket.id}/messages/`);
            setMessages(data || []);
        } catch (error) {
            toast.error("Failed to load messages");
        }
    };

    const sendReply = async () => {
        if (!selectedTicket || !reply.trim()) return;
        try {
            await api.request('POST', `/core/content/support-tickets/${selectedTicket.id}/messages/`, {
                message: reply,
                is_internal: isInternal,
            });
            toast.success(isInternal ? "Internal note added" : "Reply sent");
            setReply('');
            loadMessages(selectedTicket);
            loadTickets();
        } catch (error) {
            toast.error("Failed to send reply");
        }
    };

    const updateStatus = async (ticketId: number, newStatus: string) => {
        try {
            if (newStatus === 'CLOSED') {
                await api.request('POST', `/core/content/support-tickets/${ticketId}/close/`);
            } else {
                await api.request('PATCH', `/core/content/support-tickets/${ticketId}/`, { status: newStatus });
            }
            toast.success("Status updated");
            loadTickets();
            if (selectedTicket?.id === ticketId) {
                setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
            }
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="container mx-auto py-10 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Support Tickets</h1>
                        <p className="text-slate-500">Manage customer support requests</p>
                    </div>
                </div>
            </div>

            {stats && (
                <div className="grid grid-cols-4 gap-4">
                    <Card className="p-4">
                        <div className="text-2xl font-bold text-yellow-600">{stats.open_count}</div>
                        <div className="text-sm text-slate-500">Open Tickets</div>
                    </Card>
                    <Card className="p-4">
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <div className="text-sm text-slate-500">Total Tickets</div>
                    </Card>
                    {stats.by_priority?.map((p: any) => (
                        <Card key={p.priority} className="p-4">
                            <div className="text-2xl font-bold">{p.count}</div>
                            <div className="text-sm text-slate-500">{p.priority}</div>
                        </Card>
                    ))}
                </div>
            )}

            <div className="flex gap-2">
                {['all', 'OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'].map(s => (
                    <Button
                        key={s}
                        variant={filter === s ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter(s)}
                    >
                        {s === 'all' ? 'All' : s.replace(/_/g, ' ')}
                    </Button>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                    {tickets.map(ticket => (
                        <Card
                            key={ticket.id}
                            className={`cursor-pointer transition-all hover:shadow-md ${selectedTicket?.id === ticket.id ? 'ring-2 ring-blue-500' : ''}`}
                            onClick={() => loadMessages(ticket)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <code className="text-xs text-slate-400">{ticket.ticket_number}</code>
                                            {ticket.is_priority && <Badge className="bg-amber-500">Priority</Badge>}
                                        </div>
                                        <h3 className="font-semibold text-slate-900">{ticket.subject}</h3>
                                        <p className="text-sm text-slate-500 mt-1">{ticket.user_email}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <Badge className={statusColors[ticket.status]}>{ticket.status.replace(/_/g, ' ')}</Badge>
                                        <Badge variant="outline" className={priorityColors[ticket.priority]}>{ticket.priority}</Badge>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
                                    <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                                    <span>{ticket.messages_count} messages</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {tickets.length === 0 && (
                        <Card className="p-8 text-center text-slate-500">
                            No tickets found
                        </Card>
                    )}
                </div>

                {selectedTicket && (
                    <Card className="h-[600px] flex flex-col">
                        <CardHeader className="border-b">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>{selectedTicket.subject}</CardTitle>
                                    <CardDescription>{selectedTicket.ticket_number} • {selectedTicket.user_email}</CardDescription>
                                </div>
                                <Select value={selectedTicket.status} onValueChange={v => updateStatus(selectedTicket.id, v)}>
                                    <SelectTrigger className="w-40">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="OPEN">Open</SelectItem>
                                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                        <SelectItem value="WAITING_CUSTOMER">Waiting Customer</SelectItem>
                                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                                        <SelectItem value="CLOSED">Closed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-auto p-4 space-y-4">
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-sm text-slate-600">{selectedTicket.description}</p>
                            </div>
                            {messages.map(msg => (
                                <div
                                    key={msg.id}
                                    className={`p-3 rounded-lg ${msg.is_staff ? 'bg-blue-50 ml-8' : 'bg-slate-50 mr-8'} ${msg.is_internal ? 'border-2 border-dashed border-yellow-400' : ''}`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-slate-700">
                                            {msg.user_name} {msg.is_staff && <Badge variant="outline" className="ml-1">Staff</Badge>}
                                            {msg.is_internal && <Badge className="ml-1 bg-yellow-500">Internal</Badge>}
                                        </span>
                                        <span className="text-xs text-slate-400">{new Date(msg.created_at).toLocaleString()}</span>
                                    </div>
                                    <p className="text-sm text-slate-600">{msg.message}</p>
                                </div>
                            ))}
                        </CardContent>
                        <div className="border-t p-4 space-y-2">
                            <Textarea
                                placeholder="Type your reply..."
                                value={reply}
                                onChange={e => setReply(e.target.value)}
                                rows={3}
                            />
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={isInternal}
                                        onChange={e => setIsInternal(e.target.checked)}
                                    />
                                    Internal note (not visible to customer)
                                </label>
                                <Button onClick={sendReply} disabled={!reply.trim()}>
                                    Send Reply <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
