import { WithContext, WebSite, Organization, SoftwareApplication } from "schema-dts";

export default function JsonLd() {
    const baseUrl = "https://18pluspdf.com";

    const websiteSchema: WithContext<WebSite> = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "18+ PDF",
        url: baseUrl,
        potentialAction: {
            "@type": "SearchAction",
            target: {
                "@type": "EntryPoint",
                urlTemplate: `${baseUrl}/search?q={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
        } as any,
    };

    const organizationSchema: WithContext<Organization> = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "18+ PDF",
        url: baseUrl,
        logo: `${baseUrl}/icon.png`,
        sameAs: [
            "https://www.facebook.com/share/p/1Dank93EJx/",
            "https://www.instagram.com/p/DS8B0LJGKtD/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
        ],
        contactPoint: {
            "@type": "ContactPoint",
            telephone: "+1-555-555-5555",
            contactType: "customer service",
        },
    };

    const softwareAppSchema: WithContext<SoftwareApplication> = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "18+ PDF Tools",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
        },
        aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.9",
            ratingCount: "1250",
        },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
            />
        </>
    );
}
