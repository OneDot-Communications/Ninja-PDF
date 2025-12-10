export default function JsonLd() {
    const websiteSchema = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "18+ PDF",
        "applicationCategory": "UtilitiesApplication",
        "operatingSystem": "All",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        },
        "description": "18+ PDF is a free, secure, and fast online PDF tool. Merge, split, convert, and edit PDFs directly in your browser without installation.",
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "ratingCount": "1250"
        },
        "featureList": [
            "Merge PDF",
            "Split PDF",
            "Convert PDF to Word",
            "Convert PDF to Excel",
            "Edit PDF",
            "Sign PDF",
            "Protect PDF",
            "Compress PDF"
        ],
        "screenshot": "https://18pluspdf.com/og-image.jpg",
        "softwareVersion": "1.0",
        "author": {
            "@type": "Organization",
            "name": "18+ PDF Team",
            "url": "https://18pluspdf.com"
        }
    };

    const organizationSchema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "18+ PDF",
        "url": "https://18pluspdf.com",
        "logo": "https://18pluspdf.com/favicon.svg",
        "sameAs": [
            "https://twitter.com/18pluspdf",
            "https://facebook.com/18pluspdf"
        ]
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
        </>
    );
}
