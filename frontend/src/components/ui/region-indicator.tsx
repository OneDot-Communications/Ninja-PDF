"use client";

import { useState, useEffect } from 'react';
import { getUserCountry, LocationData } from '@/lib/services/geolocation';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * RegionIndicator Component
 * Displays the user's detected country with flag
 * Non-editable, auto-detected from IP
 */
export function RegionIndicator() {
    const [location, setLocation] = useState<LocationData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function detectLocation() {
            try {
                const countryData = await getUserCountry();
                setLocation(countryData);
            } catch (error) {
                console.error('Failed to detect location:', error);
                // Set default fallback
                setLocation({
                    country_code: 'US',
                    country_name: 'United States',
                    flag: '🇺🇸',
                });
            } finally {
                setLoading(false);
            }
        }

        detectLocation();
    }, []);

    if (loading) {
        return <Skeleton className="h-10 w-28 rounded-lg" />;
    }

    if (!location) {
        return null;
    }

    // Get flag image URL using flagcdn.com or country-flags API
    const getFlagUrl = (code: string) => {
        return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
    };

    return (
        <div 
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-white border-2 border-slate-200 hover:border-slate-300 cursor-default select-none shadow-sm transition-all"
            title={`Your region: ${location.country_name}`}
        >
            {/* Flag Image with fallback to emoji */}
            <div className="relative w-6 h-6 flex items-center justify-center">
                <img 
                    src={getFlagUrl(location.country_code)}
                    alt={`${location.country_name} flag`}
                    className="w-6 h-4 object-cover rounded-sm shadow-sm"
                    onError={(e) => {
                        // Fallback to emoji if image fails
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                            parent.innerHTML = `<span class="text-xl leading-none">${location.flag}</span>`;
                        }
                    }}
                />
            </div>
            
            {/* Country Code */}
            <span className="text-sm font-semibold text-slate-800 tracking-wide whitespace-nowrap">
                {location.country_code}
            </span>
        </div>
    );
}
