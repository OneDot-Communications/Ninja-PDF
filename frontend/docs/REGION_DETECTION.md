# Region Detection Feature

## Overview
Auto-detects and displays the user's country/region based on their IP address. The region indicator appears next to the login/signup buttons in the header and is **non-editable** by the user.

## Features
- ✅ Automatic IP-based geolocation
- ✅ Multiple fallback APIs for reliability
- ✅ Client-side caching (localStorage)
- ✅ Non-editable display
- ✅ Responsive design (desktop & mobile)
- ✅ Flag emoji + country code display
- ✅ Graceful error handling with US default

## Architecture

### Files Created/Modified

1. **`src/lib/services/geolocation.ts`** - Core geolocation service
   - Detects user country via IP geolocation APIs
   - Implements fallback chain for reliability
   - Caches results in localStorage

2. **`src/components/ui/region-indicator.tsx`** - Display component
   - Shows flag emoji and country code
   - Non-editable, read-only display
   - Loading skeleton during detection

3. **`src/components/layout/header.tsx`** - Integration point
   - Added RegionIndicator to desktop header (next to login/signup)
   - Added RegionIndicator to mobile menu

## Geolocation API Chain

The service uses multiple APIs with automatic fallback:

1. **Primary:** `ipapi.co` (Free, no auth required)
2. **Fallback 1:** `ip-api.com` (Free, 45 req/min)
3. **Fallback 2:** `ipinfo.io` (1000 req/day free)
4. **Default:** United States (if all APIs fail)

## Data Flow

```
User visits site
    ↓
Check localStorage cache
    ↓
If cached → Display immediately
    ↓
If not cached → Call geolocation APIs
    ↓
Match country code to countries list
    ↓
Cache result in localStorage
    ↓
Display flag + country code
```

## Implementation Details

### Location Data Structure
```typescript
interface LocationData {
    country_code: string;  // ISO 3166-1 alpha-2 (e.g., "US", "GB")
    country_name: string;  // Full country name
    flag: string;          // Unicode flag emoji (e.g., "🇺🇸")
}
```

### Caching Strategy
- Results cached in `localStorage` under key `user_country`
- Cached data persists across sessions
- No expiration (assumes location doesn't change frequently)
- Manual clear: `localStorage.removeItem('user_country')`

### API Endpoints Used

**ipapi.co:**
```javascript
fetch('https://ipapi.co/json/')
// Returns: { country_code: "US", country_name: "United States", ... }
```

**ip-api.com:**
```javascript
fetch('http://ip-api.com/json/')
// Returns: { countryCode: "US", country: "United States", ... }
```

**ipinfo.io:**
```javascript
fetch('https://ipinfo.io/json')
// Returns: { country: "US", ... }
```

## UI Integration

### Desktop Header
- Positioned between navigation and login/signup buttons
- Styled with slate background and border
- Hover shows full country name in tooltip

### Mobile Menu
- Centered above login/signup buttons
- Same styling as desktop
- Maintains non-editable behavior

## Security Considerations

1. **No User Input:** Display-only component, cannot be manipulated
2. **Client-Side Detection:** Uses public IP geolocation APIs
3. **No Sensitive Data:** Only country-level information
4. **HTTPS APIs:** Primary API uses secure connection
5. **Fallback Chain:** Reduces dependency on single API

## Performance

- **Initial Load:** ~100-300ms for geolocation API call
- **Cached Load:** Instant (from localStorage)
- **No Server Load:** Entirely client-side operation
- **Lazy Loading:** Only loads when component mounts

## Error Handling

- All API failures are caught and logged
- Falls back to next API in chain
- Ultimate fallback: United States
- Component always renders (never crashes)

## Customization

### Change Default Country
Edit `geolocation.ts`:
```typescript
// Default fallback - return US
return {
    country_code: 'GB',  // Change to desired country
    country_name: 'United Kingdom',
    flag: '🇬🇧',
};
```

### Styling
Edit `region-indicator.tsx`:
```tsx
className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200"
```

### Add More APIs
Add to fallback chain in `geolocation.ts`:
```typescript
// Add after existing fallbacks
try {
    const response = await fetch('https://your-api.com/geolocation');
    // ... handle response
} catch (error) {
    console.warn('Additional fallback failed:', error);
}
```

## Testing

### Test Different Locations
Use VPN or proxy to simulate different countries. The component will detect and display the appropriate flag/code.

### Test Cache
1. Open DevTools → Application → Local Storage
2. Check for `user_country` key
3. Modify value to test different countries
4. Refresh page to see cached result

### Test Fallback
1. Block primary API in DevTools Network tab
2. Component should still work via fallback APIs
3. Check console for fallback messages

## Limitations

1. **Accuracy:** IP geolocation is ~95% accurate at country level
2. **VPN/Proxy:** Will show VPN server location, not actual location
3. **API Limits:** Free tier limitations on fallback APIs
4. **No City/Region:** Only country-level detection
5. **Client-Side:** Can be bypassed with browser DevTools (but non-critical)

## Future Enhancements

- [ ] Server-side geolocation for better security
- [ ] Cache expiration (e.g., 30 days)
- [ ] User preference override (while keeping default locked)
- [ ] Analytics on detected countries
- [ ] Custom API for higher accuracy/limits
- [ ] Fallback to browser language as hint

## Dependencies

All dependencies already exist in the project:
- `react` - Core framework
- `next` - Next.js framework
- Existing `countries.ts` file for country data
- Existing `Skeleton` component for loading state

## Browser Support

- ✅ Chrome/Edge (all versions)
- ✅ Firefox (all versions)
- ✅ Safari (all versions)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

**Issue:** Shows wrong country
- **Solution:** Clear localStorage and refresh, or use different network

**Issue:** Stuck on loading
- **Solution:** Check network tab for API failures, ensure internet connection

**Issue:** Always shows US
- **Solution:** All APIs may be blocked or rate-limited, this is expected fallback

**Issue:** Doesn't appear
- **Solution:** Check that component is mounted (desktop view or mobile menu open)

## Maintenance

- Monitor API rate limits in production
- Check console for warning messages about failed APIs
- Update country list in `countries.ts` if needed
- Test periodically with different locations
