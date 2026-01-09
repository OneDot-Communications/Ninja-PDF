/**
 * Geolocation Service
 * Detects user's country based on IP address using multiple fallback APIs
 */

import { countries, Country } from '../countries';

export interface LocationData {
    country_code: string;
    country_name: string;
    flag: string;
}

/**
 * Detect user's country using IP geolocation APIs
 * Uses multiple fallback services for reliability
 */
export async function detectUserCountry(): Promise<LocationData> {
    // Try primary API: ipapi.co
    try {
        const response = await fetch('https://ipapi.co/json/', {
            method: 'GET',
            cache: 'no-store',
        });
        
        if (response.ok) {
            const data = await response.json();
            const countryCode = data.country_code || data.country;
            
            if (countryCode) {
                const country = findCountryByCode(countryCode);
                if (country) {
                    return {
                        country_code: country.code,
                        country_name: country.name,
                        flag: country.flag,
                    };
                }
            }
        }
    } catch (error) {
        console.warn('Primary geolocation API failed:', error);
    }

    // Fallback 1: ip-api.com
    try {
        const response = await fetch('http://ip-api.com/json/', {
            method: 'GET',
            cache: 'no-store',
        });
        
        if (response.ok) {
            const data = await response.json();
            const countryCode = data.countryCode;
            
            if (countryCode) {
                const country = findCountryByCode(countryCode);
                if (country) {
                    return {
                        country_code: country.code,
                        country_name: country.name,
                        flag: country.flag,
                    };
                }
            }
        }
    } catch (error) {
        console.warn('Fallback geolocation API failed:', error);
    }

    // Fallback 2: ipinfo.io (limited to 1000 requests/day)
    try {
        const response = await fetch('https://ipinfo.io/json', {
            method: 'GET',
            cache: 'no-store',
        });
        
        if (response.ok) {
            const data = await response.json();
            const countryCode = data.country;
            
            if (countryCode) {
                const country = findCountryByCode(countryCode);
                if (country) {
                    return {
                        country_code: country.code,
                        country_name: country.name,
                        flag: country.flag,
                    };
                }
            }
        }
    } catch (error) {
        console.warn('Secondary fallback geolocation API failed:', error);
    }

    // Default fallback - return US
    return {
        country_code: 'US',
        country_name: 'United States',
        flag: '🇺🇸',
    };
}

/**
 * Find country by country code
 */
function findCountryByCode(code: string): Country | undefined {
    const normalizedCode = code.toUpperCase();
    return countries.find(c => c.code.toUpperCase() === normalizedCode);
}

/**
 * Cache the detected country in localStorage
 */
export function cacheCountry(locationData: LocationData): void {
    if (typeof window !== 'undefined') {
        try {
            localStorage.setItem('user_country', JSON.stringify(locationData));
        } catch (error) {
            console.warn('Failed to cache country data:', error);
        }
    }
}

/**
 * Get cached country from localStorage
 */
export function getCachedCountry(): LocationData | null {
    if (typeof window !== 'undefined') {
        try {
            const cached = localStorage.getItem('user_country');
            if (cached) {
                return JSON.parse(cached);
            }
        } catch (error) {
            console.warn('Failed to retrieve cached country:', error);
        }
    }
    return null;
}

/**
 * Main function to get user's country with caching
 */
export async function getUserCountry(): Promise<LocationData> {
    // Check cache first
    const cached = getCachedCountry();
    if (cached) {
        return cached;
    }

    // Detect and cache
    const locationData = await detectUserCountry();
    cacheCountry(locationData);
    
    return locationData;
}
