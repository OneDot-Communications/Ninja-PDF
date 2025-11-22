import { Header } from "./header";
import { Footer } from "./footer";

interface ToolShellProps {
    title: string;
    description: string;
    children: React.ReactNode;
}

export function ToolShell({ title, description, children }: ToolShellProps) {
    return (
        <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1 bg-muted/10">
                <section className="bg-primary py-16 text-center text-primary-foreground">
                    <div className="container mx-auto px-4 md:px-6">
                        <h1 className="mb-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
                            {title}
                        </h1>
                        <p className="mx-auto max-w-[700px] text-lg text-primary-foreground/80">
                            {description}
                        </p>
                    </div>
                </section>
                <section className="container mx-auto -mt-8 px-4 pb-20 md:px-6">
                    <div className="rounded-3xl border bg-background p-6 shadow-xl md:p-12">
                        {children}
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
