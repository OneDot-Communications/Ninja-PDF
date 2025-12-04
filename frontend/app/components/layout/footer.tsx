import Link from "next/link";
import { FileText } from "lucide-react";

export function Footer() {
    return (
        <footer className="bg-muted text-foreground">
            <div className="container mx-auto py-16 px-4 md:px-6">
                <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
                    <div className="space-y-4">
                        <Link href="/" className="flex items-center">
                            <img src="/logo.png" alt="Ninja PDF" className="h-16 w-auto mt-4" />
                        </Link>
                        <p className="text-sm text-muted-foreground">
                            The ultimate PDF toolset for all your document needs. Fast, secure, and easy to use.
                        </p>
                    </div>
                    <div>
                        <h3 className="mb-4 text-sm font-semibold text-foreground">Product</h3>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li><Link href="/pricing" className="hover:text-foreground">Pricing</Link></li>
                            <li><Link href="/desktop" className="hover:text-foreground">Desktop</Link></li>
                            <li><Link href="/mobile" className="hover:text-foreground">Mobile</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="mb-4 text-sm font-semibold text-foreground">Solutions</h3>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li><Link href="/business" className="hover:text-foreground">Business</Link></li>
                            <li><Link href="/education" className="hover:text-foreground">Education</Link></li>
                            <li><Link href="/developers" className="hover:text-foreground">Developers</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="mb-4 text-sm font-semibold text-foreground">Company</h3>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li><Link href="/about" className="hover:text-foreground">About</Link></li>
                            <li><Link href="/blog" className="hover:text-foreground">Blog</Link></li>
                            <li><Link href="/contact" className="hover:text-foreground">Contact</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="mt-16 border-t border-border pt-8 text-center text-sm text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} Ninja PDF. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
