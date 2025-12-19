"use client";

import { useAuth } from "@/lib/context/AuthContext";
import {
    Bell,
    Search,
    Menu,
    LogOut,
    User,
    Settings,
    ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { SharedSidebar } from "./SharedSidebar";
import { useRouter } from "next/navigation";

interface HeaderProps {
    role?: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
}

export function Header({ role = 'USER' }: HeaderProps) {
    const { user, logout } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white px-6 shadow-sm">
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="md:hidden">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle navigation menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72">
                    {/* Render appropriate sidebar for mobile */}
                    {role === 'USER' ? (
                        <Sidebar />
                    ) : (
                        <SharedSidebar type={role as 'ADMIN' | 'SUPER_ADMIN'} className="border-none shadow-none w-full" />
                    )}
                </SheetContent>
            </Sheet>

            <div className="flex flex-1 items-center gap-4 md:gap-8">
                <form className="flex-1 md:w-auto md:flex-none">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            type="search"
                            placeholder="Search..."
                            className="bg-slate-50 pl-9 md:w-[300px] lg:w-[400px]"
                        />
                    </div>
                </form>
            </div>

            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-slate-500">
                    <Bell className="h-5 w-5" />
                    <span className="sr-only">Notifications</span>
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold border border-blue-200">
                                {user?.first_name?.[0] || user?.email?.[0] || 'U'}
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{user?.first_name} {user?.last_name}</p>
                                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => router.push('/profile')}>
                            <User className="mr-2 h-4 w-4" /> Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push('/profile/settings')}>
                            <Settings className="mr-2 h-4 w-4" /> Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" /> Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
