# Region Indicator - Visual Guide

## 🎨 How It Looks

### Desktop View (Header)

#### Before Login
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  [Logo]  [Merge] [Split] [Compress] [Convert] [All Tools]     🇺🇸 US  [Login] [Sign Up]  │
│   ALPHA                                                          ↑ HERE                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### After Login
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  [Logo]  [Merge] [Split] [Compress] [Convert] [All Tools]     🇺🇸 US  Hello, John  👤    │
│   ALPHA                                                          ↑ HERE                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### Mobile View (Header Collapsed)

```
┌─────────────────────────────────────────────────┐
│  [Logo ALPHA]                              [☰]  │
└─────────────────────────────────────────────────┘
```

---

### Mobile View (Menu Open)

```
┌─────────────────────────────────────────────────┐
│  [Logo ALPHA]                              [×]  │
├─────────────────────────────────────────────────┤
│                                                  │
│                   🇺🇸 US                        │  ← Region Indicator
│                   ↑ HERE                         │
│                                                  │
│         [Login]        [Sign Up]                │
│                                                  │
│  📄 Merge PDF                                   │
│  ✂️ Split PDF                                   │
│  🗜️ Compress PDF                                │
│  ...                                             │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 🎭 Component States

### 1. Loading State (First Visit)
```
┌──────────────────────────────┐
│  [████████]  ← Skeleton      │
└──────────────────────────────┘
```

### 2. Loaded State (Country Detected)
```
┌──────────────────────────────┐
│  🇺🇸 US                       │  ← Flag + Code
└──────────────────────────────┘
```

### 3. Hover State (Shows Tooltip)
```
┌──────────────────────────────┐
│  🇺🇸 US                       │
│   ↓                           │
│  [Your region: United States] │  ← Tooltip
└──────────────────────────────┘
```

---

## 🌍 Examples by Country

### United States
```
🇺🇸 US
```

### United Kingdom
```
🇬🇧 GB
```

### India
```
🇮🇳 IN
```

### Germany
```
🇩🇪 DE
```

### Japan
```
🇯🇵 JP
```

### Brazil
```
🇧🇷 BR
```

### Australia
```
🇦🇺 AU
```

### Canada
```
🇨🇦 CA
```

### France
```
🇫🇷 FR
```

### China
```
🇨🇳 CN
```

---

## 🎨 Styling Breakdown

### Component Box
```
┌─────────────────────────────────────────────┐
│ Padding: 12px (horizontal) 8px (vertical)   │
│ Background: Light slate (#f8fafc)           │
│ Border: 1px solid slate (#e2e8f0)           │
│ Border Radius: 8px (rounded-lg)             │
│ Cursor: default (not clickable)             │
│ User-select: none (not selectable)          │
└─────────────────────────────────────────────┘
```

### Flag Emoji
```
🇺🇸
Size: 2xl (text-2xl ~24px)
Leading: none (tight fit)
Aria-label: "{Country} flag"
```

### Country Code
```
US
Color: Slate 700 (#334155)
Font: Medium weight (500)
Size: Small (14px)
Whitespace: nowrap (no wrapping)
```

---

## 📐 Dimensions

### Desktop
```
Width: ~85-100px (auto-sized to content)
Height: 40px (h-10)
Gap between elements: 8px (gap-2)
```

### Mobile
```
Same dimensions, but centered in container
Margin: auto (mx-auto via flex justify-center)
```

---

## 🔄 Animation & Transitions

### Loading → Loaded
```
Skeleton (pulsing gray box)
       ↓
    150ms fade
       ↓
Flag + Code (full opacity)
```

### Hover
```
No visual change (non-interactive)
Only tooltip appears (browser default)
```

---

## 🎯 Positioning Details

### Desktop Header Layout
```
┌────────────────────────────────────────────────────────────────────┐
│  [Navigation]              [Spacer/Flex-Grow]      [Actions]       │
│                                                                     │
│  [Logo + Nav Links]                          [Region][Login][Signup]│
└────────────────────────────────────────────────────────────────────┘
```

### Mobile Menu Layout
```
┌─────────────────────────┐
│  [Header with X]        │
├─────────────────────────┤
│  <Content area>         │
│    ┌─────────────────┐  │
│    │  [Region]       │  │  ← Centered
│    └─────────────────┘  │
│                         │
│    [Login] [Signup]     │  ← Grid 2 columns
│                         │
│    [Navigation Links]   │
└─────────────────────────┘
```

---

## 🖥️ Responsive Behavior

### Desktop (md breakpoint and up)
- Visible in header
- Aligned with login/signup buttons
- Inline display (flex row)

### Mobile/Tablet (below md breakpoint)
- Hidden in header
- Shows in mobile menu when opened
- Centered above action buttons
- Full visibility

---

## 🎨 Color Palette

```css
Background:     #f8fafc  (slate-50)
Border:         #e2e8f0  (slate-200)
Text:           #334155  (slate-700)
Flag:           [Unicode emoji colors]
Skeleton:       #f1f5f9  (slate-100)
```

---

## 📊 Visual Hierarchy

```
Priority Level:

1. Logo (highest)
2. Navigation links
3. Login/Signup buttons
4. Region Indicator  ← Here (tertiary)
5. Other elements
```

---

## 🔍 Accessibility

### ARIA Labels
```html
<span aria-label="United States flag">🇺🇸</span>
```

### Title Attribute
```html
<div title="Your region: United States">
  ...
</div>
```

### Keyboard Navigation
- Not focusable (not interactive)
- Does not interfere with tab order
- Screen readers announce flag label

---

## 💡 Design Philosophy

**Goals:**
✓ Subtle and non-intrusive
✓ Clear and informative
✓ Consistent with site design
✓ Professional appearance
✓ Mobile-friendly

**Principles:**
- Minimal visual weight
- Familiar flag representation
- Standard country codes (ISO 3166-1)
- No distracting animations
- Maintains header balance

---

## 🎬 User Experience Flow

### First-Time Visitor
1. Arrives at site
2. Sees skeleton loader (brief)
3. Flag + code appears
4. Can hover for full country name
5. Result cached for future visits

### Returning Visitor
1. Arrives at site
2. Immediately sees flag + code (cached)
3. No loading delay
4. Instant display

### Mobile User
1. Opens mobile menu
2. Sees region at top (centered)
3. Provides context before login
4. Non-obtrusive placement

---

## 🎨 Design Variations (Not Implemented)

Potential alternative designs for future consideration:

### Compact Version
```
🇺🇸  (flag only, no code)
```

### Expanded Version
```
🇺🇸 United States  (full name)
```

### Dropdown Version (if made editable)
```
🇺🇸 US ▾  (with dropdown arrow)
```

---

## 📸 Screenshot Placeholders

### Desktop (Full Width)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [18+ PDF ALPHA] [Merge] [Split] [Compress] [Convert] [All]   🇺🇸 US [Login] [Sign Up] │
└─────────────────────────────────────────────────────────────────────────────┘
     ↑ Logo          ↑ Navigation menu                         ↑        ↑ Actions
```

### Mobile (Menu Open)
```
┌──────────────────────────┐
│ [18+ PDF ALPHA]      [×] │
├──────────────────────────┤
│                          │
│       🇺🇸 US              │
│                          │
│   [Login]   [Sign Up]   │
│                          │
│ 📄 Merge PDF             │
│ ✂️ Split PDF             │
│ 🗜️ Compress PDF          │
│ 🔄 Convert PDF           │
│ 🔧 All Tools             │
│                          │
└──────────────────────────┘
```

---

## ✨ Final Visual Summary

**What Users See:**
- Clean, minimalist country indicator
- Familiar flag emoji (universally recognized)
- Two-letter country code (ISO standard)
- Positioned naturally next to login area
- No visual clutter or distraction
- Professional and polished appearance

**What Users Experience:**
- Instant recognition of detected region
- Confidence in location-based services
- Non-intrusive design
- Consistent cross-device experience
- Reliable and accurate detection

---

**Visual Design: COMPLETE** ✅
