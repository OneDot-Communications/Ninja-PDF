"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/services/api";
import { toast } from "sonner";
import { User as UserIcon, Camera, X, Loader2, Globe, Clock, Building } from "lucide-react";
import { useRouter } from "next/navigation";

interface UserData {
    first_name: string;
    last_name: string;
    email: string;
    country?: string;
    timezone?: string;
    phone_number?: string;
    avatar?: string;
    is_verified?: boolean;
}

export function ProfileCard({ user, onUpdate }: { user: UserData | null, onUpdate: () => void }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState<UserData>({
        first_name: user?.first_name || "",
        last_name: user?.last_name || "",
        email: user?.email || "",
        country: user?.country || "",
        timezone: user?.timezone || "UTC",
        phone_number: user?.phone_number || "",
    });

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await api.updateCurrentUser(formData);
            toast.success("Profile updated successfully");
            setIsEditing(false);
            onUpdate();
        } catch (error) {
            toast.error("Failed to update profile");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="overflow-hidden border-none shadow-sm ring-1 ring-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/30 border-b">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-primary" />
                    Profile
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                    Change
                </Button>
            </CardHeader>
            <CardContent className="p-6">
                <div className="flex items-start gap-6">
                    {/* Avatar Area - Can be enhanced with upload later */}
                    <div className="relative group">
                        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden ring-4 ring-background">
                            {user?.avatar ? (
                                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-2xl font-bold text-primary">
                                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                                </span>
                            )}
                        </div>
                        {/* <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                            <Camera className="w-6 h-6 text-white" />
                        </div> */}
                    </div>

                    <div className="space-y-4 flex-1">
                        <div>
                            <h3 className="text-xl font-semibold tracking-tight">{user?.first_name} {user?.last_name}</h3>
                            <p className="text-sm text-muted-foreground">{user?.email}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div className="flex items-center gap-2 text-sm">
                                <Globe className="w-4 h-4 text-muted-foreground" />
                                <span>{user?.country || "Country not set"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span>{user?.timezone || "UTC"}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 pt-2 text-sm text-primary font-medium cursor-pointer hover:underline" onClick={() => window.location.href = '/profile/billing/business'}>
                            <Building className="w-4 h-4" />
                            Manage Business Details
                        </div>
                    </div>
                </div>
            </CardContent>

            {/* Edit Modal Overlay */}
            {isEditing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-background rounded-xl shadow-2xl w-full max-w-lg border animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-lg font-semibold">Edit Profile</h2>
                            <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>First Name</Label>
                                    <Input
                                        value={formData.first_name}
                                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Last Name</Label>
                                    <Input
                                        value={formData.last_name}
                                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Country</Label>
                                <Input
                                    value={formData.country}
                                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                    placeholder="e.g. United States"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Timezone</Label>
                                <Input
                                    value={formData.timezone}
                                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                                    placeholder="e.g. UTC"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Phone Number</Label>
                                <Input
                                    value={formData.phone_number}
                                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                    placeholder="+1 234 567 890"
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t bg-muted/10 flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                            <Button onClick={handleSave} disabled={isLoading}>
                                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}
