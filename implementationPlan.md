# Waste2Wealth — Implementation Plan

**Team:** 2 devs · 4 Claude Code accounts
**Stack:** React Native (Expo) + Python FastAPI + Supabase + Solana — **mobile-only, no web companion**
**Tracks:** Sustain the Spark · World U · Cloudinary · Solana · Arista · Figma Make · Gemma 4
**Timeline:** 36 hours

> **How to use this doc:** Work top to bottom. Check off each box as you complete it. Each phase ends with a milestone — don't start the next phase until the milestone passes on a physical device.

> **Why mobile-only:** Cloudinary said the things they really want to see are *social good apps that work with images at scale* and the **Skills Pack** as the alternative starter to the web AI Starter. We chose React Native because (1) citizen capture happens at the curb with a phone, not a laptop, (2) every Cloudinary capability we use (AI Vision, generative transforms, smart cropping, background removal, auto-tagging) is exposed to mobile via the same delivery URLs, and (3) a single polished mobile app demos better than a half-built mobile app + half-built dashboard.

---

## Design System Quick Reference

> Full system in `DESIGN.md`. This is the token cheat sheet.

```
COLORS
  --green-dark:    #25671E   buttons (primary), active tab icons, accent bars
  --green-mid:     #519A66   progress fills, secondary buttons, icons, verified pins
  --green-tint:    #E9F5EB   selected chip bg, subtle surface accent

  --bg:            #FFFFFF   all screen backgrounds
  --surface:       #F5F5F5   cards, bottom sheet, task rows
  --border:        #E5E7EB   separators, card borders
  --text-primary:  #111111   headings, labels
  --text-secondary:#6B7280   timestamps, metadata, captions

  --sol-purple:    #9945FF   SOL balance amounts
  --sol-green:     #14F195   transaction confirmed amounts
  --world-blue:    #0077B6   World ID verified badge
  --map-red:       #FF3B30   garbage report pins (dark map only)
  --map-amber:     #F4A261   cleanup claimed pins

TYPOGRAPHY  (Inter Variable everywhere — font-feature-settings: "cv01", "ss03")
  Display:    510 weight, -1.056px letter-spacing
  Heading:    510 weight, -0.288px letter-spacing
  Body:       400 weight, normal spacing
  UI labels:  510 weight — the Linear signature weight
  SOL amounts: JetBrains Mono Bold

SPACING     8px base grid: 4, 8, 12, 16, 20, 24, 32, 40, 48

COMPONENTS
  Primary button:  #25671E bg · white text · borderRadius 8 · height 56
  Card:            #F5F5F5 bg · 1px solid #E5E7EB · borderRadius 12
  Bottom sheet:    #FFFFFF bg · elevation 8
  Input:           #FFFFFF bg · 1px solid #E5E7EB · borderRadius 8 · height 48
  Badge:           #E9F5EB bg · #25671E text · borderRadius 9999
```

---

## Pre-Build Decisions (already made — do not relitigate)

| Decision                         | Resolution                                                                                                                                                                                                                                                                                                |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary authentication           | **Google Auth only** (Supabase OAuth). World ID is **not** the login gate — it is the voting gate. Users sign in with Google on first open; before their first vote they are prompted to verify with World ID. Keeps onboarding frictionless while retaining Sybil resistance where it matters most. |
| World ID role                    | **Voting eligibility only.** Action: `waste2wealth-vote-verify`, max 1 per user. When user opens Verify tab, app checks `world_id_nullifier IS NOT NULL` on their row. If null → IDKit prompt before swipe cards appear. Does not affect report or cleanup flows. |
| ONNX on-device AI detection      | **CUT.** AI-generated detection is handled cloud-side by Cloudinary AI Vision Moderation (`Does this image appear AI-generated?` prompt). The mobile app shows a static "Verifying…" state and updates once the cloud verdict comes back. Removes ~8 hours of debugging and keeps us on Expo Go. |
| World U / World Chain compliance | **Off-chain argument.** World ID is a non-mini-app IDKit integration with backend nullifier verification. The Solana reward system is a separate, parallel system. We satisfy the "non-mini app using IDKit" path. Keeps Solana prize eligibility.                                                  |
| Web companion dashboard          | **CUT.** The mobile app's Gallery tab is the public showcase; the Profile screen aggregates city stats. One polished mobile artifact beats two half-built ones.                                                                                                                                     |
| Push notifications geofence      | Filter by user `last_location` (column added to `users` table); fall back to broadcasting to all users if `last_location` is null.                                                                                                                                                                  |
| GPS proximity for cleanup claim  | **200m** for the demo (indoor venue GPS drift). Code comment notes production tightens this to 50m.                                                                                                                                                                                                 |
| Cloudinary upload import path    | Public API only:`import { upload } from 'cloudinary-react-native'`. Never deep-import from `lib/typescript/`.                                                                                                                                                                                         |
| `react-native-dotenv`          | **Removed.** Expo SDK 51+ handles `EXPO_PUBLIC_*` natively. Babel plugin would conflict.                                                                                                                                                                                                          |

---

## Phase 0 — Pre-Hackathon Setup

> Do all of this **before the event starts**. These are account creations and downloads — not code. Missing any one of these kills hours at the hackathon.

### 0.1 Dev Environment

- [x] Node.js ≥ 20 installed: v23.3.0 ✓
- [x] Python 3.11 installed: Python 3.14.3 ✓
- [x] Expo CLI installed ✓
- [ ] EAS CLI: `npm install -g eas-cli` (only if Expo Go can't run a module)
- [ ] EAS login: `eas login`
- [ ] Expo Go app installed on both Android and iPhone
- [x] Project scaffolded with `expo-template-blank-typescript` ✓

### 0.2 Expo + React Native Project

- [ ] Scaffold: `npx create-expo-app@latest waste2wealth --template expo-template-blank-typescript`
- [ ] Test it boots: `npx expo start` → scan QR with Expo Go on physical device
- [ ] Confirm it renders on both Android and iPhone

### 0.3 Cloudinary Skills Pack (Dev-Time Workflow)

This is one of the two artifacts the Cloudinary Challenge accepts as the starter (alongside the React AI Starter Kit). It installs three Claude Code skills that turn natural-language requirements into correct Cloudinary code during development.

- [x] In project root: `npx skills add cloudinary-devs/skills` ✓
- [x] Confirm three skills installed: ✓
  - `cloudinary-docs` — answers Cloudinary questions from the live docs (universal — applies to RN)
  - `cloudinary-react` — opinionated React SDK patterns (web-leaning; we cherry-pick concepts only)
  - `cloudinary-transformations` — natural language → valid URL transform strings (universal — drives every transform we build in `lib/cloudinary.ts`)
- [ ] Test the transformations skill: ask Claude "build a thumbnail URL: 400x300, smart crop, auto format, auto quality" → confirm it returns `c_thumb,g_auto,w_400,h_300,f_auto,q_auto`

> **Note on the React skill:** It targets the web React SDK (`<CldImage>` and friends). React Native consumes Cloudinary via plain delivery URLs fed to `expo-image`, so we use the React skill for *patterns* (folder structure, error handling) and the transformations skill for the actual URL strings. The docs skill is the workhorse.

### 0.4 World ID

**Portal:** https://developer.worldcoin.org

> **Role change:** World ID is now the **voting gate only**, not the login. Google Auth is the primary login (Phase 1.7). World ID verification happens the first time a user opens the Verify tab.

- [x] Create account → New App ✓
- [x] App name: `Waste2Wealth` ✓
- [x] App mode: **Staging** (for hackathon) ✓
- [x] World ID 4.0: **Managed** mode ✓
- [x] Signer key generated → saved to `backend/.env` as `WORLD_ID_SIGNER_KEY` ✓
- [x] `app_id` = `app_833fae1012eb8ea7383ade5c7fa75d00` → saved to `backend/.env` ✓
- [x] Action `waste2wealth-vote-verify` created · max verifications per user: `1` ✓
- [x] Install World App on at least one test phone (used for the voting demo) ✓
- [ ] Verify staging works: in World App → Developer → you should see the test credential
- [ ] **Critical pre-build verification:** install `@worldcoin/idkit-core`, inspect `index.d.ts` for current bridge-session helper names, run a full proof round-trip on a physical device against the staging `app_id`. This drives the voting gate in Phase 3.3. Do **not** build the verify screen until this round-trip succeeds.

### 0.5 Supabase

**Portal:** https://supabase.com

- [x] New project `waste2wealth` created ✓
- [x] DATABASE_URL, SUPABASE_URL, anon key, service_role key → saved to `.env` files ✓
- [x] PostGIS enabled — version 3.3 confirmed ✓
- [x] JWT Secret → saved to `backend/.env` as `SUPABASE_JWT_SECRET` ✓
- [x] Mapbox token → saved to `.env.mobile` as `EXPO_PUBLIC_MAPBOX_TOKEN` ✓
- [x] Schema migrated — all tables, indexes, RLS policies, Realtime publication created ✓

### 0.6 Cloudinary

**Portal:** https://cloudinary.com

- [x] Create account (free tier) ✓
- [x] Dashboard → copy **Cloud Name** `duigptg4j`, **API Key**, **API Secret** → saved to `backend/.env` ✓
- [x] Settings → Add-ons → **AI Vision** enabled — 100,000 free calls ✓
- [x] Settings → Add-ons → **Google Auto Tagging** enabled — 50 free calls ✓
- ~~Settings → Add-ons → Cloudinary AI Background Removal~~ **NOT AVAILABLE** on free plan → Forensic mode CUT (was already 3rd on cut list)
- ~~Settings → Add-ons → Generative AI~~ **NOT AVAILABLE** on free plan → Envision Clean CUT (was already 4th on cut list)
- [ ] Test a manual upload in the media library to confirm add-ons are active
- [x] Upload preset `waste2wealth_unsigned` created — Unsigned, folder: waste2wealth ✓

### 0.7 Firebase (FCM Push Notifications)

**Portal:** https://console.firebase.google.com

- [x] Project `waste2wealth-push` created (project_id: waste2wealth-push, number: 956918408429) ✓
- [x] Android app added (package: `com.waste2wealth.app`) → `google-services.json` saved ✓
- [x] iOS app added (bundle: `com.waste2wealth.app`) → `GoogleService-Info.plist` saved ✓
- [x] `firebase-adminsdk.json` saved to `backend/` ✓
- [x] Move `google-services.json` + `GoogleService-Info.plist` to Expo project root when scaffolded ✓

### 0.8 Solana Devnet

- [x] Solana CLI 3.1.13 installed via Homebrew ✓
- [x] Set to devnet ✓
- [x] Escrow keypair generated → `backend/escrow-keypair.json` ✓
- [x] `ESCROW_PUBKEY=BxUcJjusE4Uyjm63ts5QaD6WAdubqRd7duUmSLcfsMPg` saved to `backend/.env` ✓
- [x] Airdrop complete — 10 SOL in escrow wallet ✓
- [ ] Top up just before demo: same command

### 0.9 Google AI (Gemma 4 / Gemini)

**Portal:** https://aistudio.google.com

- [x] 6 API keys created, all use `gemini-2.5-flash`, saved to `backend/.env` as `GEMINI_API_KEY_1` through `_6` ✓
- [x] Backend service rotates keys via `itertools.cycle` to avoid per-key rate limits ✓
- [x] Test one key: responded "Hello!" ✓
  ```bash
  curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$GEMINI_API_KEY" \
    -H 'Content-Type: application/json' \
    -d '{"contents":[{"parts":[{"text":"Say hello"}]}]}'
  ```

### 0.10 Mapbox (replaces Google Maps)

**Portal:** https://account.mapbox.com

> Google Maps API requires billing. Mapbox free tier = 50,000 map loads/month — more than enough.

- [x] Create account (free, no credit card) ✓
- [x] Account → Tokens → copy the **Default public token** (starts with `pk.`) ✓
- [x] Save to `.env.mobile` as `EXPO_PUBLIC_MAPBOX_TOKEN` ✓

### 0.11 Fonts

- [x] Download Inter Variable: https://rsms.me/inter/ → place `InterVariable.ttf` in `assets/fonts/` ✓
- [x] Download JetBrains Mono Bold: https://www.jetbrains.com/lp/mono/ → place `JetBrainsMono-Bold.ttf` in `assets/fonts/` ✓

### 0.12 .env Template

Create `waste2wealth/.env`:

```bash
# Supabase (mobile-safe)
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Google Auth (via Supabase OAuth)
EXPO_PUBLIC_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com

# World ID (voting gate only)
EXPO_PUBLIC_WORLD_APP_ID=app_833fae1012eb8ea7383ade5c7fa75d00
EXPO_PUBLIC_WORLD_ACTION=waste2wealth-vote-verify

# Cloudinary
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=waste2wealth_unsigned

# Mapbox (replaces Google Maps)
EXPO_PUBLIC_MAPBOX_TOKEN=pk....

# Backend URL (localhost for dev, Railway/Render URL for demo)
EXPO_PUBLIC_API_URL=http://localhost:8000
```

Create `backend/.env`:

```bash
DATABASE_URL=postgresql://postgres:pass@db.xxxx.supabase.co:5432/postgres
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_JWT_SECRET=xxxx
WORLD_APP_ID=app_833fae1012eb8ea7383ade5c7fa75d00
WORLD_ACTION=waste2wealth-vote-verify
WORLD_ID_SIGNER_KEY=0xb23c16aa0702c25d940bc98400aca49c6e1a8093b1c1ecda5cff6f1cd3f978a7
CLOUDINARY_CLOUD_NAME=duigptg4j
CLOUDINARY_API_KEY=xxxx
CLOUDINARY_API_SECRET=xxxx
GEMINI_API_KEY_1=AIza...
GEMINI_API_KEY_2=AIza...
GEMINI_API_KEY_3=AIza...
GEMINI_API_KEY_4=AIza...
GEMINI_API_KEY_5=AIza...
GEMINI_API_KEY_6=AIza...
ESCROW_KEYPAIR_PATH=./escrow-keypair.json
ESCROW_PUBKEY=xxxx
FIREBASE_CREDENTIALS_PATH=./firebase-adminsdk.json
```

---

## Phase 1 — Foundation: Auth + Navigation + Map

**Hours 0–6 · Goal:** Physical device shows Google sign-in, completes auth, and renders a live dark-mode map.

### 1.1 Install Dependencies ✓

```bash
npx expo install \
  expo-router \
  expo-camera \
  expo-location \
  expo-notifications \
  expo-haptics \
  expo-web-browser \
  expo-secure-store \
  expo-image \
  expo-font \
  expo-linking \
  expo-image-manipulator \
  @rnmapbox/maps \
  @gorhom/bottom-sheet \
  react-native-gesture-handler \
  react-native-reanimated \
  react-native-deck-swiper \
  react-native-safe-area-context \
  react-native-screens \
  @solana/web3.js \
  react-native-get-random-values \
  react-native-url-polyfill \
  buffer \
  @supabase/supabase-js \
  cloudinary-react-native

npm install \
  react-native-image-zoom-viewer
```

### 1.2 Configure `app.json` ✓

```json
{
  "expo": {
    "name": "Waste2Wealth",
    "slug": "waste2wealth",
    "scheme": "waste2wealth",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "light",
    "android": {
      "package": "com.waste2wealth.app",
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "bundleIdentifier": "com.waste2wealth.app",
      "googleServicesFile": "./GoogleService-Info.plist",
      "infoPlist": {
        "LSApplicationQueriesSchemes": ["worldcoin"]
      }
    },
    "plugins": [
      "expo-router",
      ["expo-camera", { "cameraPermission": "Allow Waste2Wealth to use your camera to photograph garbage." }],
      ["expo-location", { "locationAlwaysAndWhenInUsePermission": "Allow Waste2Wealth to use your location to verify cleanup positions." }],
      ["expo-notifications", { "sounds": [] }]
    ]
  }
}
```

### 1.3 Configure `babel.config.js` ✓

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

> Do **not** install `react-native-dotenv`. Expo handles `EXPO_PUBLIC_*` env vars natively — adding the babel plugin causes module resolution conflicts.

### 1.4 Configure `index.js` (Solana Polyfills) ✓

```js
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
global.Buffer = require('buffer').Buffer;
import 'expo-router/entry';
```

### 1.5 Design Token Files ✓

`constants/colors.ts`:

```ts
export const Colors = {
  greenDark:     '#25671E',
  greenMid:      '#519A66',
  greenTint:     '#E9F5EB',
  bg:            '#FFFFFF',
  surface:       '#F5F5F5',
  border:        '#E5E7EB',
  textPrimary:   '#111111',
  textSecondary: '#6B7280',
  solPurple:     '#9945FF',
  solGreen:      '#14F195',
  worldBlue:     '#0077B6',
  mapRed:        '#FF3B30',
  mapAmber:      '#F4A261',
  error:         '#FF3B30',
} as const;
```

`constants/spacing.ts`:

```ts
export const S = {
  xs: 4, sm: 8, md: 12, base: 16, lg: 20,
  xl: 24, '2xl': 32, '3xl': 40, '4xl': 48,
} as const;
```

`constants/typography.ts`:

```ts
import { useFonts } from 'expo-font';
export const useAppFonts = () =>
  useFonts({
    InterVariable: require('../assets/fonts/InterVariable.ttf'),
    'JetBrainsMono-Bold': require('../assets/fonts/JetBrainsMono-Bold.ttf'),
  });

export const interStyle = (weight: 400 | 510 | 590) => ({
  fontFamily: 'InterVariable',
  fontVariant: [{ 'font-feature-settings': '"cv01", "ss03"' } as any],
  fontWeight: String(weight) as any,
});
```

### 1.6 Expo Router Layout ✓

```
app/
├── _layout.tsx          ← root layout, font loading, gesture handler root
├── index.tsx            ← redirect → onboarding or (tabs)
├── onboarding.tsx       ← World ID flow
├── profile.tsx          ← stack screen accessed via map header avatar
├── cleanup/[id].tsx     ← Cleanup Detail (comparison slider + AI Vision transcript)
├── envision/[reportId].tsx ← Envision Clean (generative AI)
└── (tabs)/
    ├── _layout.tsx      ← bottom tab bar definition
    ├── index.tsx        ← Map screen (home)
    ├── gallery.tsx      ← Public cleanup gallery (Cloudinary showcase)
    ├── report.tsx       ← Camera screen
    ├── verify.tsx       ← Swipe vote screen
    └── wallet.tsx       ← SOL balance screen
components/
lib/
constants/
```

`app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';
import { useAppFonts } from '../constants/typography';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  const [loaded] = useAppFonts();
  if (!loaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

`app/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from 'expo-router';
import { useState, useEffect } from 'react';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';

export default function TabLayout() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const refresh = async () => {
      const { count } = await supabase
        .from('cleanups')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_verification');
      setPendingCount(count ?? 0);
    };
    refresh();
    const channel = supabase
      .channel('verify-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cleanups' }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: Colors.greenDark,
      tabBarInactiveTintColor: Colors.textSecondary,
      tabBarStyle: {
        backgroundColor: Colors.bg,
        borderTopColor: Colors.border,
        borderTopWidth: 1,
        height: 56,
      },
      tabBarLabelStyle: { fontFamily: 'InterVariable', fontSize: 11, fontWeight: '510' },
    }}>
      <Tabs.Screen name="index"   options={{ title: 'Map'    }} />
      <Tabs.Screen name="gallery" options={{ title: 'Gallery' }} />
      <Tabs.Screen name="report"  options={{ title: 'Report'  }} />
      <Tabs.Screen name="verify"  options={{ title: 'Verify',
        tabBarBadge: pendingCount || undefined }} />
      <Tabs.Screen name="wallet"  options={{ title: 'Wallet'  }} />
    </Tabs>
  );
}
```

### 1.7 Google Auth Onboarding (primary login) ✓

`app/onboarding.tsx`:

```tsx
// Layout:
//   - Centered vertical stack
//   - Waste2Wealth wordmark (Inter 510, 32px, #25671E)
//   - Tagline "Clean cities. Earn crypto." (Inter 400, 16px, #6B7280)
//   - Green leaf/coin illustration
//   - Primary CTA: "Continue with Google" — bg #25671E, white text, 56px,
//     full-width, 8px radius, Google logo on left
//   - Secondary text: "Report garbage. Clean up. Earn SOL."
//
// On CTA tap:
//   1. supabase.auth.signInWithOAuth({ provider: 'google',
//        options: { redirectTo: 'waste2wealth://auth' } })
//   2. Opens system browser via expo-web-browser (Supabase handles this)
//   3. On return: supabase.auth.getSession() → { session }
//   4. POST session.access_token to backend /users/sync → backend upserts
//      user row, returns { user_id, is_new }
//   5. If is_new: generate Solana keypair on-device, store secret in
//      expo-secure-store, POST wallet pubkey to backend /users/wallet
//   6. router.replace('/(tabs)')
//
// On auth failure: surface a toast with the error and let them retry.
```

`lib/auth.ts`:

```ts
import { supabase } from './supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle() {
  const redirectTo = Linking.createURL('/auth');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) throw error ?? new Error('No auth URL');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') throw new Error('Auth cancelled');

  const params = new URL(result.url);
  const accessToken  = params.searchParams.get('access_token');
  const refreshToken = params.searchParams.get('refresh_token');
  if (!accessToken) throw new Error('No access token in callback');

  await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken ?? '' });
  return supabase.auth.getSession();
}

export async function signOut() {
  await supabase.auth.signOut();
}
```

`lib/worldid.ts` — **World ID is now the voting gate, not the login.** This module is only called from the Verify screen (Phase 3.3):

```ts
import * as Linking from 'expo-linking';
// Confirm helper names against @worldcoin/idkit-core index.d.ts at install time
// (see Phase 0.4 pre-build verification step).
import { internal as IDKitInternal } from '@worldcoin/idkit-core';

const APP_ID = process.env.EXPO_PUBLIC_WORLD_APP_ID! as `app_${string}`;
const ACTION = process.env.EXPO_PUBLIC_WORLD_ACTION!; // waste2wealth-vote-verify

export type WorldIDProof = {
  proof: string;
  merkle_root: string;
  nullifier_hash: string;
  verification_level: 'orb' | 'device';
};

export async function verifyWithWorldID(): Promise<WorldIDProof> {
  // Pseudo-code — concrete API names confirmed in Phase 0 device test:
  //
  //   const session = await IDKitInternal.createBridgeSession({
  //     app_id: APP_ID, action: ACTION, verification_level: 'orb',
  //   });
  //   await Linking.openURL(session.world_app_url);
  //   const proof = await IDKitInternal.pollProof(session.request_id);
  //   return proof;
  //
  // Fallback if bridge helper unavailable:
  //   (a) worldcoin://verify?... custom-scheme deep link via Linking
  //   (b) QR code in-app via react-native-qrcode-svg
  throw new Error('Implement after Phase 0 device verification round-trip');
}
```

### 1.8 Backend Auth (Google + World ID voting endpoint) ✓

`backend/routes/users.py`:

```python
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Literal, Optional
import httpx, os
from .auth import create_jwt, get_current_user, verify_supabase_token
from ..db import db

router = APIRouter()

# ── Google Auth sync ──────────────────────────────────────────────────────────
# Called once after Google OAuth completes on the device. Supabase already
# created the auth.users row; we upsert our own users table with defaults.

@router.post("/sync")
async def sync_user(user=Depends(verify_supabase_token)):
    """
    verify_supabase_token validates the Supabase JWT from the Authorization
    header and returns the decoded payload (sub = supabase user UUID, email).
    """
    row = await db.fetchrow("SELECT id FROM users WHERE id = $1", user["sub"])
    is_new = row is None
    if is_new:
        await db.execute("""
            INSERT INTO users (id, email, reputation, sol_earned)
            VALUES ($1, $2, 100, 0)
            ON CONFLICT (id) DO NOTHING
        """, user["sub"], user.get("email"))
    return {"user_id": user["sub"], "is_new": is_new}

# ── World ID voting gate ──────────────────────────────────────────────────────
# Called the first time a user opens the Verify tab and taps "Verify to vote".
# Attaches their World ID nullifier to their existing user row.

class WorldIDProof(BaseModel):
    proof: str
    merkle_root: str
    nullifier_hash: str
    verification_level: Literal['orb', 'device'] = 'orb'

@router.post("/verify-world-id")
async def attach_world_id(payload: WorldIDProof, user=Depends(get_current_user)):
    # Check nullifier isn't already claimed by a different account (Sybil check)
    existing = await db.fetchrow(
        "SELECT id FROM users WHERE world_id_nullifier = $1", payload.nullifier_hash
    )
    if existing and str(existing["id"]) != user["id"]:
        raise HTTPException(409, "This World ID is already linked to another account")

    app_id = os.environ["WORLD_APP_ID"]
    action  = os.environ["WORLD_ACTION"]   # waste2wealth-vote-verify
    url = f"https://developer.worldcoin.org/api/v1/verify/{app_id}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post(url, json={
            "nullifier_hash":     payload.nullifier_hash,
            "merkle_root":        payload.merkle_root,
            "proof":              payload.proof,
            "verification_level": payload.verification_level,
            "action":             action,
            "signal":             "",
        })
    if r.status_code != 200:
        raise HTTPException(400, f"World ID verification failed: {r.text}")

    await db.execute(
        "UPDATE users SET world_id_nullifier = $1 WHERE id = $2",
        payload.nullifier_hash, user["id"]
    )
    return {"ok": True, "nullifier_hash": payload.nullifier_hash}

# ── Supporting endpoints ──────────────────────────────────────────────────────

class WalletPayload(BaseModel):
    wallet_address: str

@router.post("/wallet")
async def save_wallet(p: WalletPayload, user=Depends(get_current_user)):
    await db.execute("UPDATE users SET wallet_address = $1 WHERE id = $2",
                     p.wallet_address, user["id"])
    return {"ok": True}

class PushTokenPayload(BaseModel):
    token: str

@router.post("/push-token")
async def save_push_token(p: PushTokenPayload, user=Depends(get_current_user)):
    await db.execute("UPDATE users SET push_token = $1 WHERE id = $2",
                     p.token, user["id"])
    return {"ok": True}
```

`backend/routes/auth.py` — add `verify_supabase_token` alongside the existing JWT helpers:

```python
import os, jwt as pyjwt
from fastapi import HTTPException, Header
from supabase import create_client

_supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

async def verify_supabase_token(authorization: str = Header(...)):
    """Validates a Supabase access token; returns decoded payload."""
    try:
        token = authorization.replace("Bearer ", "")
        # Supabase JWT secret is the project JWT secret from Settings → API
        payload = pyjwt.decode(
            token,
            os.environ["SUPABASE_JWT_SECRET"],
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except Exception as e:
        raise HTTPException(401, f"Invalid token: {e}")
```

> Add `SUPABASE_JWT_SECRET` to `backend/.env` — copy from Supabase Dashboard → Settings → API → JWT Secret.

### 1.9 Supabase Database ✓

Run in Supabase SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users
-- id = Supabase auth.users UUID (passed in from /users/sync after Google login)
CREATE TABLE users (
  id                  UUID PRIMARY KEY,           -- Supabase auth UUID, set at sync
  email               TEXT,
  world_id_nullifier  TEXT UNIQUE,                -- NULL until user verifies to vote
  wallet_address      TEXT,
  reputation          INTEGER DEFAULT 100,
  sol_earned          NUMERIC(10,4) DEFAULT 0,
  push_token          TEXT,
  last_location       GEOGRAPHY(POINT, 4326),
  created_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON users USING GIST(last_location);

-- Reports
CREATE TABLE reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id),
  location          GEOGRAPHY(POINT, 4326) NOT NULL,
  photo_url         TEXT NOT NULL,
  photo_public_id   TEXT NOT NULL,
  severity          TEXT CHECK (severity IN ('Minor','Moderate','Major')),
  description       TEXT,
  cloudinary_tags   TEXT[] DEFAULT '{}',
  vision_transcript JSONB,
  status            TEXT DEFAULT 'open' CHECK (
    status IN ('open','claimed','cleaning','pending_verification','verified','rejected','flagged')
  ),
  created_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON reports USING GIST(location);
CREATE INDEX ON reports (status);

-- Cleanups
CREATE TABLE cleanups (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id         UUID REFERENCES reports(id),
  cleaner_id        UUID REFERENCES users(id),
  before_url        TEXT,
  before_public_id  TEXT,
  after_url         TEXT,
  after_public_id   TEXT,
  vision_transcript JSONB,
  status            TEXT DEFAULT 'claimed' CHECK (
    status IN ('claimed','submitted','pending_verification','confirmed','rejected')
  ),
  claimed_at        TIMESTAMPTZ DEFAULT now(),
  submitted_at      TIMESTAMPTZ
);
CREATE INDEX ON cleanups (status);

-- Votes
CREATE TABLE votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cleanup_id  UUID REFERENCES cleanups(id),
  voter_id    UUID REFERENCES users(id),
  vote        BOOLEAN NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cleanup_id, voter_id)
);

-- Transactions
CREATE TABLE transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  amount_sol    NUMERIC(10,4) NOT NULL,
  type          TEXT CHECK (type IN ('reporter','cleaner','verifier')),
  tx_signature  TEXT,
  cleanup_id    UUID REFERENCES cleanups(id),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security: public read, writes via service-role from FastAPI
ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanups     ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read reports"      ON reports      FOR SELECT USING (true);
CREATE POLICY "public read cleanups"     ON cleanups     FOR SELECT USING (true);
CREATE POLICY "public read votes"        ON votes        FOR SELECT USING (true);
CREATE POLICY "public read transactions" ON transactions FOR SELECT USING (true);
-- users table: only the user can read their own row
CREATE POLICY "users read self"          ON users        FOR SELECT USING (auth.uid()::text = id::text);
```

> **Critical:** without RLS policies, Supabase Realtime delivers no events. The map and gallery will look broken. Run the policy block above.

Enable Realtime: Supabase Dashboard → Database → Replication → enable for `reports` and `cleanups`.

`lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
);
```

### 1.10 Map Screen + Dark Map Style (Mapbox) ✓

> No custom JSON needed — Mapbox ships a built-in dark style (`mapbox://styles/mapbox/dark-v11`). No API billing, no Google Cloud project.

`app/_layout.tsx` — add Mapbox token init before the Stack render:

```tsx
import MapboxGL from '@rnmapbox/maps';
MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN!);
```

`app/(tabs)/index.tsx`:

```tsx
import MapboxGL from '@rnmapbox/maps';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import { GarbagePin } from '../../components/GarbagePin';
import { TaskCard } from '../../components/TaskCard';
import { ProfileAvatarHeader } from '../../components/ProfileAvatarHeader';
import { api } from '../../lib/api';

const SNAP_POINTS = ['15%', '50%', '90%'];

// LA Hacks venue — update to actual venue coords before demo
const INITIAL_COORDS: [number, number] = [-118.4452, 34.0708]; // [lng, lat] for Mapbox

export default function MapScreen() {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from('reports')
      .select('*')
      .in('status', ['open', 'claimed', 'pending_verification'])
      .then(({ data }) => setReports(data ?? []));

    const channel = supabase
      .channel('map-reports')
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'reports' },
          (payload) => {
            setReports((prev) => {
              if (payload.eventType === 'INSERT') return [...prev, payload.new];
              if (payload.eventType === 'UPDATE')
                return prev.map((r) => (r.id === payload.new.id ? payload.new : r));
              if (payload.eventType === 'DELETE')
                return prev.filter((r) => r.id !== payload.old.id);
              return prev;
            });
          })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    let watcher: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 100 },
        (pos) => {
          api.post('/users/location', {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }).catch(() => {});
        },
      );
    })();
    return () => { watcher?.remove(); };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <MapboxGL.MapView
        style={{ flex: 1 }}
        styleURL="mapbox://styles/mapbox/dark-v11"
        logoEnabled={false}
        attributionEnabled={false}
      >
        <MapboxGL.Camera
          zoomLevel={14}
          centerCoordinate={INITIAL_COORDS}
          animationMode="none"
        />
        <MapboxGL.UserLocation visible />
        {reports.map((r) => <GarbagePin key={r.id} report={r} />)}
      </MapboxGL.MapView>

      <ProfileAvatarHeader />

      <BottomSheet snapPoints={SNAP_POINTS} index={0} backgroundStyle={{ backgroundColor: '#FFFFFF' }}>
        <BottomSheetFlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TaskCard report={item} />}
        />
      </BottomSheet>
    </View>
  );
}
```

`components/GarbagePin.tsx` — `<MapboxGL.PointAnnotation>` with status-based color (`#FF3B30`, `#F4A261`, `#519A66`, `#25671E`), white trash/checkmark icon centered, Reanimated pulse for newly-added pins. Note: Mapbox coordinates are `[longitude, latitude]` — opposite of React Native Maps.

`backend/routes/users.py` — add the location endpoint:

```python
class LocationPayload(BaseModel):
    lat: float
    lng: float

@router.post("/location")
async def update_location(p: LocationPayload, user=Depends(get_current_user)):
    await db.execute("""
        UPDATE users
        SET last_location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        WHERE id = $3
    """, p.lng, p.lat, user["id"])
    return {"ok": True}
```

### 1.11 FastAPI Skeleton ✓

> **Note:** Backend uses supabase-py over HTTPS (port 443) instead of asyncpg direct TCP — Supabase DB is IPv6-only and port 5432/6543 are blocked on most networks. `002_rpc_functions.sql` migrated to Supabase ✓. Server confirmed running (`/health` → `{"ok":true}`) ✓.

`backend/main.py`:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import users, reports, cleanups, votes, rewards
from .db import db

app = FastAPI()
app.add_middleware(CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def startup(): await db.connect()
@app.on_event("shutdown")
async def shutdown(): await db.disconnect()

app.include_router(users.router,    prefix="/users")
app.include_router(reports.router,  prefix="/reports")
app.include_router(cleanups.router, prefix="/cleanups")
app.include_router(votes.router,    prefix="/votes")
app.include_router(rewards.router,  prefix="/rewards")
```

Start backend: `cd backend && uvicorn main:app --reload --port 8000`

**MILESTONE 1:** World ID verified on physical device → map shows with dark tiles + one seeded red pin ✓

---

## Phase 2 — Camera + Cloudinary Upload + AI Vision Moderation

**Hours 6–12 · Goal:** Photo garbage → upload → Cloudinary AI Vision verifies → pin live on second phone.

### 2.1 Camera Screen

`app/(tabs)/report.tsx`:

```tsx
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { ReviewScreen } from '../../components/ReviewScreen';

export default function ReportScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [gpsReady, setGpsReady] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    let watcher: Location.LocationSubscription | null = null;
    (async () => {
      await Location.requestForegroundPermissionsAsync();
      watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          if (!gpsReady) {
            setGpsReady(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        }
      );
    })();
    return () => { watcher?.remove(); };
  }, []);

  if (!permission?.granted) {
    return <PermissionPrompt onRequest={requestPermission} />;
  }
  if (capturedUri && coords) {
    return (
      <ReviewScreen
        uri={capturedUri}
        coords={coords}
        onCancel={() => setCapturedUri(null)}
      />
    );
  }

  return (
    <CameraView style={{ flex: 1 }} facing="back" ref={cameraRef}>
      <CameraTopBar />
      <GPSStatusPill ready={gpsReady} />
      <ShutterButton
        disabled={!gpsReady}
        onPress={async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const photo = await cameraRef.current?.takePictureAsync({
            quality: 0.85, skipProcessing: true,
          });
          if (photo?.uri) setCapturedUri(photo.uri);
        }}
      />
    </CameraView>
  );
}
```

### 2.2 Cloudinary Upload (correct public API)

`lib/cloudinary.ts`:

```ts
import { Cloudinary } from '@cloudinary/url-gen';
import { upload } from 'cloudinary-react-native';

const CLOUD = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

export const cld = new Cloudinary({ cloud: { cloudName: CLOUD } });

export type UploadKind = 'reports' | 'cleanups/before' | 'cleanups/after';

export async function uploadPhoto(localUri: string, kind: UploadKind) {
  return new Promise<{ secure_url: string; public_id: string; tags: string[] }>(
    (resolve, reject) => {
      upload(cld, {
        file: localUri,
        options: {
          upload_preset: PRESET,
          folder: `waste2wealth/${kind}`,
          // Async eager keeps the upload snappy; AI Vision moderation runs
          // on the backend after the upload completes.
          eager: 'e_auto_tagging:80',
          eager_async: true,
        },
        callback: (err, response) => {
          if (err || !response) return reject(err);
          resolve({
            secure_url: response.secure_url!,
            public_id:  response.public_id!,
            tags:       response.tags ?? [],
          });
        },
      });
    }
  );
}

// URL builders — natural-language requirements run through the
// cloudinary-transformations skill during dev produced these strings.

const baseUrl = (publicId: string, transforms: string) =>
  `https://res.cloudinary.com/${CLOUD}/image/upload/${transforms}/${publicId}.jpg`;

export const buildThumb = (publicId: string) =>
  baseUrl(publicId, 'c_thumb,g_auto,w_400,h_300,f_auto,q_auto');

export const buildComparisonImage = (publicId: string) =>
  baseUrl(publicId, 'c_fill,w_800,h_600,g_auto,f_auto,q_auto');

// buildForensicImage (e_background_removal) — CUT: add-on not on free plan
// buildEnvisionURL (e_gen_remove / e_gen_background_replace) — CUT: add-on not on free plan

export const buildHeroImage = (publicId: string) =>
  baseUrl(publicId, 'c_fill,w_1200,h_900,g_auto,f_auto,q_auto:best');
```

> `buildThumb`, `buildComparisonImage`, and `buildHeroImage` were derived using the `cloudinary-transformations` skill — natural language requirements became these URL strings. Document this in the Devpost write-up.

### 2.3 Submit Screen + Optimistic Vision Pipeline

`components/ReviewScreen.tsx`:

```tsx
// Layout (vertical stack):
//   - Captured photo preview (full width, aspect ratio preserved)
//   - "Verifying with Cloudinary AI..." pill (replaces ONNX) — shown only while
//      upload is in flight; after upload, swaps to "✅ Real photo"
//   - Severity segmented control: Minor | Moderate | Major (default Moderate)
//   - "Submit Report" button (#25671E, full-width, 56px) — enabled once upload done
//   - "Cancel" link (text-only, #6B7280) returns to camera
//
// Submit flow (optimistic):
//   1. uploadPhoto(uri, 'reports') → { secure_url, public_id, tags }
//   2. POST /reports { photo_url, photo_public_id, lat, lng, severity, tags }
//   3. Backend inserts row immediately (status='open'), returns report_id
//   4. Backend kicks off background task: Cloudinary AI Vision moderation
//   5. Mobile navigates back to map; pin appears via Realtime
//   6. If Vision flags the report later, status becomes 'flagged' and the pin
//      visually downgrades (gray overlay + warning icon) — Realtime delivers this
```

### 2.4 Cloudinary AI Vision (server-side)

`backend/services/cloudinary_vision.py`:

```python
import httpx, os
from typing import Literal

CLOUD = os.environ["CLOUDINARY_CLOUD_NAME"]
KEY = os.environ["CLOUDINARY_API_KEY"]
SECRET = os.environ["CLOUDINARY_API_SECRET"]

REPORT_PROMPTS = [
    "Is there visible garbage or litter in this image? Answer yes or no.",
    "Does this image appear to be AI-generated or computer-rendered? Answer yes or no.",
]

CLEANUP_COMPARE_PROMPT = (
    "Compared to the first image, has the visible garbage been removed in the "
    "second image? Answer yes or no."
)

async def moderate_image(public_id: str, prompts: list[str]) -> dict:
    """Calls Cloudinary AI Vision Moderation. Returns the full transcript."""
    url = f"https://api.cloudinary.com/v2/analysis/{CLOUD}/analyze/ai_vision_moderation"
    body = {
        "source":           {"uri": f"cloudinary://{public_id}"},
        "rejection_questions": prompts,
    }
    async with httpx.AsyncClient(auth=(KEY, SECRET), timeout=30.0) as client:
        r = await client.post(url, json=body)
    r.raise_for_status()
    return r.json()

async def describe_image(public_id: str, prompt: str) -> dict:
    """AI Vision General — descriptive caption used on cleanup detail screen."""
    url = f"https://api.cloudinary.com/v2/analysis/{CLOUD}/analyze/ai_vision_general"
    body = {
        "source": {"uri": f"cloudinary://{public_id}"},
        "prompts": [prompt],
    }
    async with httpx.AsyncClient(auth=(KEY, SECRET), timeout=30.0) as client:
        r = await client.post(url, json=body)
    r.raise_for_status()
    return r.json()

async def compare_before_after(before_id: str, after_id: str) -> dict:
    url = f"https://api.cloudinary.com/v2/analysis/{CLOUD}/analyze/ai_vision_moderation"
    body = {
        "source":  {"uri": f"cloudinary://{before_id}"},
        "source2": {"uri": f"cloudinary://{after_id}"},
        "rejection_questions": [CLEANUP_COMPARE_PROMPT],
    }
    async with httpx.AsyncClient(auth=(KEY, SECRET), timeout=45.0) as client:
        r = await client.post(url, json=body)
    r.raise_for_status()
    return r.json()
```

`backend/routes/reports.py`:

```python
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from ..db import db
from ..services.cloudinary_vision import moderate_image, REPORT_PROMPTS
from ..services.gemma import tag_severity
from ..services.geofence import notify_nearby_users
from .auth import get_current_user

router = APIRouter()

class ReportCreate(BaseModel):
    photo_url:        str
    photo_public_id:  str
    lat:              float
    lng:              float
    severity:         str
    tags:             list[str] = []

@router.get("/nearby")
async def nearby(lat: float, lng: float, radius_km: float = 2.0):
    return await db.fetch("""
        SELECT *,
               ST_Distance(location, ST_MakePoint($1, $2)::geography) AS distance_m
        FROM reports
        WHERE ST_DWithin(location, ST_MakePoint($1, $2)::geography, $3)
          AND status NOT IN ('verified','rejected')
        ORDER BY distance_m
    """, lng, lat, radius_km * 1000)

@router.post("/")
async def create_report(
    payload: ReportCreate,
    bg: BackgroundTasks,
    user = Depends(get_current_user),
):
    row = await db.fetchrow("""
        INSERT INTO reports (user_id, location, photo_url, photo_public_id,
                             severity, cloudinary_tags)
        VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
                $4, $5, $6, $7)
        RETURNING id
    """, user["id"], payload.lng, payload.lat, payload.photo_url,
         payload.photo_public_id, payload.severity, payload.tags)
    report_id = str(row["id"])

    # Optimistic: report row exists, push notifications + AI Vision run async.
    bg.add_task(run_vision_check_for_report, report_id, payload.photo_public_id)
    bg.add_task(tag_severity,                report_id, payload.photo_url)
    bg.add_task(notify_nearby_users,         payload.lat, payload.lng, report_id, user["id"])
    return {"report_id": report_id}

async def run_vision_check_for_report(report_id: str, public_id: str):
    try:
        result = await moderate_image(public_id, REPORT_PROMPTS)
        analysis = result.get("data", {}).get("analysis", {})
        verdict = analysis.get("rejection_questions_responses", [])
        is_garbage_visible = verdict[0]["response"].lower() == "yes" if verdict else True
        is_ai_generated    = verdict[1]["response"].lower() == "yes" if len(verdict) > 1 else False

        new_status = "flagged" if (not is_garbage_visible or is_ai_generated) else "open"
        await db.execute("""
            UPDATE reports
            SET vision_transcript = $1, status = $2
            WHERE id = $3
        """, json.dumps(result), new_status, report_id)
    except Exception as e:
        # Vision failure doesn't kill the report. Log and leave status='open'.
        print(f"Vision check failed for {report_id}: {e}")
```

### 2.5 Push Notifications

`expo-notifications` setup in `app/_layout.tsx` (after auth):

```ts
import * as Notifications from 'expo-notifications';
const token = await Notifications.getExpoPushTokenAsync({ projectId: 'YOUR_EAS_PROJECT_ID' });
await api.post('/users/push-token', { token: token.data });
```

`backend/services/geofence.py`:

```python
import os, firebase_admin
from firebase_admin import credentials, messaging
from ..db import db

if not firebase_admin._apps:
    cred = credentials.Certificate(os.environ["FIREBASE_CREDENTIALS_PATH"])
    firebase_admin.initialize_app(cred)

async def notify_nearby_users(lat: float, lng: float, report_id: str, exclude_user_id: str):
    """Find users within 2km of the report and FCM-broadcast.

    Falls back to all users with push_token if no last_location exists yet
    (early in the demo when only 2 phones are tracked).
    """
    rows = await db.fetch("""
        SELECT u.push_token
        FROM users u
        WHERE u.push_token IS NOT NULL
          AND u.id != $4
          AND (
            u.last_location IS NULL
            OR ST_DWithin(
                 u.last_location,
                 ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                 $3
            )
          )
        LIMIT 200
    """, lng, lat, 2000, exclude_user_id)

    tokens = [r["push_token"] for r in rows if r["push_token"]]
    if not tokens:
        return

    msg = messaging.MulticastMessage(
        tokens=tokens,
        notification=messaging.Notification(
            title="Garbage nearby 🗑️",
            body="Help clean it up and earn SOL.",
        ),
        data={"report_id": report_id, "screen": "cleanup"},
        android=messaging.AndroidConfig(priority="high"),
    )
    messaging.send_each_for_multicast(msg)
```

Deep link handler in `app/_layout.tsx`:

```ts
useEffect(() => {
  const sub = Notifications.addNotificationResponseReceivedListener((res) => {
    const data = res.notification.request.content.data;
    if (data?.report_id) router.push(`/cleanup/${data.report_id}`);
  });
  return () => sub.remove();
}, []);
```

**MILESTONE 2:** Photo on Phone A → upload completes → pin appears on Phone B's map within 2s → Phone B receives FCM push → tap notification opens the cleanup detail screen ✓

---

## Phase 3 — Cleanup Flow + Verify Screen

**Hours 12–18 · Goal:** Full cleanup cycle with real-time consensus.

### 3.1 Cleanup Detail (Claim Stage)

`app/cleanup/[id].tsx` — when the cleanup hasn't been claimed yet, this screen acts as the "task page":

```tsx
// Above the fold:
//   - Hero photo from buildHeroImage(public_id) — 1200x900 smart-cropped
//   - Severity badge + neighborhood tag (auto-tagging) + GPS distance
//   - Time posted
//
// Primary CTA stack:
//   - "I'll clean this" button (#25671E, full-width, 56px)
//   - On tap: GPS check, then POST /cleanups { report_id, lat, lng }
//   - Once claimed: shows 2-hour countdown ring + "Submit cleanup" camera button
```

`backend/routes/cleanups.py` (claim with **200m** GPS radius for indoor venue):

```python
@router.post("/")
async def claim(payload: ClaimRequest, user=Depends(get_current_user)):
    report = await db.fetchrow("SELECT * FROM reports WHERE id = $1", payload.report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    if str(report["user_id"]) == user["id"]:
        raise HTTPException(400, "Cannot clean your own report")
    if report["status"] != "open":
        raise HTTPException(409, f"Report is {report['status']}")

    distance = await db.fetchval("""
        SELECT ST_Distance($1::geography,
                           ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography)
    """, report["location"], payload.lng, payload.lat)
    # 200m for indoor venue GPS drift; tighten to 50m in production.
    if distance > 200:
        raise HTTPException(400, f"Too far from location ({distance:.0f}m). Must be within 200m.")

    cleanup = await db.fetchrow("""
        INSERT INTO cleanups (report_id, cleaner_id, before_url, before_public_id, status)
        VALUES ($1, $2, $3, $4, 'claimed')
        RETURNING id
    """, payload.report_id, user["id"], report["photo_url"], report["photo_public_id"])

    await db.execute("UPDATE reports SET status = 'claimed' WHERE id = $1", payload.report_id)
    return {"cleanup_id": str(cleanup["id"])}
```

A FastAPI background task (run every 5min via APScheduler or a simple `while True: asyncio.sleep(300)` task) resets cleanups whose `claimed_at < now() - 2h` back to `'open'`.

### 3.2 After-Photo Submission

Reuse the same camera + Cloudinary upload pipeline. The submit endpoint:

```python
@router.patch("/{cleanup_id}/submit")
async def submit_cleanup(cleanup_id: str, payload: AfterPhotoPayload,
                         bg: BackgroundTasks, user=Depends(get_current_user)):
    await db.execute("""
        UPDATE cleanups
        SET after_url = $1, after_public_id = $2,
            status = 'pending_verification', submitted_at = now()
        WHERE id = $3 AND cleaner_id = $4
    """, payload.after_url, payload.after_public_id, cleanup_id, user["id"])

    await db.execute("""
        UPDATE reports SET status = 'pending_verification'
        WHERE id = (SELECT report_id FROM cleanups WHERE id = $1)
    """, cleanup_id)

    # Compare before/after via Cloudinary AI Vision
    bg.add_task(run_cleanup_vision, cleanup_id, payload.before_public_id, payload.after_public_id)
    return {"ok": True}

async def run_cleanup_vision(cleanup_id: str, before_id: str, after_id: str):
    result = await compare_before_after(before_id, after_id)
    await db.execute("""
        UPDATE cleanups SET vision_transcript = $1 WHERE id = $2
    """, json.dumps(result), cleanup_id)
```

### 3.3 Verify Screen — World ID Gate + Swipe Cards

> **World ID is the gate here.** Before showing swipe cards, check if the user has a nullifier. If not, run the IDKit flow first. This is where Phase 0.4 device verification pays off.

`app/(tabs)/verify.tsx`:

```tsx
import DeckSwiper from 'react-native-deck-swiper';
import * as Haptics from 'expo-haptics';
import { SwipeVoteCard } from '../../components/SwipeVoteCard';
import { verifyWithWorldID } from '../../lib/worldid';
import { api } from '../../lib/api';

export default function VerifyScreen() {
  const [pending, setPending]           = useState<any[]>([]);
  const [worldIdVerified, setVerified]  = useState<boolean | null>(null); // null = loading

  // Check World ID status on mount
  useEffect(() => {
    api.get('/users/me').then(({ data }) => {
      setVerified(!!data.world_id_nullifier);
    });
  }, []);

  useEffect(() => {
    if (!worldIdVerified) return;
    const load = async () => {
      const { data } = await supabase
        .from('cleanups')
        .select('*, report:reports(*)')
        .eq('status', 'pending_verification');
      setPending(data ?? []);
    };
    load();
    const channel = supabase
      .channel('verify-pending')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cleanups' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [worldIdVerified]);

  const submitVote = async (idx: number, vote: boolean) => {
    Haptics.notificationAsync(vote
      ? Haptics.NotificationFeedbackType.Success
      : Haptics.NotificationFeedbackType.Warning);
    await api.post('/votes', { cleanup_id: pending[idx].id, vote });
  };

  const handleVerifyWithWorldID = async () => {
    try {
      const proof = await verifyWithWorldID();
      await api.post('/users/verify-world-id', proof);
      setVerified(true);
    } catch (e) {
      // Show toast with error
    }
  };

  // Still loading
  if (worldIdVerified === null) return <LoadingScreen />;

  // Not yet World ID verified — show gate screen
  if (!worldIdVerified) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: 24, fontFamily: 'InterVariable', fontWeight: '510',
                       color: Colors.textPrimary, textAlign: 'center', marginBottom: 12 }}>
          Verify your humanity to vote
        </Text>
        <Text style={{ fontSize: 16, color: Colors.textSecondary, textAlign: 'center',
                       marginBottom: 32 }}>
          One real person = one vote. World ID prevents bots and Sybil attacks.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: Colors.greenDark, borderRadius: 8, height: 56,
                   width: '100%', justifyContent: 'center', alignItems: 'center' }}
          onPress={handleVerifyWithWorldID}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'InterVariable',
                         fontWeight: '510' }}>
            Verify with World ID
          </Text>
        </TouchableOpacity>
        <Text style={{ marginTop: 16, fontSize: 13, color: Colors.textSecondary }}>
          Don't have World App? Get it on the App Store.
        </Text>
      </View>
    );
  }

  // World ID verified — show swipe cards
  return (
    <DeckSwiper
      cards={pending}
      renderCard={(c) => <SwipeVoteCard cleanup={c} />}
      onSwipedRight={(i) => submitVote(i, true)}
      onSwipedLeft={(i)  => submitVote(i, false)}
      stackSize={3}
      backgroundColor={Colors.bg}
    />
  );
}
```

> If `react-native-deck-swiper` shows compatibility issues, fall back to a hand-rolled swipe via `react-native-gesture-handler` `PanGestureHandler` + Reanimated — already in the dependency list, ~2 hours of work.

Backend gate — add World ID check to `/votes` endpoint:

```python
@router.post("/")
async def submit_vote(p: VotePayload, user=Depends(get_current_user)):
    # Enforce World ID requirement server-side — client gate is UX only
    has_world_id = await db.fetchval(
        "SELECT world_id_nullifier FROM users WHERE id = $1", user["id"]
    )
    if not has_world_id:
        raise HTTPException(403, "World ID verification required to vote")
    await db.execute("""
        INSERT INTO votes (cleanup_id, voter_id, vote) VALUES ($1, $2, $3)
        ON CONFLICT (cleanup_id, voter_id) DO UPDATE SET vote = EXCLUDED.vote
    """, p.cleanup_id, user["id"], p.vote)
    await check_consensus(p.cleanup_id)
    return {"ok": True}
```

`components/SwipeVoteCard.tsx` — uses `buildComparisonImage(public_id)` for both before and after photos so they align in a 50/50 split layout. Pinch-to-zoom modal on tap.

### 3.4 Consensus + Reward Trigger

`backend/services/consensus.py`:

```python
TOTAL_VOTERS = 7
APPROVE_THRESHOLD = 5
REJECT_THRESHOLD = 3

async def check_consensus(cleanup_id: str):
    rows = await db.fetch("SELECT vote FROM votes WHERE cleanup_id = $1", cleanup_id)
    approvals = sum(1 for r in rows if r["vote"])
    rejections = len(rows) - approvals

    if approvals >= APPROVE_THRESHOLD:
        await db.execute("UPDATE cleanups SET status = 'confirmed' WHERE id = $1", cleanup_id)
        await db.execute("""
            UPDATE reports SET status = 'verified'
            WHERE id = (SELECT report_id FROM cleanups WHERE id = $1)
        """, cleanup_id)
        from .solana import distribute_rewards
        await distribute_rewards(cleanup_id)
    elif rejections >= REJECT_THRESHOLD:
        await db.execute("UPDATE cleanups SET status = 'rejected' WHERE id = $1", cleanup_id)
        await db.execute("""
            UPDATE reports SET status = 'open'
            WHERE id = (SELECT report_id FROM cleanups WHERE id = $1)
        """, cleanup_id)
```

`backend/routes/votes.py`:

```python
@router.post("/")
async def submit_vote(p: VotePayload, user=Depends(get_current_user)):
    await db.execute("""
        INSERT INTO votes (cleanup_id, voter_id, vote) VALUES ($1, $2, $3)
        ON CONFLICT (cleanup_id, voter_id) DO UPDATE SET vote = EXCLUDED.vote
    """, p.cleanup_id, user["id"], p.vote)
    await check_consensus(p.cleanup_id)
    return {"ok": True}
```

Supabase Realtime pushes the cleanup status change to all clients; map pins recolor live.

**MILESTONE 3:** Phone A submits cleanup → 3 phones swipe approve → consensus reached → pin turns green in real time on all devices ✓

---

## Phase 4 — Solana Rewards + Wallet

**Hours 18–24 · Goal:** SOL moves on consensus. Wallet animates. Solana Explorer confirms.

### 4.1 Wallet Generation at Onboarding

In `app/onboarding.tsx`, after Google sign-in succeeds and `/users/sync` returns `is_new: true`:

```ts
import { Keypair } from '@solana/web3.js';
import * as SecureStore from 'expo-secure-store';

const kp = Keypair.generate();
await SecureStore.setItemAsync(
  'solana_secret_key',
  Buffer.from(kp.secretKey).toString('base64')
);
await api.post('/users/wallet', { wallet_address: kp.publicKey.toString() });
```

`lib/solana.ts`:

```ts
import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import * as SecureStore from 'expo-secure-store';

export const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

export async function getBalance(walletAddress: string): Promise<number> {
  const lamports = await connection.getBalance(new PublicKey(walletAddress));
  return lamports / LAMPORTS_PER_SOL;
}

export async function loadKeypair(): Promise<Keypair> {
  const b64 = await SecureStore.getItemAsync('solana_secret_key');
  if (!b64) throw new Error('No wallet');
  return Keypair.fromSecretKey(Buffer.from(b64, 'base64'));
}
```

### 4.2 Backend Reward Distribution (correct `solders` 0.30+ API)

`backend/services/solana.py`:

```python
import json, os
from solana.rpc.async_api import AsyncClient
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.system_program import transfer
from solders.message import Message
from solders.transaction import VersionedTransaction

DEVNET_URL = "https://api.devnet.solana.com"

def load_escrow_keypair() -> Keypair:
    with open(os.environ["ESCROW_KEYPAIR_PATH"]) as f:
        secret = json.load(f)  # array of 64 bytes from solana-keygen
    return Keypair.from_bytes(bytes(secret))

async def send_sol(to_address: str, amount_sol: float, escrow: Keypair) -> str:
    """Send native SOL using modern solders API.

    Notes on the API shape (verified against solders docs):
      - `transfer(...)` takes a DICT, not a TransferParams object.
        Keys: from_pubkey, to_pubkey, lamports.
      - The recommended transaction type is `VersionedTransaction(msg, [signer])`,
        constructed from a `Message.new_with_blockhash(...)`.
        (The legacy form `Transaction.new_signed_with_payer(...)` also works.)

    Returns the tx signature as a string.
    """
    async with AsyncClient(DEVNET_URL) as client:
        to_pubkey = Pubkey.from_string(to_address)
        lamports = int(amount_sol * 1_000_000_000)

        ix = transfer({
            "from_pubkey": escrow.pubkey(),
            "to_pubkey":   to_pubkey,
            "lamports":    lamports,
        })

        latest = await client.get_latest_blockhash()
        msg = Message.new_with_blockhash([ix], escrow.pubkey(), latest.value.blockhash)
        tx = VersionedTransaction(msg, [escrow])

        resp = await client.send_transaction(tx)
        return str(resp.value)

async def distribute_rewards(cleanup_id: str):
    from ..db import db
    escrow = load_escrow_keypair()

    cleanup = await db.fetchrow("""
        SELECT c.*, r.user_id AS reporter_id
        FROM cleanups c JOIN reports r ON r.id = c.report_id
        WHERE c.id = $1
    """, cleanup_id)

    correct_voters = await db.fetch("""
        SELECT u.id, u.wallet_address FROM votes v
        JOIN users u ON u.id = v.voter_id
        WHERE v.cleanup_id = $1 AND v.vote = TRUE
          AND u.wallet_address IS NOT NULL
    """, cleanup_id)

    cleaner_wallet = await db.fetchval(
        "SELECT wallet_address FROM users WHERE id = $1", cleanup["cleaner_id"])
    reporter_wallet = await db.fetchval(
        "SELECT wallet_address FROM users WHERE id = $1", cleanup["reporter_id"])

    async def record(user_id, amount, kind, sig):
        await db.execute("""
            INSERT INTO transactions (user_id, amount_sol, type, tx_signature, cleanup_id)
            VALUES ($1, $2, $3, $4, $5)
        """, user_id, amount, kind, sig, cleanup_id)
        await db.execute(
            "UPDATE users SET sol_earned = sol_earned + $1 WHERE id = $2",
            amount, user_id)

    if cleaner_wallet:
        sig = await send_sol(cleaner_wallet, 0.10, escrow)
        await record(cleanup["cleaner_id"], 0.10, "cleaner", sig)
    if reporter_wallet:
        sig = await send_sol(reporter_wallet, 0.01, escrow)
        await record(cleanup["reporter_id"], 0.01, "reporter", sig)
    for v in correct_voters:
        sig = await send_sol(v["wallet_address"], 0.005, escrow)
        await record(v["id"], 0.005, "verifier", sig)
```

### 4.3 Wallet Screen

`app/(tabs)/wallet.tsx`:

```tsx
// Layout (light mode):
//   - Page title "Wallet" (Inter 510, 24px, #111111) at top
//   - Balance card: white bg, 4px #25671E top accent bar, elevation 4, borderRadius 16
//       - SOL amount: JetBrains Mono Bold, 32px, #9945FF, count-up animation
//       - "≈ $X.XX USD" (Inter 400, 16px, #6B7280)
//       - "✓ Verified Human" pill (#E9F5EB bg, #25671E text, 9999 radius)
//   - "Recent activity" section header
//   - Transaction rows (#F5F5F5 cards):
//       - Amount in JetBrains Mono (#14F195 for incoming green)
//       - Type label "Cleanup" / "Report" / "Verify" + location + time
//       - Tap → opens Solana Explorer in expo-web-browser
```

### 4.4 Gemma 4 Severity Tagging

`backend/services/gemma.py`:

```python
import google.generativeai as genai
import json, os, httpx, itertools

# 6 API keys in round-robin rotation — avoids per-key rate limits
_KEYS = [os.environ[f"GEMINI_API_KEY_{i}"] for i in range(1, 7)]
_key_cycle = itertools.cycle(_KEYS)

def _get_model():
    genai.configure(api_key=next(_key_cycle))
    return genai.GenerativeModel("gemini-2.5-flash")

PROMPT = """
Look at this garbage/waste image.
Return ONLY valid JSON, no markdown, no explanation:
{"severity": "Minor"|"Moderate"|"Major", "description": "max 12 words"}

Minor    = small litter, isolated trash
Moderate = significant pile or hazardous items
Major    = large illegal dump or widespread contamination
"""

async def tag_severity(report_id: str, photo_url: str):
    from ..db import db
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            img = (await client.get(photo_url)).content
        resp = _get_model().generate_content([
            PROMPT,
            {"mime_type": "image/jpeg", "data": img},
        ])
        text = resp.text.strip().strip("`").replace("json\n", "")
        data = json.loads(text)
        await db.execute("""
            UPDATE reports SET severity = $1, description = $2 WHERE id = $3
        """, data["severity"], data["description"], report_id)
    except Exception as e:
        print(f"Gemma severity tagging failed: {e}")
```

**MILESTONE 4:** Consensus reached → balance card animates up by 0.10 SOL → tap transaction → Solana Explorer shows real devnet tx hash ✓

---

## Phase 5 — Cloudinary Mobile Depth (Cloudinary Challenge Centerpiece)

**Hours 24–30 · Goal:** Five Cloudinary capability surfaces are visible, polished, and demoable in the mobile app.

This is the phase the Cloudinary judges will grade hardest. The web companion is gone — every Cloudinary feature lives in the app.

### 5.1 Cleanup Detail — Comparison Slider + AI Vision Transcript

`app/cleanup/[id].tsx` (post-claim, post-submission view):

```tsx
// Sections, top to bottom:
//
// 1. Header: "Cleanup #abc1234" + neighborhood (from cloudinary_tags[0]) + severity
//
// 2. Comparison Slider (the centerpiece of this screen)
//    - Both photos rendered with buildComparisonImage(public_id) — 800x600 g_auto
//      ensures alignment across non-pixel-matched captures
//    - Single drag handle, vertical line splits image into BEFORE | AFTER
//    - Driven by react-native-gesture-handler PanGestureHandler + Reanimated
//      interpolate (UI thread, no JS bridge)
//    - "Forensic mode" toggle at the bottom — re-loads buildForensicImage URL
//      (e_background_removal). Adds a #6B7280 backdrop so the foreground pops.
//
// 3. AI Vision Transcript card
//    - Collapsible (default expanded)
//    - JetBrains Mono Regular 14px on white bg
//    - Renders cleanups.vision_transcript:
//         Q: Compared to first image, has garbage been removed? → YES
//         model: ai_vision_v3
//      Plus reports.vision_transcript:
//         Q: Is there visible garbage? → YES
//         Q: AI-generated? → NO
//    - Status indicator: ✓ Verified by AI / ⚠️ Flagged
//
// 4. GPS proof + reward breakdown
//    - "Confirmed within 23m of report" pill
//    - "Reporter earned 0.01 SOL · Cleaner earned 0.10 SOL · 5 verifiers earned 0.025 SOL"
```

`components/ComparisonSlider.tsx`:

```tsx
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Image } from 'expo-image';

export function ComparisonSlider({ beforeUrl, afterUrl, width, height }) {
  const dx = useSharedValue(width / 2);

  const pan = Gesture.Pan().onUpdate((e) => {
    dx.value = Math.max(0, Math.min(width, dx.value + e.changeX));
  });

  const overlayStyle = useAnimatedStyle(() => ({ width: dx.value }));
  const handleStyle  = useAnimatedStyle(() => ({ left: dx.value - 28 }));

  return (
    <GestureDetector gesture={pan}>
      <View style={{ width, height, backgroundColor: '#000' }}>
        <Image source={afterUrl}  style={{ position: 'absolute', width, height }} />
        <Animated.View style={[{ position: 'absolute', height, overflow: 'hidden' }, overlayStyle]}>
          <Image source={beforeUrl} style={{ width, height }} />
        </Animated.View>
        <Animated.View style={[{ position: 'absolute', top: 0, height, width: 4,
                                  backgroundColor: '#FFFFFF' }, handleStyle]} />
        <Animated.View style={[{ position: 'absolute', top: height/2 - 28, width: 56, height: 56,
                                  borderRadius: 28, backgroundColor: '#FFFFFF',
                                  borderWidth: 2, borderColor: '#25671E',
                                  justifyContent: 'center', alignItems: 'center' },
                                handleStyle]}>
          <Text>⇆</Text>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
```

### 5.2 Envision Clean — Generative AI Showcase

`app/envision/[reportId].tsx`:

```tsx
// Pick any open report. Show ORIGINAL on the left, ENVISION on the right.
//
// ENVISION URL:
//   buildEnvisionURL(public_id, customPrompt)
//   = e_gen_remove:prompt_(garbage;litter;trash)/e_gen_background_replace:prompt_(USER_PROMPT)/f_auto,q_auto
//
// First render takes ~8-15s server-side. Show a Reanimated shimmer skeleton
// + "Cloudinary is rendering your vision..." copy.
// Subsequent loads of the same URL hit Cloudinary's CDN cache → instant.
//
// Below the images:
//   - Prompt input: "clean street with trees" (default)
//   - "Regenerate" button (#25671E)
//   - "Share" button (white bg, green border) — Share.share({ url })
//
// Tagline at the bottom: "Imagine what your block could look like."
```

### 5.3 Public Gallery Tab — "Images at Scale" Showcase

`app/(tabs)/gallery.tsx`:

```tsx
// THE Cloudinary surface for the Cloudinary judges. This is where "images at scale"
// lands visually. Pre-seed with 50+ before/after pairs from public CC0 sources
// for the demo so the grid feels populated.
//
// Layout:
//   - Header: "Cleaned by the community" (Inter 510, 24px) + city stats subline
//        e.g. "1,247 photos · 312 cleanups · 23 SOL distributed"
//      Numbers pulled from a Supabase aggregate query.
//
//   - Filter chips row (horizontal scroll):
//        ALL · Venice · DTLA · Westwood · Echo Park · ...
//      Filters are derived from cloudinary_tags[] — i.e. the Cloudinary auto-tagging
//      output drives the gallery's IA. This is one of the most concrete uses of
//      auto-tagging in the app and makes great demo copy.
//
//   - Severity chips: All | Minor | Moderate | Major
//
//   - Masonry grid (FlatList numColumns=2):
//        Each tile: expo-image source={buildThumb(after_public_id)}
//        Aspect ratio varied to feel organic
//        Tap → cleanup/[id] with comparison slider
//
//   - Pull-to-refresh
//
// Performance:
//   - All images go through f_auto,q_auto — 40-60% smaller than naive delivery
//   - g_auto smart cropping keeps cleanup spots centered
//   - expo-image has disk caching, fade-in, memory-aware — won't OOM on 50+ thumbnails
```

This single screen exercises three Cloudinary capabilities at once — auto-tagging (filter chips), smart cropping (`g_auto`), and auto format/quality (`f_auto`,`q_auto`). It is the most visually striking Cloudinary surface in the demo.

### 5.4 City Stats Card on Profile

`app/profile.tsx` — stack screen accessed via map header avatar:

```tsx
// Sections:
//   1. Avatar + handle (or anonymized "Verified Human #abc")
//   2. World ID badge: "✓ Verified Human" pill (#E9F5EB bg, #25671E text)
//   3. Reputation panel: "Reputation: 124" + small history of ±point changes
//   4. City Stats card (replaces what would have been the web dashboard):
//        - Total cleanups (city-wide)
//        - Total SOL distributed
//        - Top neighborhood by cleanups
//        - Active reporters this week
//      Pulled from a Supabase aggregate.
//   5. "My cleanups" — masonry grid of just this user's confirmed cleanups
//        Each tile uses buildThumb(after_public_id), tap → cleanup detail
```

### 5.5 Demo-Seed Gallery Data

To make the gallery feel like a real social-good app at scale, pre-upload 50+ before/after photo pairs to Cloudinary into `waste2wealth/seed/`. Sources:

- Public domain cleanup photos (Unsplash, CC0)
- Trash Hero, Litterati public datasets
- Stock photography of "before clean" and "after clean" street scenes

For each pair, insert a fake `reports` + `cleanups` row marked `status='verified'` with the seed Cloudinary public_ids. Run this script before the demo (separate from the live demo flow).

```sql
-- demo_seed.sql (excerpt — repeat for ~50 entries)
INSERT INTO reports (user_id, location, photo_url, photo_public_id,
                     severity, cloudinary_tags, status, created_at)
VALUES
  ('SEED_USER', ST_MakePoint(-118.4452, 34.0708)::geography,
   'https://res.cloudinary.com/CLOUD/image/upload/waste2wealth/seed/before_001.jpg',
   'waste2wealth/seed/before_001',
   'Moderate', ARRAY['venice','street','plastic-bags'], 'verified',
   now() - interval '3 days');

INSERT INTO cleanups (report_id, cleaner_id, before_url, before_public_id,
                      after_url, after_public_id, status, claimed_at, submitted_at)
VALUES (
  '<the_report_id>', 'SEED_USER',
  '...seed/before_001.jpg', 'waste2wealth/seed/before_001',
  '...seed/after_001.jpg',  'waste2wealth/seed/after_001',
  'confirmed', now() - interval '3 days', now() - interval '2 days 22 hours');
```

**MILESTONE 5:** Cleanup detail screen renders comparison slider + AI Vision transcript. Envision Clean returns a generative rendering. Gallery tab shows 50+ smart-cropped thumbnails with working tag and severity filters. ✓

---

## Phase 6 — Polish + Demo Hardening

**Hours 30–36 · Goal:** Shipped product feel. Zero surprises in the demo.

### 6.1 UI Polish Pass (apply DESIGN.md across every screen)

- [ ] **Skeleton loaders** on every async screen (Reanimated shimmer `#F5F5F5 → #E5E7EB → #F5F5F5`)
- [ ] **Task cards** (map bottom sheet): `#F5F5F5` bg, `1px #E5E7EB` border, `borderRadius 12`, padding 16
- [ ] **Primary buttons**: `#25671E` bg, `#FFFFFF` text, Inter 510 16px, height 56, `borderRadius 8`
- [ ] **Tab bar**: `#FFFFFF` bg, top border `#E5E7EB`, active icon `#25671E`, label Inter 510 11px
- [ ] **Inputs**: white bg, 1px border, 48 height, focus border `#519A66`
- [ ] **World ID badge**: pill — `#E9F5EB` bg, `#25671E` text, Inter 510 13px
- [ ] App icon: white background, `#25671E` trash bag + leaf or coin
- [ ] Splash: white bg, centered `#25671E` Waste2Wealth wordmark

### 6.2 Haptics Audit

- [ ] Camera shutter pressed → `impactAsync(Light)`
- [ ] GPS lock acquired → `impactAsync(Medium)`
- [ ] Report submitted → `notificationAsync(Success)`
- [ ] Claim cleanup tapped → `impactAsync(Medium)`
- [ ] Swipe right (approve) → `notificationAsync(Success)` + green flash
- [ ] Swipe left (reject) → `notificationAsync(Warning)` + red flash
- [ ] SOL balance increases → `notificationAsync(Success)` + count-up

### 6.3 Demo Data Pre-Seeding

- [ ] Run `demo_seed.sql` (Phase 5.5) — 50+ confirmed cleanups in the gallery
- [ ] Insert 5 fresh open reports near the venue:
  ```sql
  INSERT INTO reports (user_id, location, photo_url, photo_public_id, severity, status)
  VALUES
    ('TEST_USER_UUID', ST_MakePoint(-118.4452, 34.0708)::geography,
     'https://res.cloudinary.com/CLOUD/image/upload/waste2wealth/demo/sample1.jpg',
     'waste2wealth/demo/sample1', 'Moderate', 'open');
  -- ...4 more
  ```
- [ ] Insert 1 cleanup in `pending_verification` so judges can vote immediately
- [ ] Top up escrow: `solana airdrop 2 <ESCROW_PUBKEY>`

### 6.4 Test Matrix

- [ ] Android: full flow 5× (report → claim → cleanup → vote → SOL) ✓
- [ ] iPhone: full flow 3× ✓
- [ ] FCM push delivery on venue WiFi ✓
- [ ] Solana Explorer opens from wallet tap ✓
- [ ] Gallery loads 50+ thumbnails without jank ✓
- [ ] Comparison slider drags at 60fps ✓
- [ ] Envision generates within 15s ✓
- [ ] World ID login works on both phones ✓

### 6.5 Backend Deployment (do not demo from localhost)

- [ ] Deploy FastAPI to Railway:
  ```bash
  npm install -g @railway/cli
  railway login
  cd backend && railway init && railway up
  ```
- [ ] Update `EXPO_PUBLIC_API_URL` in `.env` to Railway URL
- [ ] Restart Expo: `npx expo start --clear`
- [ ] Run one full flow against the production backend

### 6.6 Devpost Submission Checklist

- [ ] Title: "Waste2Wealth — Clean Cities, Earn Crypto"
- [ ] Track boxes checked: Sustain the Spark (main), World U, Cloudinary, Solana, Arista Networks, Figma Make, Gemma 4
- [ ] **Cloudinary section** in description: explicit list of the three capability surfaces (AI Vision moderation pipeline + transcript, gallery with auto-tagging filter chips + smart crop + auto format/quality, comparison slider), the Skills Pack install (`npx skills add cloudinary-devs/skills`), and the demo Cloudinary Cloud Name `duigptg4j` so judges can browse the media library
- [ ] **Figma Make**: include screenshots of the prototype + at least one decision that changed because of it (e.g., shutter moved from center to bottom-right after thumb-zone testing)
- [ ] Demo video: record the 2-minute script (two phones, no laptop)
- [ ] GitHub repo: public, README explains setup
- [ ] Solana Explorer tx hash screenshot from a real demo wallet
- [ ] World ID `app_id` + staging environment noted
- [ ] Cloudinary survey filled at `cld.media/hackathon-survey`

**MILESTONE 6:** Full flow runs 3× consecutively without error. Demo script < 2 minutes. ✓

---

## Cut List (if time runs short)

Cut in this order — each cut keeps the demo watchable:

| Cut | What to drop             | Status   | Demo impact                                  | Prize impact              |
| --- | ------------------------ | -------- | -------------------------------------------- | ------------------------- |
| 1st | Gemma 4 severity tagging |          | User picks severity manually                 | Lose Gemma 4 swag         |
| 2nd | Reputation history panel |          | Profile screen is simpler                    | None                      |
| 3rd | Forensic mode toggle     | **CUT** ✓ | `e_background_removal` not on free plan. Comparison slider stays. | Negligible |
| 4th | Envision Clean           | **CUT** ✓ | `e_gen_remove`/`e_gen_background_replace` not on free plan. Gallery + slider + AI Vision is still the Cloudinary story. | Acceptable |
| 5th | Real Solana txns         |          | Mock balance increment, fake hash            | Lose Solana prize         |

**Never cut:** Google sign-in · World ID voting gate · map with pins · camera + Cloudinary upload · AI Vision moderation pipeline · gallery tab · swipe voting · SOL balance updating · comparison slider

---

## Non-Negotiables for Each Demo Device

**Phone 1 (Android — primary demo device)**

- [ ] World App installed and logged in
- [ ] Waste2Wealth installed (Expo Go for dev, or `eas build --profile preview` if needed)
- [ ] Pre-registered World ID account
- [ ] Battery > 80%
- [ ] Permissions: Location Always, Camera, Notifications

**Phone 2 (iPhone — secondary + audience verifier)**

- [ ] World App installed, separate World ID account
- [ ] Waste2Wealth installed
- [ ] Battery > 80%
- [ ] Same permissions

**Phone 3 (audience phone — third verifier for consensus demo)**

- [ ] Pre-loaded with Waste2Wealth + a third World ID account

---

*Built for LA Hacks 2026 · 36-hour build plan · Mobile-only React Native · 6 company tracks*
