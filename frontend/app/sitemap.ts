import { MetadataRoute } from "next";
import { tools } from "./lib/tools";

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = "https://18pluspdf.com";

    const toolUrls = tools.map((tool) => ({
        url: `${baseUrl}${tool.href}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
    }));

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 1,
        },
        ...toolUrls,
    ];
}
