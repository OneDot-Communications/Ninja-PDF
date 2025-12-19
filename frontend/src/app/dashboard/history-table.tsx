'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/services/api';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2, FileText, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Task {
    id: number;
    task_id: string;
    task_name: string;
    status: 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE' | 'COMPLETED' | 'FAILED' | 'PROCESSING' | 'QUEUED';
    file_name?: string;
    result_url?: string;
    created_at: string;
}

import { useAuth } from '@/lib/context/AuthContext'; // Import useAuth

export const HistoryTable = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth(); // Get user from context

    useEffect(() => {
        if (user) {
            loadHistory();
        }
    }, [user]);

    const loadHistory = async () => {
        try {
            const data = await api.getHistory();
            if (Array.isArray(data)) {
                setTasks(data);
            } else if (data.results) {
                setTasks(data.results);
            }
        } catch (e: any) {
            // Suppress 401 errors as they are expected when session expires/not present
            if (e?.status !== 401) {
                console.error(e);
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white/50 backdrop-blur-sm shadow-sm p-4">
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-48" />
                                    <Skeleton className="h-3 w-32" />
                                </div>
                            </div>
                            <Skeleton className="h-6 w-24 rounded-full" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (tasks.length === 0) {
        return <div className="text-center p-8 text-gray-500">No conversion history found.</div>;
    }

    return (
        <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white/50 backdrop-blur-sm shadow-sm">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50/50 text-gray-700 font-medium border-b border-gray-200">
                    <tr>
                        <th className="px-4 py-3">File</th>
                        <th className="px-4 py-3">Task</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {tasks.map((task) => (
                        <tr key={task.task_id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-gray-400" />
                                {task.file_name || 'Untitled Document'}
                            </td>
                            <td className="px-4 py-3 text-gray-500 capitalize">{task.task_name?.replace(/_/g, ' ') || 'Unknown'}</td>
                            <td className="px-4 py-3 text-gray-500">
                                {new Date(task.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                                <Badge variant={
                                    (task.status === 'SUCCESS' || task.status === 'COMPLETED') ? 'default' :
                                        (task.status === 'FAILURE' || task.status === 'FAILED') ? 'destructive' :
                                            (task.status === 'PROCESSING' || task.status === 'STARTED') ? 'default' : // blue/primary
                                                'secondary' // queued, pending
                                }>
                                    {task.status}
                                </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                                {task.status === 'SUCCESS' && task.result_url && (
                                    <a href={task.result_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 font-medium text-xs">
                                        <Download className="w-3 h-3" /> Download
                                    </a>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
