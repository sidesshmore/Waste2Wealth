# Design System — Waste2Wealth

> **Theme:** light mode throughout, with the **map tile layer** as the only dark surface in the entire app. Brand color is a deep civic green (`#25671E`), used for emphasis, primary CTAs, and active states. The app's visual language is calm, premium, and trustworthy — Linear's typography rigor, applied to a white canvas.

> **Why this matters:** Waste2Wealth is a citizen-capture app. People will use it standing on the street with one hand, in bright sunlight, on Android and iPhone. Light mode reads cleanly outdoors, the dark map gives garbage pins maximum contrast, and the typography system keeps SOL amounts and AI Vision transcripts feeling precise — not cute.

---

## 1. Visual Theme & Atmosphere

The app feels like Linear's design rigor adapted to a public-facing social-good product. White backgrounds, ultra-thin gray separators, a single chromatic accent (deep green), and Inter Variable across the entire system. Information density is managed through subtle weight changes and careful letter-spacing rather than color variation.

The only chromatic departure is the **wallet screen**: SOL purple (`#9945FF`) and Solana confirmation green (`#14F195`) appear there to make crypto amounts feel tangible. World ID blue (`#0077B6`) appears once, as the verified-human badge. Every other accent is muted green.

The map screen is the visual outlier — the tile layer goes dark (Google Maps Night style) so red garbage pins read clearly against neutral terrain. App chrome (header, FAB, bottom sheet, tab bar) stays in light mode and floats over the dark map.

**Key Characteristics:**

- Light-mode-first: `#FFFFFF` screen backgrounds, `#F5F5F5` cards, `#E5E7EB` borders
- Inter Variable with `"cv01", "ss03"` enabled globally — clean geometric alternates
- Linear's signature 510 weight as the default UI emphasis weight
- Aggressive negative letter-spacing at display sizes (-1.056px at 48px, -0.704px at 32px)
- Brand green: `#25671E` (dark/CTA bg) / `#519A66` (interactive accent) — the only chromatic color in the app chrome
- Dark map canvas — Google Maps Night style — only on the home screen
- JetBrains Mono Bold for SOL amounts, JetBrains Mono Regular for AI Vision transcripts
- Subtle elevation: white cards with `1px solid #E5E7EB` borders + light shadow (`elevation: 4` Android / `shadowOpacity: 0.05` iOS)

---

## 2. Color Palette & Roles

### Background Surfaces

- **Page Background** (`#FFFFFF`): every screen body
- **Card Surface** (`#F5F5F5`): task cards in the bottom sheet, transaction rows, segmented controls
- **Selected Chip** (`#E9F5EB`): green-tint background for active filter chips and "Verified Human" pills
- **Map Canvas** (Google Maps Night JSON): dark teal/gray basemap — only screen surface that goes dark

### Text & Content

- **Primary Text** (`#111111`): headings, body text, button labels — never pure black, slightly softened
- **Secondary Text** (`#6B7280`): timestamps, metadata, captions, placeholders, disabled states
- **Inverted Text** (`#FFFFFF`): used on `#25671E` button backgrounds and on the dark map for header chrome

### Brand & Accent

- **Brand Green Dark** (`#25671E`): primary CTA backgrounds, active tab icon, accent bars on cards, brand wordmark
- **Brand Green Mid** (`#519A66`): secondary buttons, progress fills, focused input borders, "verified" map pin fill
- **Brand Green Tint** (`#E9F5EB`): selected chip backgrounds, World ID badge background
- **Brand Green Hover** (`#1F5418`): pressed state for primary buttons (use a 0.85 opacity shift if simpler)

### Status & Map Pins

- **Map Red — Reported** (`#FF3B30`): garbage pin, also reject button border + flash
- **Map Amber — Claimed** (`#F4A261`): cleanup-in-progress pin, claim countdown ring
- **Map Green — Pending** (`#519A66`): pending-verification pin
- **Map Dark Green — Verified** (`#25671E`): confirmed cleanup pin (with optional SOL badge overlay)
- **Flagged Gray Overlay** (`rgba(0,0,0,0.4)`): applied over the pin if AI Vision flags the report

### Solana — Wallet Screen Only

- **SOL Purple** (`#9945FF`): SOL amount display in the balance card
- **Solana Confirm Green** (`#14F195`): incoming-transaction amounts

### Status

- **World ID Blue** (`#0077B6`): badge color (rarely used)
- **Error Red** (`#FF3B30`): form validation errors, destructive action confirmations

### Border & Divider

- **Border Standard** (`#E5E7EB`): all card borders, segmented control dividers, tab bar top border, input borders
- **Border Focus** (`#519A66`): focused input border (1px width unchanged)
- **Hairline Surface Tint** (`#FAFAFA`): rarely used — sub-section dividers within a card

---

## 3. Typography

### Font Families

- **Primary:** `Inter Variable`, fallbacks `SF Pro Display, -apple-system, system-ui, Segoe UI, Roboto`
- **Monospace:** `JetBrains Mono`, fallbacks `ui-monospace, SF Mono, Menlo`
- **OpenType Features:** `"cv01", "ss03"` enabled globally on Inter — geometric alternates that turn generic Inter into the Linear-style typeface. Apply via `fontVariant` in RN style sheets.

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Use |
|------|------|------|--------|-------------|----------------|-----|
| Display | Inter Variable | 48 | 510 | 1.05 | -1.056 | Onboarding hero |
| Page Title | Inter Variable | 24 | 510 | 1.25 | -0.288 | Wallet, Gallery, Profile titles |
| Heading | Inter Variable | 20 | 590 | 1.30 | -0.24 | Card headers, section titles |
| Sub-heading | Inter Variable | 18 | 510 | 1.40 | -0.18 | Bottom sheet section titles |
| Body Emphasis | Inter Variable | 16 | 510 | 1.50 | normal | Button labels, list emphasis |
| Body | Inter Variable | 16 | 400 | 1.50 | normal | Primary reading text |
| Body Small | Inter Variable | 14 | 400 | 1.50 | -0.13 | Card body, secondary copy |
| Caption | Inter Variable | 13 | 510 | 1.40 | -0.13 | Metadata, timestamps, distances |
| Tab Label | Inter Variable | 11 | 510 | 1.20 | normal | Bottom tab bar labels |
| SOL Amount Large | JetBrains Mono | 32 | 700 | 1.00 | -0.5 | Wallet balance |
| SOL Amount Small | JetBrains Mono | 18 | 700 | 1.20 | normal | Transaction row amounts |
| Vision Transcript | JetBrains Mono | 14 | 400 | 1.55 | normal | AI Vision Q/A log |
| Button Caption | Inter Variable | 11 | 510 | 1.20 | normal | Tab bar, micro labels |

### Principles

- **510 is the signature weight.** Inter Variable supports 510 (between regular 400 and medium 500). Use it for buttons, labels, active states, anything that needs subtle emphasis without shouting.
- **Three weights total: 400, 510, 590.** 400 reads, 510 emphasizes, 590 announces. Never use 700 (bold) — it breaks the system's calm rhythm.
- **Compression scales with size.** Display text gets aggressive negative tracking. Below 16px, tracking goes near-zero or slightly negative. Never positive.
- **OpenType is non-negotiable.** Without `"cv01", "ss03"`, Inter looks generic. Apply globally.
- **Mono for numbers.** SOL amounts and AI Vision transcripts are the only mono uses. They make crypto feel precise and the Vision log feel forensic.

### React Native Implementation

```ts
// constants/typography.ts
export const inter = (weight: 400 | 510 | 590, size: number) => ({
  fontFamily: 'InterVariable',
  fontWeight: String(weight) as any,
  fontSize: size,
  // OpenType features applied via fontVariant on iOS, ignored on Android
  // (Android picks them up from the ttf file if compiled with them)
  fontVariant: [{ 'font-feature-settings': '"cv01", "ss03"' } as any],
});

export const mono = (weight: 400 | 700, size: number) => ({
  fontFamily: weight === 700 ? 'JetBrainsMono-Bold' : 'JetBrainsMono-Regular',
  fontSize: size,
});
```

---

## 4. Component Stylings

### Buttons

**Primary (Brand Green)**
- Background: `#25671E`
- Text: `#FFFFFF`, Inter 510, 16px
- Height: 56, paddingHorizontal: 24
- Radius: 8
- Pressed state: opacity 0.85
- Disabled state: opacity 0.4
- Use: every primary CTA — Submit Report, I'll Clean This, Verify with World ID

**Secondary (Outline)**
- Background: `#FFFFFF`
- Text: `#25671E`, Inter 510, 16px
- Height: 56
- Border: 1px solid `#25671E`
- Radius: 8
- Use: secondary actions next to a primary CTA

**Ghost (Text)**
- Background: transparent
- Text: `#6B7280`, Inter 510, 14px
- No border
- Use: cancel links, "Don't have World App?" footers

**Reject (Destructive)**
- Background: `#FFFFFF`
- Text: `#FF3B30`, Inter 510, 16px
- Border: 1px solid `#FF3B30`
- Use: paired with Approve on the Verify card

**Camera Shutter**
- 72px circle, white outer ring
- 60px inner solid white circle
- Reanimated spring scale 0.92 on press
- Disabled at 40% opacity until GPS lock

**FAB (Floating Action — Map screen)**
- 56px circle, `#25671E` background, white camera icon
- Bottom-right of map, 24px from edges
- Subtle shadow: `elevation: 6` Android / `shadowOpacity: 0.15` iOS

### Cards & Containers

**Task Card (bottom sheet, gallery)**
- Background: `#F5F5F5`
- Border: 1px solid `#E5E7EB`
- Radius: 12
- Padding: 16
- Margin between cards: 8

**Balance Card (wallet)**
- Background: `#FFFFFF`
- 4px top accent bar: `#25671E` (extends full card width)
- Radius: 16
- Elevation: 4 (Android) / shadowOpacity 0.05 (iOS)
- Padding: 24

**Bottom Sheet (map task list)**
- Background: `#FFFFFF`
- Top border: 1px `#E5E7EB`
- Drag handle: 4px wide × 36px tall, `#E5E7EB`, centered
- Snap points: 15% (peek), 50% (half), 90% (full)

**AI Vision Transcript Card**
- Background: `#FFFFFF`
- Border: 1px solid `#E5E7EB`
- Radius: 12
- Padding: 16
- Body: JetBrains Mono Regular 14px, line-height 1.55
- Q/A blocks separated by 12px vertical spacing

### Inputs

- Background: `#FFFFFF`
- Border: 1px solid `#E5E7EB`
- Focused border: 1px solid `#519A66`
- Radius: 8
- Height: 48
- Padding: 12 horizontal
- Text: Inter Regular 16px, `#111111`
- Placeholder: `#6B7280`

### Pills & Badges

**World ID Verified Pill**
- Background: `#E9F5EB`
- Text: `#25671E`, Inter 510 13px
- Radius: 9999
- Padding: 4 vertical / 12 horizontal
- Optional World orb icon (12px) to the left of text

**Filter Chip (Gallery, Verify)**
- Inactive: `#FFFFFF` bg, `#6B7280` text, 1px `#E5E7EB` border
- Active: `#E9F5EB` bg, `#25671E` text, 1px `#519A66` border
- Radius: 9999
- Padding: 6 vertical / 14 horizontal
- Inter 510 13px

**Severity Badge**
- Minor: `#E9F5EB` bg, `#25671E` text
- Moderate: `#FFF4E5` bg, `#B45309` text
- Major: `#FEE2E2` bg, `#B91C1C` text
- Radius: 9999, padding 4×10, Inter 510 12px

**SOL Amount Pill (transaction row)**
- Background: transparent
- Text: JetBrains Mono Bold 18px, `#14F195` for incoming, `#FF3B30` for outgoing

### Segmented Control (Severity selector on report screen)

- Container: `#F5F5F5` bg, radius 8, height 48, 1px `#E5E7EB` border
- Each segment: 1/3 width, centered text
- Active segment: `#25671E` bg, white text, radius 6, 4px inset
- Inactive segment: transparent bg, `#6B7280` text

### Tab Bar

- Background: `#FFFFFF`
- Top border: 1px `#E5E7EB`
- Height: 56
- Active icon + label: `#25671E`
- Inactive: `#6B7280`
- Label: Inter 510 11px, 4px below icon
- Verify badge (red dot or count): `#FF3B30` bg, white text, 16px circle, top-right of icon

### Map Pins (custom Marker)

- Outer ring: 24px, white, 2px stroke `#FFFFFF`
- Inner circle: 18px, status color (`#FF3B30`, `#F4A261`, `#519A66`, `#25671E`)
- Icon: 10px, white (trash, person, checkmark, dollar)
- Newly-created pin: Reanimated `withRepeat(withTiming(1.2 → 1.0, 1000ms))` pulse on the outer ring
- Tap area: 44×44 minimum (use `hitSlop`)

---

## 5. Layout Principles

### Spacing System

- Base unit: **8px**
- Scale: 4 (xs), 8 (sm), 12 (md), 16 (base), 20 (lg), 24 (xl), 32 (2xl), 40 (3xl), 48 (4xl)
- Page padding: 16 horizontal, 16–24 vertical (depends on screen)
- Card padding: 16 standard, 24 for hero cards
- Vertical rhythm: 8 between same-element items, 16 between distinct sections, 24+ between major sections

### Thumb Zone Rule

Every screen designed for one-handed portrait use:

- **Top third** (status bar to ~30%): information only, no interactive elements except header back button and the profile avatar shortcut
- **Middle third** (~30%–~70%): primary content (map, photo, list)
- **Bottom third** (~70% to tab bar): all interactive controls — CTAs, sliders, voting buttons, shutter, segmented controls

The tab bar is always at the very bottom and is always 56px tall.

### Safe Areas

- Use `react-native-safe-area-context` `SafeAreaView` on every screen
- Don't draw content under the iOS notch or under the Android navigation bar
- Camera screen and map screen are full-bleed but their controls respect safe-area insets

### Border Radius Scale

- Subtle (4px): inline tags, micro chips
- Standard (8px): buttons, inputs, segmented controls
- Card (12px): all cards, dropdowns
- Featured (16px): balance card, hero photo containers
- Pill (9999px): chips, World ID badge, status pills
- Circle (50%): avatars, FAB, map pins, vote toggle dots

---

## 6. Depth & Elevation

On a light background, depth comes from **shadow + border**, not luminance steps.

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat | No shadow, no border | Page background |
| Surface (Level 1) | 1px solid `#E5E7EB`, no shadow | Most cards, list items |
| Floating (Level 2) | `elevation: 4` Android / `shadowOpacity: 0.05, shadowRadius: 8` iOS | Balance card, modal overlays |
| FAB (Level 3) | `elevation: 6` / `shadowOpacity: 0.15, shadowRadius: 12` | Map FAB camera button |
| Sheet (Level 4) | `elevation: 8` / `shadowOpacity: 0.1, shadowRadius: 16` | Bottom sheet, full-screen modals |

**Never use multi-layer shadow stacks** — RN renders these inconsistently across iOS/Android. Pick one shadow per element.

---

## 7. Do's and Don'ts

### Do

- Use Inter Variable with `"cv01", "ss03"` on every text element — these features are fundamental to the system's identity
- Use weight 510 as the default UI weight — it's the Linear signature
- Build on `#FFFFFF` page backgrounds with `#F5F5F5` cards and `#E5E7EB` 1px borders
- Reserve `#25671E` for primary CTAs and brand emphasis only — don't decorate with it
- Use JetBrains Mono **only** for SOL amounts and AI Vision transcripts — these are the two surfaces that benefit from the precision feel
- Use `react-native-reanimated` for every animation longer than 200ms — UI thread, never janks
- Apply `hitSlop` generously — touch targets should always be ≥44px even when visually smaller
- Use `expo-image` (not `<Image>`) everywhere a Cloudinary URL is consumed — disk caching, fade-in, memory-aware
- Test every screen in bright outdoor lighting — that's the actual use environment

### Don't

- Don't use pure black (`#000000`) for text — `#111111` softens it on white
- Don't use weight 700 — the system caps at 590
- Don't use positive letter-spacing on display sizes — Inter at large sizes always runs negative
- Don't add decorative gradients or color washes — the palette is intentionally restrained
- Don't use solid colored backgrounds for buttons other than primary green — the system is monochromatic + green
- Don't use `<TouchableOpacity>` for new code — prefer `<Pressable>` with explicit `hitSlop` and `style={({pressed}) => ...}`
- Don't render heavy gradients or shadow stacks — keep elevation simple
- Don't apply multi-layer shadows — they're inconsistent across platforms
- Don't introduce a dark mode toggle — the system is light-mode-first by design; the only dark surface is the map tile layer

---

## 8. Platform Differences (iOS vs Android)

### iOS

- Use `SafeAreaView` for top + bottom insets
- `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius` for elevation
- Haptics: full Taptic Engine via `expo-haptics` — use `impactAsync` and `notificationAsync`
- Maps: Google Maps via `react-native-maps` (`PROVIDER_GOOGLE`) — keeps parity with Android

### Android

- `elevation` for shadows
- Bottom system bar may overlap if `windowSoftInputMode` not configured — use `useSafeAreaInsets`
- Haptics: Vibrator-based fallback — `expo-haptics` handles this transparently, but expect lighter feedback than iOS
- Status bar: `<StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />` on light screens

### Both

- Test on a physical device every phase. Simulators lie about gestures, haptics, GPS, and maps.

---

## 9. Agent Prompt Guide (for Claude Code generations)

When asking Claude to generate a new screen or component, include the relevant tokens. Examples:

- *"Create a Submit Report button on a white background. Background `#25671E`, text `#FFFFFF` Inter 510 16px, height 56, paddingHorizontal 24, borderRadius 8. Pressed state: opacity 0.85."*
- *"Build the AI Vision Transcript card. White background, 1px solid `#E5E7EB` border, borderRadius 12, padding 16. Inside: collapsible chevron header (Inter 510 16px `#111111`). Body uses JetBrains Mono Regular 14px line-height 1.55. Each Q/A block has 12px vertical spacing between them."*
- *"Design a filter chip row for the Gallery tab. Horizontal scroll. Each chip is a pill (radius 9999, padding 6×14). Inactive chip: white bg, `#6B7280` text, 1px `#E5E7EB` border. Active chip: `#E9F5EB` bg, `#25671E` text, 1px `#519A66` border. Inter 510 13px."*
- *"Build a comparison slider component using `react-native-gesture-handler` PanGestureHandler over a clipped overlay, animated via `react-native-reanimated`. Both before and after images come from `buildComparisonImage(public_id)` Cloudinary URLs (c_fill,w_800,h_600,g_auto). Drag handle is a 56px white circle with a 2px `#25671E` border."*

The transformations skill from `cloudinary-devs/skills` should be used to generate Cloudinary URLs from natural language. Always pass the URL string back through `lib/cloudinary.ts` so the cloud name and base URL stay centralized.

---

## 10. Quick Reference — Token Cheat Sheet

```
COLORS
  --green-dark:    #25671E   buttons (primary), active tab icons, accent bars
  --green-mid:     #519A66   progress fills, secondary buttons, icons, verified pins
  --green-tint:    #E9F5EB   selected chip bg, World ID badge bg, subtle accents
  --green-hover:   #1F5418   primary button pressed

  --bg:            #FFFFFF   all screen backgrounds
  --surface:       #F5F5F5   cards, bottom sheet, task rows
  --border:        #E5E7EB   separators, card borders
  --text-primary:  #111111   headings, labels
  --text-secondary:#6B7280   timestamps, metadata, captions

  --sol-purple:    #9945FF   SOL balance amounts (wallet only)
  --sol-green:     #14F195   transaction confirmed amounts (wallet only)
  --world-blue:    #0077B6   World ID verified badge text

  --map-red:       #FF3B30   garbage report pins (dark map only)
  --map-amber:     #F4A261   cleanup claimed pins
  --error:         #FF3B30   form errors

TYPOGRAPHY  (Inter Variable everywhere — fontFeatureSettings: "cv01", "ss03")
  Display:      48px / 510 / -1.056
  Page Title:   24px / 510 / -0.288
  Heading:      20px / 590 / -0.24
  Sub-heading:  18px / 510 / -0.18
  Body Emph:    16px / 510 / 0
  Body:         16px / 400 / 0
  Body Small:   14px / 400 / -0.13
  Caption:      13px / 510 / -0.13
  Tab Label:    11px / 510 / 0
  SOL Large:    32px JetBrains Mono Bold
  Vision:       14px JetBrains Mono Regular

SPACING     8px base — 4, 8, 12, 16, 20, 24, 32, 40, 48

COMPONENTS
  Primary button:  #25671E bg · white text · Inter 510 16px · radius 8 · height 56
  Card:            #F5F5F5 bg · 1px #E5E7EB · radius 12 · padding 16
  Bottom sheet:    #FFFFFF bg · radius 16 top · 1px #E5E7EB top border
  Input:           #FFFFFF bg · 1px #E5E7EB (#519A66 focus) · radius 8 · height 48
  World ID pill:   #E9F5EB bg · #25671E text · radius 9999 · padding 4×12
  Filter chip:     pill · 1px border · 13px Inter 510
  Tab bar:         56 height · 1px #E5E7EB top · #25671E active / #6B7280 inactive
  Map FAB:         56 circle · #25671E · elevation 6
```

---

*This design system is mobile-first and React Native-native. There is no responsive breakpoint section because there is no web companion — every UI surface in Waste2Wealth is a phone screen in portrait orientation.*
