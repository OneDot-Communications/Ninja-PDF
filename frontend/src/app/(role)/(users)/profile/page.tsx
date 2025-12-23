"use client";

import { useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { api } from "@/lib/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Lock, Mail, Phone, MapPin, Building, Save, Edit, Calendar, Home, Hash } from "lucide-react";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { PhoneInput } from "@/components/ui/phone-input";

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
    const [country, setCountry] = useState(user?.country || "");
    const [userName, setUserName] = useState(`${user?.first_name || ""} ${user?.last_name || ""}`.trim());
    const [dateOfBirth, setDateOfBirth] = useState("25 January 1990"); // Default value from design
    const [billingAddress, setBillingAddress] = useState("San Jose, California, USA"); // Default value from design
    const [city, setCity] = useState("San Jose"); // Default value from design
    const [postalCode, setPostalCode] = useState("45962"); // Default value from design

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.updateCurrentUser({
                first_name: firstName,
                last_name: lastName,
                email: email,
                phone_number: phone,
                country: country
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
        <div className="relative">
            <div className="w-full max-w-[1110px] mx-auto">
                {/* Main Profile Card */}
                <div className="bg-white rounded-[25px] shadow-lg border border-gray-100 overflow-hidden">
                    {/* Header Tabs */}
                    <div className="px-[30px] pt-[37px] pb-[19px]">
                        <div className="flex items-center gap-8 mb-4">
                            <div className="text-[#3371eb] text-left font-medium text-base cursor-pointer">
                                Edit Profile
                            </div>
                            <div className="text-[#718ebf] text-left font-medium text-base cursor-pointer hover:text-[#3371eb] transition-colors">
                                Preferences
                            </div>
                            <div className="text-[#718ebf] text-left font-medium text-base cursor-pointer hover:text-[#3371eb] transition-colors">
                                Security
                            </div>
                        </div>
                        <div className="bg-[#f4f5f7] w-full h-px"></div>
                        <div className="bg-[#3371eb] rounded-tl-[10px] rounded-tr-[10px] w-[114px] h-[3px] mt-1"></div>
                    </div>

                    {/* Profile Content */}
                    <div className="px-[30px] pb-[30px]">
                        {/* Avatar Section */}
                        <div className="flex items-start gap-6 mb-8">
                            {console.log("Current user avatar:", user?.avatar)}
                            <div className="relative">
                                <div className="w-[130px] h-[130px] rounded-full overflow-hidden bg-slate-100 flex items-center justify-center">
                                    {user?.avatar ? (
                                        <img 
                                            key={avatarKey}
                                            src={`${user.avatar}?t=${avatarKey}`} 
                                            alt="Profile" 
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                console.log("Avatar image failed to load:", user.avatar);
                                                // Fallback to initials if image fails
                                                e.currentTarget.style.display = 'none';
                                                e.currentTarget.nextElementSibling.style.display = 'flex';
                                            }}
                                        />
                                    ) : null}
                                    <div className={`w-full h-full rounded-full flex items-center justify-center text-2xl font-semibold text-slate-600 bg-slate-100 ${user?.avatar ? 'hidden' : 'flex'}`}>
                                        {user?.first_name?.[0] || 'U'}
                                    </div>
                                </div>
                                {/* Edit Icon */}
                                <div className="absolute -right-2 -bottom-2 w-[30px] h-[30px] bg-[#3371eb] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#2a5fd6] transition-colors"
                                     onClick={() => document.getElementById('avatar-upload')?.click()}>
                                    <Edit className="w-[15px] h-[15px] text-white" />
                                </div>
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
                                                console.log("Response avatar field:", response?.avatar);

                                                // Update user state directly with the response
                                                if (response && response.avatar) {
                                                    // Temporarily update the local user state for immediate UI update
                                                    setUser(prevUser => prevUser ? { ...prevUser, avatar: response.avatar } : null);
                                                }
                                                
                                                // Also refresh from server to ensure consistency
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
                            </div>
                        </div>

                        {/* Form Fields Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-[30px] gap-y-6">
                            {/* Your Name */}
                            <div className="space-y-2">
                                <Label className="text-[#232323] text-base font-normal">Your Name</Label>
                                <div className="relative">
                                    <Input
                                        value={`${firstName} ${lastName}`.trim()}
                                        onChange={(e) => {
                                            const fullName = e.target.value;
                                            const parts = fullName.trim().split(' ');
                                            setFirstName(parts[0] || '');
                                            setLastName(parts.slice(1).join(' ') || '');
                                            setUserName(fullName);
                                        }}
                                        className="h-[50px] rounded-[15px] border-[#dfeaf2] bg-white text-[#718ebf] text-[15px] pl-4 pr-4 focus:border-[#3371eb] focus:ring-[#3371eb]"
                                        placeholder="Enter your full name"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <Label className="text-[#232323] text-base font-normal">Email</Label>
                                <div className="relative">
                                    <Input
                                        value={email}
                                        readOnly
                                        disabled
                                        className="h-[50px] rounded-[15px] border-[#dfeaf2] bg-white text-[#718ebf] text-[15px] pl-4 pr-4 cursor-not-allowed opacity-60"
                                    />
                                </div>
                            </div>

                            {/* User Name */}
                            <div className="space-y-2">
                                <Label className="text-[#232323] text-base font-normal">User Name</Label>
                                <div className="relative">
                                    <Input
                                        value={userName}
                                        onChange={(e) => setUserName(e.target.value)}
                                        className="h-[50px] rounded-[15px] border-[#dfeaf2] bg-white text-[#718ebf] text-[15px] pl-4 pr-4 focus:border-[#3371eb] focus:ring-[#3371eb]"
                                        placeholder="Enter username"
                                    />
                                </div>
                            </div>

                            {/* Phone Number */}
                            <div className="space-y-2">
                                <Label className="text-[#232323] text-base font-normal">Phone Number</Label>
                                <PhoneInput
                                    value={phone}
                                    onValueChange={setPhone}
                                    onCountryChange={setCountry}
                                    className="h-[50px] rounded-[15px] border-[#dfeaf2] bg-white text-[#718ebf] text-[15px] focus:border-[#3371eb] focus:ring-[#3371eb]"
                                />
                            </div>

                            {/* Date of Birth */}
                            <div className="space-y-2">
                                <Label className="text-[#232323] text-base font-normal">Date of Birth</Label>
                                <div className="relative">
                                    <Input
                                        value={dateOfBirth}
                                        onChange={(e) => setDateOfBirth(e.target.value)}
                                        className="h-[50px] rounded-[15px] border-[#dfeaf2] bg-white text-[#718ebf] text-[15px] pl-4 pr-4 focus:border-[#3371eb] focus:ring-[#3371eb]"
                                        placeholder="Enter date of birth"
                                    />
                                    <Calendar className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#718ebf]" />
                                </div>
                            </div>

                            {/* Billing Address */}
                            <div className="space-y-2">
                                <Label className="text-[#232323] text-base font-normal">Billing Address</Label>
                                <div className="relative">
                                    <Input
                                        value={billingAddress}
                                        onChange={(e) => setBillingAddress(e.target.value)}
                                        className="h-[50px] rounded-[15px] border-[#dfeaf2] bg-white text-[#718ebf] text-[15px] pl-4 pr-4 focus:border-[#3371eb] focus:ring-[#3371eb]"
                                        placeholder="Enter billing address"
                                    />
                                    <Home className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#718ebf]" />
                                </div>
                            </div>

                            {/* City */}
                            <div className="space-y-2">
                                <Label className="text-[#232323] text-base font-normal">City</Label>
                                <div className="relative">
                                    <Input
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        className="h-[50px] rounded-[15px] border-[#dfeaf2] bg-white text-[#718ebf] text-[15px] pl-4 pr-4 focus:border-[#3371eb] focus:ring-[#3371eb]"
                                        placeholder="Enter city"
                                    />
                                    <MapPin className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#718ebf]" />
                                </div>
                            </div>

                            {/* Postal Code */}
                            <div className="space-y-2">
                                <Label className="text-[#232323] text-base font-normal">Postal Code</Label>
                                <div className="relative">
                                    <Input
                                        value={postalCode}
                                        onChange={(e) => setPostalCode(e.target.value)}
                                        className="h-[50px] rounded-[15px] border-[#dfeaf2] bg-white text-[#718ebf] text-[15px] pl-4 pr-4 focus:border-[#3371eb] focus:ring-[#3371eb]"
                                        placeholder="Enter postal code"
                                    />
                                    <Hash className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#718ebf]" />
                                </div>
                            </div>

                            {/* Country - spans full width */}
                            <div className="space-y-2 md:col-span-2">
                                <Label className="text-[#232323] text-base font-normal">Country</Label>
                                <div className="relative">
                                    <Input
                                        value={country}
                                        onChange={(e) => setCountry(e.target.value)}
                                        className="h-[50px] rounded-[15px] border-[#dfeaf2] bg-white text-[#718ebf] text-[15px] pl-4 pr-4 focus:border-[#3371eb] focus:ring-[#3371eb]"
                                        placeholder="Enter country"
                                    />
                                    <Building className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#718ebf]" />
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end mt-8">
                            <Button
                                onClick={handleSave}
                                disabled={loading}
                                className="bg-[#3371eb] hover:bg-[#2a5fd6] text-white px-8 py-3 rounded-lg font-medium text-base min-w-[190px] h-[50px] transition-colors"
                            >
                                {loading ? "Saving..." : "Save"}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Storage Usage Section - Keep existing functionality */}
                <div className="mt-6">
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
            </div>
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

