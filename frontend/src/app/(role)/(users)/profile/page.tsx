"use client";

import { useState, useEffect, useRef } from "react";
import { countries } from "@/lib/constants/countries";
import { currencies } from "@/lib/constants/currencies";
import { timezones } from "@/lib/constants/timezones";
import { useAuth } from "@/lib/context/AuthContext";
import QRCode from "react-qr-code";
import { api } from "@/lib/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Edit, Check, ChevronsUpDown } from "lucide-react";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarCropModal } from "@/components/profile/AvatarCropModal";
import { validateImage, fileToDataUrl, blobToFile } from "@/lib/utils/image-validation";

export default function ProfilePage() {
    const { user, refreshUser, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
    const [countryCode, setCountryCode] = useState("IN"); // Default to India
    const [dateOfBirth, setDateOfBirth] = useState("25/01/1990"); // Default value in dd/mm/yyyy format
    const [billingAddress, setBillingAddress] = useState("San Jose, California, USA"); // Default value from design
    const [city, setCity] = useState("San Jose"); // Default value from design
    const [postalCode, setPostalCode] = useState("45962"); // Default value from design
    const [zodiacSign, setZodiacSign] = useState("Libra"); // Default value from design
    const [avatarKey, setAvatarKey] = useState(Date.now());

    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [open, setOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [loadingPostal, setLoadingPostal] = useState(false);

    // Tab State
    const [activeTab, setActiveTab] = useState<'edit' | 'preferences' | 'security'>('edit');

    // Preference States
    const [currency, setCurrency] = useState('USD');
    const [openCurrency, setOpenCurrency] = useState(false);
    const [timezone, setTimezone] = useState('(GMT-12:00) International Date Line West');
    const [openTimezone, setOpenTimezone] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [notifyPayments, setNotifyPayments] = useState(true);
    const [notifyOffers, setNotifyOffers] = useState(true);

    // Security States
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");

    // Auto-detect country from postal code
    useEffect(() => {
        const detect = setTimeout(async () => {
            if (!postalCode) return;
            const code = postalCode.trim();
            let candidates: { code: string, name: string }[] = [];

            // 1. Identify Candidates based on Format
            if (/^\d{5}$/.test(code)) {
                // 5 Digits: US, Europe, Mexico, etc.
                candidates = [
                    { code: "us", name: "United States" },
                    { code: "de", name: "Germany" },
                    { code: "fr", name: "France" },
                    { code: "es", name: "Spain" },
                    { code: "it", name: "Italy" },
                    { code: "mx", name: "Mexico" },
                    { code: "th", name: "Thailand" },
                    { code: "pk", name: "Pakistan" },
                    { code: "pl", name: "Poland" },
                    { code: "tr", name: "Turkey" },
                    { code: "fi", name: "Finland" },
                    { code: "my", name: "Malaysia" },
                    { code: "hr", name: "Croatia" },
                    { code: "lk", name: "Sri Lanka" },
                    { code: "ua", name: "Ukraine" },
                    { code: "br", name: "Brazil" }
                ];
            } else if (/^\d{6}$/.test(code)) {
                // 6 Digits: India, China, Russia, etc.
                candidates = [
                    { code: "in", name: "India" },
                    { code: "cn", name: "China" },
                    { code: "ru", name: "Russia" },
                    { code: "sg", name: "Singapore" },
                    { code: "ro", name: "Romania" }
                ];
            } else if (/^\d{4}$/.test(code)) {
                // 4 Digits: Switzerland, Austria, Belgium, Aus, SA, etc.
                // Prioritize Europe based on user preference for "8001" -> CH
                candidates = [
                    { code: "ch", name: "Switzerland" },
                    { code: "at", name: "Austria" },
                    { code: "be", name: "Belgium" },
                    { code: "dk", name: "Denmark" },
                    { code: "no", name: "Norway" },
                    { code: "lu", name: "Luxembourg" },
                    { code: "si", name: "Slovenia" },
                    { code: "hu", name: "Hungary" },
                    { code: "au", name: "Australia" },
                    { code: "za", name: "South Africa" },
                    { code: "nz", name: "New Zealand" },
                    { code: "ph", name: "Philippines" },
                    { code: "bd", name: "Bangladesh" },
                    { code: "md", name: "Moldova" }
                ];
            } else if (/^\d{3}$/.test(code)) {
                // 3 Digits
                candidates = [{ code: "is", name: "Iceland" }];
            } else if (/^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/.test(code)) {
                // Canada (A1A 1A1)
                candidates = [{ code: "ca", name: "Canada" }];
            } else if (/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i.test(code)) {
                // UK
                candidates = [{ code: "gb", name: "United Kingdom" }];
            }

            if (candidates.length > 0) {
                setLoadingPostal(true);
                let found = false;

                // Sequential Probe "Smart Race"
                for (const candidate of candidates) {
                    try {
                        let isValid = false;
                        let detectedCity = "";

                        // Special handling for India
                        if (candidate.code === 'in') {
                            console.log(`Checking India API for code: ${code}`);
                            const res = await fetch(`https://api.postalpincode.in/pincode/${code}`);
                            const data = await res.json();
                            console.log("India API response:", data);

                            if (data && data[0].Status === "Success") {
                                isValid = true;
                                const details = data[0].PostOffice[0];
                                detectedCity = details.Block !== "NA" ? details.Block : details.District;
                            }
                        } else {
                            // Default to Zippopotam for all other countries (including FR, BR, US, etc.)
                            const res = await fetch(`https://api.zippopotam.us/${candidate.code}/${code}`);
                            if (res.ok) {
                                const data = await res.json();
                                if (data.places && data.places.length > 0) {
                                    isValid = true;
                                    detectedCity = data.places[0]["place name"];
                                }
                            }
                        }

                        if (isValid) {
                            setCountry(candidate.name);
                            if (detectedCity) setCity(detectedCity);
                            toast.success(`Location detected: ${detectedCity || candidate.name}`);
                            found = true;
                            break; // Stop at first match
                        }
                    } catch (e) {
                        // Continue to next candidate
                    }
                }
                setLoadingPostal(false);
                if (!found && code.length >= 4) {
                    toast.error("Could not auto-detect location");
                }
            }
        }, 800);
        return () => clearTimeout(detect);
    }, [postalCode]);

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

    const handlePreferencesSave = async () => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            toast.success("Preferences saved successfully");
        }, 1000);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset input value to allow selecting the same file again
        e.target.value = "";

        try {
            // Validate image
            const validation = await validateImage(file);
            if (!validation.valid) {
                toast.error(validation.error || "Invalid image");
                return;
            }

            // Convert to data URL for crop modal
            const dataUrl = await fileToDataUrl(file);
            setSelectedImage(dataUrl);
            setSelectedFile(file);
            setCropModalOpen(true);
        } catch (error) {
            console.error("Error processing image:", error);
            toast.error("Failed to process image");
        }
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        setLoading(true);
        setCropModalOpen(false);

        try {
            // Convert blob to file
            const croppedFile = blobToFile(croppedBlob, selectedFile?.name || "avatar.jpg");

            // Create FormData and upload
            const formData = new FormData();
            formData.append("avatar", croppedFile);

            console.log("Uploading cropped photo...");
            const response = await api.updateAvatar(formData);
            console.log("Photo upload successful:", response);

            // Refresh user data and update cache key
            await refreshUser();
            setAvatarKey(Date.now());

            toast.success("Photo updated successfully");
        } catch (err) {
            console.error("Photo upload failed:", err);
            toast.error("Failed to upload photo");
        } finally {
            setLoading(false);
            setSelectedImage(null);
            setSelectedFile(null);
        }
    };

    return (
        <div className="relative">
            <div className="w-full mx-auto">
                {/* Main Profile Card */}
                <div className="bg-white rounded-[25px] shadow-lg border border-gray-100 overflow-hidden">
                    {/* Header Tabs */}
                    <div className="px-[30px] pt-[37px]">
                        <div className="flex items-center gap-12 border-b border-[#f4f5f7]">
                            <div
                                onClick={() => setActiveTab('edit')}
                                className={cn(
                                    "pb-4 -mb-[1px] text-left font-medium text-base cursor-pointer transition-colors border-b-[3px]",
                                    activeTab === 'edit'
                                        ? "text-[#3371eb] border-[#3371eb]"
                                        : "text-[#718ebf] border-transparent hover:text-[#3371eb]"
                                )}
                            >
                                Edit Profile
                            </div>
                            <div
                                onClick={() => setActiveTab('preferences')}
                                className={cn(
                                    "pb-4 -mb-[1px] text-left font-medium text-base cursor-pointer transition-colors border-b-[3px]",
                                    activeTab === 'preferences'
                                        ? "text-[#3371eb] border-[#3371eb]"
                                        : "text-[#718ebf] border-transparent hover:text-[#3371eb]"
                                )}
                            >
                                Preferences
                            </div>
                            <div
                                onClick={() => setActiveTab('security')}
                                className={cn(
                                    "pb-4 -mb-[1px] text-left font-medium text-base cursor-pointer transition-colors border-b-[3px]",
                                    activeTab === 'security'
                                        ? "text-[#3371eb] border-[#3371eb]"
                                        : "text-[#718ebf] border-transparent hover:text-[#3371eb]"
                                )}
                            >
                                Security
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="px-[30px] pt-8 pb-[30px]">
                        {activeTab === 'edit' && (
                            <>
                                {/* First Row with Avatar */}
                                <div className="flex gap-5 mb-6">
                                    {/* Avatar Section */}
                                    <div className="flex-shrink-0">
                                        <div className="relative">
                                            <Avatar className="w-[130px] h-[130px]">
                                                <AvatarImage
                                                    src={user?.avatar ? `${user.avatar}?t=${avatarKey}` : undefined}
                                                    alt="Profile"
                                                />
                                                <AvatarFallback className="text-2xl bg-slate-100 text-slate-600">
                                                    {user?.first_name?.[0] || 'U'}
                                                </AvatarFallback>
                                            </Avatar>
                                            {/* Edit Icon */}
                                            <div className="absolute -right-0 -bottom-0 w-[30px] h-[30px] bg-[#3371eb] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#2a5fd6] transition-colors"
                                                onClick={() => fileInputRef.current?.click()}>
                                                <Edit className="w-[15px] h-[15px] text-white" />
                                            </div>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                className="hidden"
                                                accept="image/jpeg,image/png,image/webp"
                                                onChange={handleFileSelect}
                                            />
                                        </div>
                                    </div>

                                    {/* First Row Fields */}
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-[30px] gap-y-6">
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
                                                    placeholder="Charlene Reed"
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
                                                    placeholder="Charlene Reed"
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
                                                    placeholder="charlenereed@gmail.com"
                                                />
                                            </div>
                                        </div>

                                        {/* Phone Number */}
                                        <div className="space-y-2">
                                            <Label className="text-[#232323] text-base font-normal">Phone Number</Label>

                                            <div className="relative flex items-center">
                                                <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center">
                                                    <Popover open={open} onOpenChange={setOpen}>
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                role="combobox"
                                                                aria-expanded={open}
                                                                className="h-[50px] min-w-[90px] w-auto rounded-l-[15px] rounded-r-none border border-[#dfeaf2] border-r-0 bg-[#f8fafc] text-[#232323] hover:bg-[#f8fafc] hover:text-[#232323] focus:ring-0 shadow-none px-3 gap-2"
                                                            >
                                                                {countryCode ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <img
                                                                            src={`https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`}
                                                                            srcSet={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png 2x`}
                                                                            alt={countryCode}
                                                                            className="w-5 h-auto rounded-[2px] object-cover"
                                                                        />
                                                                        <span>{countries.find((c) => c.code === countryCode)?.dial_code}</span>
                                                                    </div>
                                                                ) : (
                                                                    <span>Select</span>
                                                                )}
                                                                <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-[300px] p-0" align="start">
                                                            <Command>
                                                                <CommandInput placeholder="Search country..." />
                                                                <CommandList>
                                                                    <CommandEmpty>No country found.</CommandEmpty>
                                                                    <CommandGroup>
                                                                        {countries.map((country) => (
                                                                            <CommandItem
                                                                                key={country.code}
                                                                                value={`${country.name} ${country.dial_code}`}
                                                                                onSelect={(currentValue) => {
                                                                                    setCountryCode(country.code);
                                                                                    setOpen(false);
                                                                                }}
                                                                            >
                                                                                <Check
                                                                                    className={cn(
                                                                                        "mr-2 h-4 w-4",
                                                                                        countryCode === country.code ? "opacity-100" : "opacity-0"
                                                                                    )}
                                                                                />
                                                                                <div className="flex items-center gap-2 flex-1">
                                                                                    <img
                                                                                        src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
                                                                                        srcSet={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png 2x`}
                                                                                        alt={country.name}
                                                                                        className="w-5 h-auto rounded-[2px] object-cover"
                                                                                    />
                                                                                    <span>{country.name}</span>
                                                                                </div>
                                                                                <span className="text-muted-foreground text-sm">{country.dial_code}</span>
                                                                            </CommandItem>
                                                                        ))}
                                                                    </CommandGroup>
                                                                </CommandList>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                                <Input
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    className="h-[50px] rounded-[15px] border-[#dfeaf2] bg-white text-[#718ebf] text-[15px] pl-[110px] pr-4 focus:border-[#3371eb] focus:ring-[#3371eb]"
                                                    placeholder="9876543210"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Remaining Form Fields Grid - with left margin to align with fields above */}
                                <div className="ml-[150px] grid grid-cols-1 md:grid-cols-2 gap-x-[30px] gap-y-6">
                                    {/* Date of Birth */}
                                    <div className="space-y-2">
                                        <Label className="text-[#232323] text-base font-normal">Date of Birth</Label>
                                        <DatePicker
                                            value={dateOfBirth}
                                            onChange={setDateOfBirth}
                                            placeholder="25/01/1990"
                                        />
                                    </div>

                                    {/* Zodiac Sign */}
                                    <div className="space-y-2">
                                        <Label className="text-[#232323] text-base font-normal">Zodiac Sign</Label>
                                        <Select value={zodiacSign} onValueChange={setZodiacSign}>
                                            <SelectTrigger className="h-[50px] rounded-[15px] border-[#dfeaf2] bg-white text-[#718ebf] text-[15px] pl-4 pr-4 focus:border-[#3371eb] focus:ring-[#3371eb]">
                                                <SelectValue placeholder="Select zodiac sign" />
                                            </SelectTrigger>
                                            <SelectContent className="w-auto min-w-[140px] rounded-lg border-[#e8eef3] bg-white shadow-md p-1">
                                                <SelectItem value="Aries">Aries</SelectItem>
                                                <SelectItem value="Taurus">Taurus</SelectItem>
                                                <SelectItem value="Gemini">Gemini</SelectItem>
                                                <SelectItem value="Cancer">Cancer</SelectItem>
                                                <SelectItem value="Leo">Leo</SelectItem>
                                                <SelectItem value="Virgo">Virgo</SelectItem>
                                                <SelectItem value="Libra">Libra</SelectItem>
                                                <SelectItem value="Scorpio">Scorpio</SelectItem>
                                                <SelectItem value="Sagittarius">Sagittarius</SelectItem>
                                                <SelectItem value="Capricorn">Capricorn</SelectItem>
                                                <SelectItem value="Aquarius">Aquarius</SelectItem>
                                                <SelectItem value="Pisces">Pisces</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Postal Code */}
                                    <div className="space-y-2">
                                        <Label className="text-[#232323] text-base font-normal flex items-center gap-2">
                                            Postal Code
                                            {loadingPostal && <span className="text-xs text-blue-500 animate-pulse">Detecting...</span>}
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                value={postalCode}
                                                onChange={(e) => setPostalCode(e.target.value)}
                                                className="h-[50px] rounded-[15px] border-[#dfeaf2] bg-white text-[#718ebf] text-[15px] pl-4 pr-4 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-[#dfeaf2]"
                                                placeholder="45962"
                                            />
                                        </div>
                                    </div>

                                    {/* Billing Address */}
                                    <div className="space-y-2">
                                        <Label className="text-[#232323] text-base font-normal">Billing Address</Label>
                                        <div className="relative">
                                            <Input
                                                value={billingAddress}
                                                onChange={(e) => setBillingAddress(e.target.value)}
                                                className="h-[50px] rounded-[15px] border-[#dfeaf2] bg-white text-[#718ebf] text-[15px] pl-4 pr-4 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-[#dfeaf2]"
                                                placeholder="San Jose, California, USA"
                                            />
                                        </div>
                                    </div>

                                    {/* City */}
                                    <div className="space-y-2">
                                        <Label className="text-[#232323] text-base font-normal">City</Label>
                                        <div className="relative">
                                            <Input
                                                value={city}
                                                onChange={(e) => setCity(e.target.value)}
                                                className="h-[50px] rounded-[15px] border-[#dfeaf2] bg-white text-[#718ebf] text-[15px] pl-4 pr-4 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-[#dfeaf2]"
                                                placeholder="San Jose"
                                            />
                                        </div>
                                    </div>



                                    {/* Country */}
                                    <div className="space-y-2">
                                        <Label className="text-[#232323] text-base font-normal">Country</Label>
                                        <div className="relative">
                                            <Input
                                                value={country}
                                                onChange={(e) => setCountry(e.target.value)}
                                                className="h-[50px] rounded-[15px] border-[#dfeaf2] bg-white text-[#718ebf] text-[15px] pl-4 pr-4 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-[#dfeaf2]"
                                                placeholder="USA"
                                            />
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
                            </>
                        )}

                        {activeTab === 'preferences' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Currency */}
                                    <div className="space-y-2">
                                        <Label className="text-[#232323] text-base font-normal">Currency</Label>
                                        <Popover open={openCurrency} onOpenChange={setOpenCurrency}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={openCurrency}
                                                    className="w-full h-[50px] justify-between rounded-[15px] border-[#dfeaf2] bg-white text-[#718ebf] font-normal text-[15px] px-4 hover:bg-white hover:text-[#718ebf]"
                                                >
                                                    {currency
                                                        ? (() => {
                                                            const c = currencies.find((c) => c.code === currency);
                                                            return c ? `${c.code} - ${c.name}` : currency;
                                                        })()
                                                        : "Select currency..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[400px] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Search currency..." />
                                                    <CommandList>
                                                        <CommandEmpty>No currency found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {currencies.map((c) => (
                                                                <CommandItem
                                                                    key={c.code}
                                                                    value={c.name}
                                                                    onSelect={() => {
                                                                        setCurrency(c.code);
                                                                        setOpenCurrency(false);
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            currency === c.code ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    {c.code} - {c.name} ({c.symbol})
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    {/* Time Zone */}
                                    <div className="space-y-2">
                                        <Label className="text-[#232323] text-base font-normal">Time Zone</Label>
                                        <Popover open={openTimezone} onOpenChange={setOpenTimezone}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={openTimezone}
                                                    className="w-full h-[50px] justify-between rounded-[15px] border-[#dfeaf2] bg-white text-[#718ebf] font-normal text-[15px] px-4 hover:bg-white hover:text-[#718ebf]"
                                                >
                                                    {timezone
                                                        ? timezones.find((t) => t.value === timezone)?.label || timezone
                                                        : "Select time zone..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[400px] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Search time zone..." />
                                                    <CommandList>
                                                        <CommandEmpty>No time zone found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {timezones.map((t) => (
                                                                <CommandItem
                                                                    key={t.value}
                                                                    value={t.label}
                                                                    onSelect={() => {
                                                                        setTimezone(t.value);
                                                                        setOpenTimezone(false);
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            timezone === t.value ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    {t.label}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                {/* Dark Mode */}
                                <div className="space-y-4">
                                    <Label className="text-[#333b69] text-[17px] font-medium block mb-4">Notification</Label>
                                    {/* Note: Design puts 'Notification' header before toggles, but Dark Mode is separate. 
                                    Following Visual Order: Dark Mode first, then Notification section */}

                                    <div className="flex items-center gap-4">
                                        <Switch
                                            checked={darkMode}
                                            onCheckedChange={setDarkMode}
                                            className="data-[state=checked]:bg-[#3371eb]"
                                        />
                                        <span className="text-[#232323] text-base font-normal">Dark Mode</span>
                                    </div>
                                </div>

                                {/* Notification Section */}
                                <div className="space-y-4">
                                    <h3 className="text-[#333b69] text-[17px] font-medium">Notification</h3>

                                    <div className="flex items-center gap-4">
                                        <Switch
                                            checked={notifyPayments}
                                            onCheckedChange={setNotifyPayments}
                                            className="data-[state=checked]:bg-[#3371eb]"
                                        />
                                        <span className="text-[#232323] text-base font-normal">Payments and Subscriptions</span>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <Switch
                                            checked={notifyOffers}
                                            onCheckedChange={setNotifyOffers}
                                            className="data-[state=checked]:bg-[#3371eb]"
                                        />
                                        <span className="text-[#232323] text-base font-normal">Offers and Recommendations</span>
                                    </div>
                                </div>

                                {/* Save Button */}
                                <div className="flex justify-end mt-8">
                                    <Button
                                        onClick={handlePreferencesSave}
                                        disabled={loading}
                                        className="bg-[#3371eb] hover:bg-[#2a5fd6] text-white px-8 py-3 rounded-lg font-medium text-base min-w-[190px] h-[50px] transition-colors"
                                    >
                                        {loading ? "Saving..." : "Save"}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex flex-col lg:flex-row gap-12">
                                    {/* Left Column: Settings */}
                                    <div className="flex-1 space-y-8">
                                        {/* 2FA Section */}
                                        <div>
                                            <h3 className="text-[#333b69] text-[17px] font-medium mb-4">Two-factor Authentication</h3>
                                            <div className="flex items-center gap-4">
                                                <Switch
                                                    checked={twoFactorEnabled}
                                                    onCheckedChange={setTwoFactorEnabled}
                                                    className="data-[state=checked]:bg-[#3371eb]"
                                                />
                                                <span className="text-[#232323] text-base font-normal">Enable or disable two factor authentication</span>
                                            </div>
                                        </div>

                                        {/* Change Password Section */}
                                        <div className="space-y-6">
                                            <h3 className="text-[#333b69] text-[17px] font-medium">Change Password</h3>

                                            <div className="space-y-2">
                                                <Label className="text-[#232323] text-base font-normal">Current Password</Label>
                                                <Input
                                                    type="password"
                                                    value={currentPassword}
                                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                                    className="h-[50px] max-w-[510px] rounded-[15px] border-[#dfeaf2] bg-white text-[#718ebf] text-[15px] px-4 focus-visible:ring-0 focus-visible:ring-offset-0"
                                                    placeholder="**********"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-[#232323] text-base font-normal">New Password</Label>
                                                <Input
                                                    type="password"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    className="h-[50px] max-w-[510px] rounded-[15px] border-[#dfeaf2] bg-white text-[#718ebf] text-[15px] px-4 focus-visible:ring-0 focus-visible:ring-offset-0"
                                                    placeholder="**********"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: QR Code */}
                                    {twoFactorEnabled && (
                                        <div className="flex justify-center lg:justify-end">
                                            <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 h-fit">
                                                <QRCode
                                                    value={`otpauth://totp/NinjaPDF:${user?.email || 'User'}?secret=JBSWY3DPEHPK3PXP&issuer=NinjaPDF`}
                                                    size={180}
                                                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                                    viewBox={`0 0 256 256`}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Save Button */}
                                <div className="flex justify-end mt-8">
                                    <Button
                                        onClick={handlePreferencesSave}
                                        disabled={loading}
                                        className="bg-[#3371eb] hover:bg-[#2a5fd6] text-white px-8 py-3 rounded-lg font-medium text-base min-w-[190px] h-[50px] transition-colors"
                                    >
                                        {loading ? "Saving..." : "Save"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div >

            {/* Crop Modal */}
            {
                cropModalOpen && selectedImage && (
                    <AvatarCropModal
                        open={cropModalOpen}
                        onClose={() => {
                            setCropModalOpen(false);
                            setSelectedImage(null);
                            setSelectedFile(null);
                        }}
                        imageSrc={selectedImage}
                        onCropComplete={handleCropComplete}
                    />
                )
            }
        </div >
    );
}

