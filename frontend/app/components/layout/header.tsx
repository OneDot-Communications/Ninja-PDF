import Link from "next/link";
import { Button } from "../ui/button";
import { FileText, Github } from "lucide-react";

export function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
                <Link href="/" className="flex items-center">
                    <span className="text-3xl font-bold">
                        <span className="text-red-600">18+</span>
                        <span className="text-slate-800"> PDF</span>
                    </span>
                </Link>
                <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                    <Link href="/merge-pdf" className="transition-colors hover:text-primary">
                        Merge PDF
                    </Link>
                    <Link href="/split-pdf" className="transition-colors hover:text-primary">
                        Split PDF
                    </Link>
                    <Link href="/compress-pdf" className="transition-colors hover:text-primary">
                        Compress PDF
                    </Link>
                </nav>
                {/* <Link href="https://github.com/Divith123/Ninja-Reader" className="flex items-center gap-2 text-base font-bold hover:text-primary">
                    <Github className="h-5 w-5" />
                    GitHub
                </Link> */}
            </div>
        </header>
    );
}
