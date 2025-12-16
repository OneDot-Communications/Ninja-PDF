"use client";

import { useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { api } from "@/app/lib/api";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { User, Lock, Mail, Phone, MapPin, Building, Save } from "lucide-react";
import { toast } from "sonner";

import { Skeleton } from "@/app/components/ui/skeleton";

export default function ProfilePage() {
    const { user, refreshUser, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(false);

    // If initial auth loading, show skeleton
    if (authLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <Skeleton className="h-10 w-48 mb-2" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48 mb-2" />
                        <Skeleton className="h-4 w-72" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center gap-6">
                            <Skeleton className="h-24 w-24 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <div className="flex gap-2">
                                    <Skeleton className="h-9 w-24" />
                                    <Skeleton className="h-9 w-24" />
                                </div>
                            </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                            <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                            <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                            <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const [firstName, setFirstName] = useState(user?.first_name || "");
    const [lastName, setLastName] = useState(user?.last_name || "");
    const [email, setEmail] = useState(user?.email || "");
    const [phone, setPhone] = useState(user?.phone_number || "");

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.updateCurrentUser({
                first_name: firstName,
                last_name: lastName,
                email: email,
                phone_number: phone
            });
            toast.success("Profile updated successfully");
            await refreshUser(); // Refresh local user context
        } catch (error) {
            toast.error("Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    const [avatarKey, setAvatarKey] = useState(Date.now()); // For cache busting

    return (
        <div className="space-y-6">
            {/* ... */}
            <Card>
                {/* ... */}
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-6">
                        <Avatar className="h-24 w-24">
                            <AvatarImage src={user?.avatar || undefined} alt="Profile" />
                            <AvatarFallback className="text-xl bg-slate-100">{user?.first_name?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                            <h4 className="text-sm font-medium">Profile Photo</h4>
                            <div className="flex gap-2">
                                <Button variant="secondary" size="sm" onClick={() => document.getElementById('avatar-upload')?.click()}>
                                    Change Photo
                                </Button>
                                <input
                                    id="avatar-upload"
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={async (e) => {
                                        if (e.target.files?.[0]) {
                                            const file = e.target.files[0];
                                            console.log("Starting photo upload:", file.name);

                                            const formData = new FormData();
                                            formData.append('avatar', file);

                                            setLoading(true);
                                            try {
                                                const response = await api.updateAvatar(formData);
                                                console.log("Photo upload successful, response:", response);

                                                await refreshUser();
                                                console.log("User context refreshed");
                                                setAvatarKey(Date.now()); // Force image refresh

                                                toast.success("Photo updated successfully");
                                            } catch (err) {
                                                console.error("Photo upload failed:", err);
                                                toast.error("Failed to upload photo");
                                            } finally {
                                                setLoading(false);
                                            }
                                        }
                                    }}
                                />

                                <Button variant="ghost" size="sm" className="text-red-600" onClick={async () => {
                                    if (!confirm("Are you sure you want to remove your profile photo?")) return;
                                    setLoading(true);
                                    try {
                                        await api.deleteAvatar();
                                        await refreshUser();
                                        toast.success("Profile photo removed");
                                    } catch (err) {
                                        console.error(err);
                                        toast.error("Failed to remove photo");
                                    } finally {
                                        setLoading(false);
                                    }
                                }}>Remove</Button>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <div className="relative">
                                <User className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                <Input
                                    id="firstName"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <div className="relative">
                                <User className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                <Input
                                    id="lastName"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <div className="relative">
                                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                <Input
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <div className="relative">
                                <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                <Input
                                    id="phone"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+1 (555) 000-0000"
                                    className="pl-9"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={handleSave} disabled={loading}>
                            {loading ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Storage Usage Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Storage Usage</CardTitle>
                    <CardDescription>View your current storage consumption.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Used Space</span>
                        <span className="font-medium">
                            {formatBytes(user?.storage_used || 0)} / {formatBytes(user?.storage_limit || 104857600)}
                        </span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, ((user?.storage_used || 0) / (user?.storage_limit || 1)) * 100))}%` }}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground pt-2">
                        {user?.subscription_tier === 'FREE'
                            ? "Upgrade to Pro for more storage."
                            : "You have ample space for your documents."}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

