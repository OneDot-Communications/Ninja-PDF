import { Header } from "../components/layout/header";
import { Footer } from "../components/layout/footer";
import { ToolCard } from "../components/ui/tool-card";
import { tools } from "../lib/tools";

export default function FeaturesPage() {
  const categories = [
    "Organize PDF",
    "Optimize PDF",
    "Convert to PDF",
    "Convert from PDF",
    "Edit PDF",
    "PDF Security",
    "Workflows",
  ];

  return (
    <div className="flex min-h-screen flex-col font-sans text-foreground">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-background pt-20 pb-16 text-center">
          <div className="container mx-auto px-4 md:px-6">
            <h1 className="mx-auto mb-8 max-w-4xl text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl">
              All PDF Tools & Features
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-xl text-muted-foreground">
              Explore our complete collection of 50+ PDF tools. All features are 100% FREE and easy to use!
            </p>
          </div>
        </section>

        {/* Tools Section */}
        <section className="bg-muted py-24">
          <div className="container mx-auto px-4 md:px-6">
            {categories.map((category) => {
              const categoryTools = tools.filter((tool) => tool.category === category);
              if (categoryTools.length === 0) return null;

              return (
                <div key={category} className="mb-16">
                  <h2 className="mb-8 text-2xl font-bold text-foreground">{category}</h2>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {categoryTools.map((tool) => (
                      <ToolCard
                        key={tool.href}
                        title={tool.title}
                        description={tool.description}
                        icon={<tool.icon className="h-8 w-8" />}
                        href={tool.href}
                        isNew={tool.isNew}
                        category={tool.category}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
