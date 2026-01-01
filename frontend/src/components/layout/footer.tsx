import Link from "next/link";
import { FileText } from "lucide-react";

export function Footer() {
    return (
        <footer className="bg-muted text-foreground">
            <div className="container mx-auto py-16 px-4 md:px-6">
                <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Link href="/" className="flex items-center">
                                <span className="text-3xl font-bold">
                                    <span className="text-red-600">18+</span>
                                    <span className="text-slate-800"> PDF</span>
                                </span>
                            </Link>
                            <span className="ml-2 inline-block bg-[#FF5252] text-white text-xs font-bold px-2 py-0.5 rounded-md">ALPHA</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            The ultimate PDF toolset for all your document needs. Fast, secure, and easy to use.
                        </p>

                        <div className="flex items-center gap-4 mt-2">
                            <a href="https://www.instagram.com/p/DS8B0LJGKtD/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-slate-500 hover:text-slate-900">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.5" y2="6.5"></line></svg>
                            </a>
                            <a href="https://www.facebook.com/share/p/1Dank93EJx/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-slate-500 hover:text-slate-900">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a4 4 0 0 0-4 4v3H7v4h4v8h4v-8h3l1-4h-4V6a1 1 0 0 1 1-1h3z"></path></svg>
                            </a>
                        </div>
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
                    <p>&copy; {new Date().getFullYear()} 18+ PDF. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
