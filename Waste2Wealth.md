# Waste2Wealth
## *Turn every piece of trash into a transaction. Clean cities. Earn crypto.*

---

> **One-line pitch:** Waste2Wealth is a community-powered React Native app where people earn Solana by reporting, cleaning, and verifying garbage — every photo runs through Cloudinary AI Vision, every vote is gated by World ID to prevent Sybil attacks, and the entire experience lives on a single phone.

---

## The Problem

Every city has the same story. Garbage sits on street corners for weeks. Not because people don't care — but because there's no incentive to act, no accountability system, and no way to coordinate strangers into collective action.

- **2.12 billion tons** of waste is generated globally every year
- **91%** of plastic is never recycled
- Municipal cleanup budgets are stretched thin — LA alone spends **$500M+/year** on waste management
- Community reporting apps (like SeeClickFix) exist but have **<5% completion rates** — reports go in, nothing comes out

The core issue: **there's no economic incentive to clean something that isn't yours.** Waste2Wealth fixes that.

---

## The Solution

Waste2Wealth is a **single React Native (Expo) mobile app** — no web companion, no admin console — that creates a three-sided incentive economy around garbage cleanup:

1. **Report it** — See garbage? Photograph it. Earn a small reward when it gets cleaned.
2. **Clean it** — Accept cleanup tasks near you. Upload a verified before/after photo. Earn Solana.
3. **Verify it** — Vote on whether a cleanup was legitimate. Earn for voting with the consensus.

Every action is protected by:
- **World ID** — one real human = one account (no Sybil farming)
- **Cloudinary AI Vision** — every photo is interrogated in plain English ("Is there visible garbage here?", "Has it been cleaned?", "Is this AI-generated?") and the prompt/answer transcript is published in-app on the cleanup detail screen
- **GPS lock** — must be within 200 meters of the reported location to submit a cleanup

The result: a self-sustaining cleanup economy where bad actors can't game the system and good actors are meaningfully rewarded — and a citizen-capture app whose every screen is built around image quality, image trust, and image scale.

---

## How It Works — Full User Journey

```
┌─────────────────────────────────────────────────────────────────┐
│                         WASTE2WEALTH FLOW                       │
│                                                                 │
│  REPORTER                CLEANER                  VERIFIERS     │
│                                                                 │
│  1. Sees garbage         4. Gets push notif       7. Notified   │
│  2. Opens app               on map                   to verify  │
│  3. Photos it ──────────►5. Navigates there      8. See before  │
│     GPS tagged           6. Cleans + photos ─────►   + after   │
│     AI checked              AI checked           9. Swipe Y/N   │
│     Uploaded                Uploaded            10. Consensus   │
│                                                     reached     │
│                                                        │        │
│          ◄──────────── SOLANA REWARDS ─────────────────        │
│    0.01 SOL              0.10 SOL               0.005 SOL each  │
│   (when cleaned)        (on approval)          (correct voters) │
└─────────────────────────────────────────────────────────────────┘
```

### Step-by-Step

**Step 1: Onboarding (One-time)**
User installs app → taps "Continue with Google" → Supabase OAuth flow in system browser → returns to app → backend upserts user row → Solana keypair generated on-device and stored in `expo-secure-store` → ready to report and clean.

**World ID (first vote only):** When the user opens the Verify tab for the first time, they see a gate screen: "Verify your humanity to vote." Tapping it opens World App via IDKit, completes a biometric scan, and attaches their `nullifier_hash` to their user row. From then on they can vote. One World ID = one voting identity. No fake vote rings.

**Step 2: Report a Garbage Spot**
- Open native camera (`expo-camera`) in app
- Photo uploaded to Cloudinary via `cloudinary-react-native` → eager `e_auto_tagging` (async, non-blocking)
- Backend kicks off Cloudinary AI Vision Moderation in a background task with prompts like *"Is there visible garbage in this image?"* and *"Does this image appear AI-generated?"* — flags rows that fail and surfaces the full prompt/answer transcript in-app on the cleanup detail screen
- GPS coordinates embedded and locked (`expo-location`)
- Pin goes live on the map — visible to all users within a 2km radius via Supabase Realtime
- Reporter gets a pending badge: reward unlocks when cleanup is verified

**Step 3: Cleanup Notifications**
- All World-ID-verified users with a `last_location` within 2km receive an FCM push notification
- App opens to a map pin showing the garbage location, severity tag, and estimated cleanup time
- User taps "I'll clean this" to claim it → becomes the assigned cleaner (lock expires after 2 hours)

**Step 4: Submit a Cleanup**
- Cleaner arrives at location → GPS verifies they're within 200m
- Takes an "after" photo → same Cloudinary pipeline runs → AI Vision compares the before/after pair
- Both photos rendered side-by-side via the in-app **Comparison Slider** for verifiers
- Cleanup enters "Pending Verification" state

**Step 5: Community Verification**
- Up to 7 nearby verified users get pulled in to vote
- They see the before/after pair as a swipe card driven by Cloudinary's smart-cropped (`g_auto`) images, plus GPS confirmation data
- Swipe right = ✅ Cleaned Well / Swipe left = ❌ Insufficient
- **Consensus threshold:** 5 out of 7 approve → cleanup confirmed
- Verifiers who voted with the consensus earn 0.005 SOL each
- Verifiers who voted against consensus lose reputation points

**Step 6: Reward Distribution**
- Backend releases funds from escrow Solana devnet wallet using `solders` (modern Python SDK):
  - Cleaner: **0.10 SOL**
  - Reporter: **0.01 SOL**
  - Each correct verifier: **0.005 SOL**
- All transactions appear in-app wallet and on Solana Explorer

---

## Token Economy & Anti-Gaming

The hardest problem in any reward system is: *how do you stop people from cheating?*

Most apps have no answer. Waste2Wealth has four layers:

### Layer 1 — World ID (Sybil Prevention for Voting)
One person = one vote. Cryptographically enforced. Users sign in with Google (frictionless); before their first vote they complete a World ID biometric scan that binds their voting identity to a unique human. No fake voting rings, no coordinated Sybil attacks on consensus. The `nullifier_hash` is stored on their user row and checked server-side on every vote submission — the client gate is UX, the server gate is the actual enforcement.

### Layer 2 — Cloudinary AI Vision (Cloud-side Trust Layer)
Every uploaded image is analyzed by Cloudinary's AI Vision API with custom natural-language prompts that ask, in plain English, the trust questions a human moderator would ask:
- *"Is there visible garbage or litter in this image?"* (gates report submissions)
- *"Does this image appear to be AI-generated or computer-rendered?"* (catches synthetic uploads — replaces what would have been an on-device ONNX model with a more accurate, server-side check)
- *"Compared to the first image, has the visible garbage been removed in the second image?"* (cleanup before/after pair)

The yes/no responses gate database state changes and reward release. Every transcript — the prompts asked, the model's answers, the model version — is stored on the report/cleanup row and surfaced **in-app** on the cleanup detail screen. Content moderation as a transparent reasoning trace, not a black box. Two API endpoints power this layer:

- `POST /v2/analysis/<cloud>/analyze/ai_vision_moderation` — yes/no verification questions
- `POST /v2/analysis/<cloud>/analyze/ai_vision_general` — descriptive analysis used for the in-app cleanup detail captions

Auto-tagging (`e_auto_tagging`) runs on the same upload pipeline to enrich the gallery tab with neighborhood and content tags.

### Layer 3 — GPS Lock + Time Window
- Reporter's GPS embedded in the original post via `expo-location`
- Cleaner must be within 200m of that GPS coordinate to submit a cleanup (loosened from 50m for indoor venue GPS drift; production tightens this)
- Cleanup photo must be taken within the 2-hour claim window
- Timestamps server-verified (not device clock)

### Layer 4 — Reputation Score
Every user has a reputation score (starts at 100):
- Correct verifications: **+2 points**
- Overturned votes: **-5 points**
- Low reputation users get fewer verification requests and lower SOL per vote
- Score below 30 → temporarily suspended from verifying

Coordinated bad actors degrade their own ability to game the system over time.

---

## Tech Stack

### Mobile App (React Native + Expo) — the entire product

```
src/
├── app/                            # Expo Router file-based navigation
│   ├── (tabs)/
│   │   ├── index.tsx               # Map screen (home)
│   │   ├── gallery.tsx             # Public cleanup gallery (Cloudinary showcase)
│   │   ├── report.tsx              # Camera + upload
│   │   ├── verify.tsx              # Swipe card voting UI
│   │   └── wallet.tsx              # SOL balance + history
│   ├── cleanup/[id].tsx            # Cleanup Detail — comparison slider + AI Vision transcript
│   ├── envision/[reportId].tsx     # Envision Clean — generative-AI rendering
│   ├── profile.tsx                 # World ID badge + reputation + city stats (stack screen)
│   └── onboarding.tsx              # Google Auth sign-in screen
├── components/
│   ├── GarbagePin.tsx              # Custom map marker component
│   ├── UploadStatus.tsx            # Upload progress + Vision pending state
│   ├── SwipeVoteCard.tsx           # Before/after swipeable card
│   ├── ComparisonSlider.tsx        # Native gesture-driven before/after slider
│   ├── VisionTranscript.tsx        # Collapsible AI Vision prompt/answer log
│   ├── EnvisionPanel.tsx           # Generative-rendering preview
│   ├── BottomSheet.tsx             # Task list bottom sheet
│   ├── ProfileAvatarHeader.tsx     # Map header avatar → profile stack
│   └── WalletCard.tsx              # SOL balance display
├── lib/
│   ├── worldid.ts                  # Universal-link deep flow + proof return parsing
│   ├── solana.ts                   # @solana/web3.js with RN polyfills
│   ├── cloudinary.ts               # cloudinary-react-native upload + URL builders
│   ├── api.ts                      # FastAPI client
│   └── supabase.ts                 # DB client + realtime
```

**Key packages:**
```json
{
  "expo": "~51.0.0",
  "expo-camera": "native camera — full frame control, better than getUserMedia",
  "expo-location": "native GPS — background location, precise coords",
  "expo-notifications": "FCM push — works on iOS + Android, reliable",
  "expo-haptics": "real haptic feedback on vote actions",
  "expo-image": "consumes Cloudinary delivery URLs (replaces <CldImage>)",
  "expo-linking": "universal link handling for World ID return",
  "expo-secure-store": "encrypted Solana secret key storage",
  "react-native-maps": "native Google/Apple Maps with custom pins",
  "@gorhom/bottom-sheet": "native bottom sheet — smooth snap points",
  "react-native-deck-swiper": "Tinder-style swipe cards for verify screen",
  "react-native-gesture-handler": "native gesture recognition + comparison slider",
  "cloudinary-react-native": "Cloudinary upload SDK for RN",
  "@solana/web3.js": "Solana wallet + devnet transactions",
  "react-native-get-random-values": "Solana polyfill",
  "react-native-url-polyfill": "Solana polyfill",
  "@supabase/supabase-js": "DB client + realtime subscriptions",
  "react-native-reanimated": "smooth 60fps animations"
}
```

**Dev-time:** `npx skills add cloudinary-devs/skills` installs three Claude Code skills — `cloudinary-docs`, `cloudinary-react`, `cloudinary-transformations` — into the project workflow. The transformations skill turns natural-language image goals into valid Cloudinary URL strings (e.g. *"resize to 800×600, smart crop, auto format"* → `c_fill,w_800,h_600,g_auto,f_auto`). The Skills Pack is one of the two artifacts the Cloudinary Challenge accepts as the starter (the other being the React AI Starter Kit) — and the only one that's runtime-agnostic and works inside React Native.

**Why React Native (and no web companion):**

| Feature | Web app | React Native (this build) |
|---------|---------|---------------------------|
| Camera | `getUserMedia` — limited | `expo-camera` — native, full frame access |
| GPS accuracy | `navigator.geolocation` — basic | `expo-location` — precise, background capable |
| Push notifications | Web Push — flaky on iOS | FCM native — rock solid both platforms |
| Image upload | `<input type="file">` — clunky on mobile | `cloudinary-react-native` — chunked, native progress |
| Gestures | CSS touch events — laggy | `react-native-gesture-handler` — native thread |
| Haptics | Web Vibration API — limited | `expo-haptics` — full haptic engine |
| Maps | CSS map — no native rendering | `react-native-maps` — native Google Maps |
| Cloudinary URL transforms | Same | Same — URLs are runtime-agnostic |

A web companion would have duplicated the gallery and stats views without exercising any new Cloudinary capability. We folded those views into the **Gallery tab** and **Profile screen** so all five Cloudinary surfaces live on the phone.

---

## Cloudinary — Five In-App Surfaces, Built for Images at Scale

Cloudinary is not a storage layer here — it's the **trust and creative engine** of the whole product. Every uploaded photo flows through multiple Cloudinary capabilities: AI Vision for verification, generative AI for civic envisioning, smart cropping for the gallery, background removal for forensic inspection, auto-tagging for the gallery's information architecture. Each user image gets exercised by **5–7 distinct transformations** between upload and final delivery.

This is what *images at scale* looks like in our app: a single photo a citizen captures becomes a thumbnail in the map bottom sheet, a smart-cropped tile in the gallery, an aligned half of a comparison slider, a forensic-mode foreground extract, a generative "envision" rendering, and a forensic AI Vision transcript — all delivered through Cloudinary URLs and consumed via `expo-image`.

**1. Map + Cleanup Feed (`app/(tabs)/index.tsx`)**
Real-time pins from Supabase. Bottom sheet feed of nearby tasks renders Cloudinary thumbnails delivered with `f_auto,q_auto,c_thumb,g_auto,w_400,h_300` — content-aware smart cropping ensures the garbage stays centered even on hand-held shots. URLs are constructed in `lib/cloudinary.ts` and fed to `expo-image`.

**2. Cleanup Detail (`app/cleanup/[id].tsx`) — trust transparency surface**
Header showing severity, neighborhood (auto-tagged by Cloudinary `e_auto_tagging`), GPS, and time. Below it: a **native before/after Comparison Slider** built on `react-native-gesture-handler` — both images are normalized via `c_fill,w_800,h_600,g_auto` so they align across non-pixel-matched captures. An optional toggle reveals an `e_background_removal` foreground-isolation mode for forensic inspection. Below the slider, the **AI Vision Transcript** panel renders the raw moderation prompts, the model's yes/no responses, and the `model_version` as a forensic chat log. Verifiers (and citizens browsing the app) see the AI's reasoning, not just the verdict.

**3. Envision Clean (`app/envision/[reportId].tsx`) — generative-AI showcase**
Pick any open garbage report; the screen shows the original photo on the left and a **Cloudinary-generated rendering** of the cleaned spot on the right. The right panel uses a delivery URL with chained transforms:
```
e_gen_remove:prompt_(garbage;litter;trash)/e_gen_background_replace:prompt_(clean city street with trees)/f_auto,q_auto
```
A prompt input lets users customize the generative prompt and regenerate (Cloudinary auto-caches by transform string). A "Share" button copies the delivery URL. This turns a passive report into a civic vision tool — *here's what your block could look like* — rendered server-side by Cloudinary's generative AI and consumed in the app via a plain HTTPS URL fed to `expo-image`.

**4. Public Gallery Tab (`app/(tabs)/gallery.tsx`) — the "images at scale" centerpiece**
This is the Cloudinary judges' first stop. A dedicated tab. Pre-seeded with 50+ before/after pairs so it feels like a real social-good community app. A FlatList masonry grid of confirmed cleanups. Filter chips at the top are driven by `e_auto_tagging` results (neighborhood, content tags) and severity. `expo-image` consumes `c_thumb,g_auto,w_400,h_300,f_auto,q_auto` URLs — every thumbnail is 40–60% smaller than naive delivery, smart-cropped to keep the cleanup spot centered. Tap any cleanup → opens its `cleanup/[id]` detail with the comparison slider.

A small stats line above the grid surfaces the impact: *"1,247 photos · 312 cleanups · 23 SOL distributed"* — making explicit that the app's value scales linearly with image volume.

**5. City Stats on Profile (`app/profile.tsx`) — folded in, replacing the cut web dashboard**
Totals, top neighborhoods, total SOL distributed, active reporters — pulled from Supabase. Renders as a stat card row above the World ID badge and reputation panel, then the user's own grid of confirmed cleanups underneath. Same `c_thumb,g_auto` thumbnails as the gallery.

**On `<CldImage>`:** the React-DOM `<CldImage>` component does **not** work in React Native. The mobile app constructs Cloudinary delivery URLs (using patterns from the `cloudinary-transformations` skill) and feeds them to `expo-image`. This is functionally equivalent — Cloudinary does all the work server-side; the client only consumes a URL.

### Backend (Python + FastAPI)

```
backend/
├── main.py
├── routes/
│   ├── reports.py        # CRUD for garbage reports
│   ├── cleanups.py       # Task claiming + submission
│   ├── votes.py          # Consensus voting logic
│   ├── users.py          # Profile + reputation + World ID verify (httpx)
│   └── rewards.py        # Solana transaction trigger
├── services/
│   ├── geofence.py       # PostGIS radius queries + push routing
│   ├── consensus.py      # Vote tallying + threshold logic
│   ├── cloudinary_vision.py # AI Vision Moderation + General API calls
│   ├── solana.py         # Devnet transaction execution (solders 0.30+, async)
│   └── gemma.py          # Gemini severity tagging
└── models/
    ├── report.py
    ├── cleanup.py
    └── vote.py
```

**Key packages:**
- `fastapi` + `uvicorn`
- `supabase-py` — database (PostGIS for geo queries)
- `solders` 0.30+ + `solana` — Solana devnet transactions (modern async API; not the old `solana-py.transaction.Transaction`)
- `cloudinary` — Python SDK for upload signing
- `httpx` — direct calls to Cloudinary AI Vision endpoints **and** Worldcoin Developer Portal `/api/v1/verify/{app_id}` (no `pip install worldcoin` package — that doesn't exist; use the HTTP API directly)
- `firebase-admin` — FCM push notification triggers
- `google-generativeai` — Gemini 2.0 Flash for severity tagging

### Database (Supabase + PostGIS)

```sql
-- Core tables
reports      (id, user_id, location, photo_url, photo_public_id, severity,
              cloudinary_tags, vision_transcript JSONB, status, created_at)
cleanups     (id, report_id, cleaner_id, before_url, before_public_id,
              after_url, after_public_id, vision_transcript JSONB, status,
              claimed_at, submitted_at)
votes        (id, cleanup_id, voter_id, vote, created_at)
users        (id, world_id_nullifier, wallet_address, reputation, sol_earned,
              push_token, last_location GEOGRAPHY(POINT,4326))
transactions (id, user_id, amount_sol, type, tx_signature, cleanup_id, created_at)
```

`ST_DWithin` queries find all users within 2km of a report in one SQL call. Supabase Realtime pushes pin status changes to all connected app clients instantly. RLS policies enable public reads on these tables (writes go through the FastAPI service-role key) so Realtime delivers events to anonymous clients — without the policies, Realtime is silent.

### Blockchain (Solana Devnet)

- **Wallet:** Keypair generated via `@solana/web3.js` at onboarding, secret stored in `expo-secure-store`. Three polyfills required in `index.js`:
  ```js
  import 'react-native-get-random-values';
  import 'react-native-url-polyfill/auto';
  global.Buffer = require('buffer').Buffer;
  ```
- **Escrow:** Backend-held keypair acts as escrow for the hackathon demo
- **Release:** FastAPI `/rewards` triggers `solders.system_program.transfer` (modern API) → atomic distribution to cleaner, reporter, and each correct verifier
- **Demo:** Solana devnet — real transaction mechanics, confirmations on Solana Explorer, no real money

### AI — Cloudinary AI Vision (Verification Engine, replaces on-device ONNX)

- **API:** `POST /v2/analysis/<cloud>/analyze/ai_vision_moderation` — accepts a list of natural-language prompts and returns yes/no answers for each, with `model_version` for auditability
- **Where it runs:** server-side, called from FastAPI via `httpx` after the photo lands in Cloudinary. Uses the async/optimistic pattern: the report row is inserted immediately and the Vision check runs in a `BackgroundTasks` coroutine, retro-flagging the row if it fails. This keeps the mobile capture experience snappy (<500ms perceived) while still gating reward release.
- **Why server-side, not on-device:** an EfficientNet-class ONNX model would have shipped 10MB into the bundle and added 4–8 hours of debugging — and still wouldn't have answered the actual trust question (*"is this photo of garbage real?"*). Cloudinary's hosted model answers it in plain English and ships the reasoning to the client as a transcript. Better trust story, smaller app, more time to polish.
- **Prompts (report path):**
  - *"Is there visible garbage or litter in this image? Answer yes or no."*
  - *"Does this image appear to be AI-generated or computer-rendered? Answer yes or no."*
- **Prompts (cleanup pair path):** the before and after URLs are sent together with a single comparison prompt: *"Compared to the first image, has the visible garbage been removed in the second image? Answer yes or no."*
- **Storage:** every transcript (prompts, answers, model_version) is written to `reports.vision_transcript` (JSONB) and `cleanups.vision_transcript`. The mobile cleanup-detail screen renders these as a forensic chat log — the AI's reasoning is published in-app, not hidden.
- **Quota:** AI Vision is a paid Cloudinary add-on with a free trial. Phase 0 verifies the trial covers the demo window (≥200 calls). If exhausted, the fallback is pre-rendered transcripts on demo data — the in-app story still works.

### Image Pipeline (Cloudinary)

**Mobile capture (Expo app):**
- `cloudinary-react-native` SDK → unsigned upload preset → `waste2wealth/{reports|cleanups}` folder
- Eager auto-tagging: `e_auto_tagging:80` (`eager_async: true` so the upload doesn't block on AI moderation)

**Backend verification (FastAPI):**
- `POST /v2/analysis/<cloud>/analyze/ai_vision_moderation` — natural-language yes/no prompts about each photo. Runs in a background task after insert (async/optimistic pattern); retro-flags rows that fail.
- `POST /v2/analysis/<cloud>/analyze/ai_vision_general` — descriptive captions for the cleanup detail screen

**In-app delivery (URLs constructed via `lib/cloudinary.ts`, consumed by `expo-image`):**
- Every image: `f_auto, q_auto` (automatic format + quality)
- Map pin thumbnails + Gallery tab: `c_thumb, g_auto, w_400, h_300` — content-aware smart cropping keeps the cleanup spot centered even on hand-held shots
- **Comparison Slider** (cleanup detail): before/after photos normalized via `c_fill, w_800, h_600, g_auto` so they align across non-pixel-matched captures
- **Background-removal forensic toggle** (cleanup detail): `e_background_removal` reveals the foreground only
- **Envision Clean screen** (`/envision/[reportId]`): chained generative transforms — `e_gen_remove:prompt_(garbage;litter;trash)/e_gen_background_replace:prompt_(clean street with trees)/f_auto,q_auto` — produces an AI-generated rendering of what the spot could look like cleaned
- **AI Vision Transcript** (cleanup detail): renders the raw moderation prompts + answers + `model_version` as a forensic chat transcript

### Notifications + Geo-routing (Arista angle)

- Firebase Cloud Messaging (FCM) via `expo-notifications` — works reliably on both iOS and Android
- Push tokens stored in `users` table at onboarding; users' `last_location` is updated whenever the map screen acquires a location lock (the schema includes a `last_location GEOGRAPHY(POINT, 4326)` column with a GIST index)
- FastAPI geofence service: on every new report, `ST_DWithin(users.last_location, report_location, 2000)` finds all users within 2km of the report → `firebase-admin` batch sends FCM to their tokens (excluding the reporter). Falls back to broadcasting to all users with a push token if `last_location` is null (small-test-user case at hackathon start).
- Notification deep-links directly to the cleanup detail screen for that report
- The routing logic (proximity + reputation weighting) is the **Arista layer** — intelligently routing real-world resource information to the people best positioned to act on it

### World ID (IDKit Universal Link — React Native Compatible)

MiniKit is web-only. For React Native, we use the IDKit Bridge flow (the exact SDK helper name is verified in Phase 0 against the installed package):

1. App calls `@worldcoin/idkit-core`'s bridge-session helper → receives `{ request_id, world_app_url }`
2. App opens `world_app_url` via `expo-linking` — World App handles the biometric scan
3. World App posts the proof to the Bridge service (not back via deep link — avoids universal-link return drops)
4. App polls the Bridge with `request_id` until the proof is available, then POSTs the proof to FastAPI
5. FastAPI validates the proof via direct HTTP to the Worldcoin Developer Portal: `POST https://developer.worldcoin.org/api/v1/verify/{app_id}` (using `httpx` — there is no `pip install worldcoin` package; the docs sometimes suggest one, but it doesn't exist on PyPI)

**Why not hardcode the URL?** The deep-link / bridge-URL format has churned multiple times across IDKit versions. The plan treats Phase 0 as the moment we lock the exact SDK helper names against the installed package, then build on top.

The user must have World App installed — this is fine for a hackathon demo and expected for the World U track.

---

## Track Eligibility

### Main Track

**Sustain the Spark** ✅ — Combating waste, enabling community-led environmental cleanup, with economic incentives that make sustainable behavior the default choice. Most direct possible interpretation of the track.

### Company Tracks

**World U — Build for the Future of the Internet** ⭐ **$1,500**

The entire integrity of the Waste2Wealth economy rests on proof-of-human. Without it:
- One person creates 50 accounts, reports and "cleans" the same spot repeatedly
- Coordinated fake voting rings drain the reward pool
- The economy collapses

World ID doesn't just add a feature — it makes the product viable.

> **Chain note:** World U requires *"If the project is on-chain deploy contracts to World Chain."* The Solana reward system is a separate, parallel system — the World ID verification itself is purely off-chain (backend nullifier check via the Developer Portal). This satisfies the "non-mini app using IDKit" path. If judges push back, the fallback is replacing Solana devnet with World Chain (EVM-compatible, swap `solders` for `web3.py` + a simple Solidity escrow).

MiniKit integration requirements:
- ✅ Non-mini app using IDKit (React Native universal-link path)
- ✅ `verify` flow with proper `return_url`
- ✅ Proof validated in FastAPI backend against the Developer Portal
- ✅ Clear explanation of why World ID matters (the Sybil argument)
- ✅ Not gambling-based

**Cloudinary Challenge** ⭐ **$500/member Amazon GC + Featured Project + Credits Boost**

The Cloudinary integration is the centerpiece of the mobile app, not an afterthought. Three concrete claims to the judges:

1. **Built around the Cloudinary Skills Pack.** `npx skills add cloudinary-devs/skills` installs `cloudinary-docs`, `cloudinary-react`, and `cloudinary-transformations` into the project's Claude Code workflow during development, so generated code follows current SDK patterns and the URL strings come from the official transformations skill rather than guesswork. The Skills Pack is one of the two eligible artifacts named in the Cloudinary Challenge — and the only one that's runtime-agnostic and applies inside React Native.

2. **Built for "social good apps that work with images at scale" — the judges' stated taste.** This is a citizen-capture app. Every screen is built around image quality, image trust, and image volume. The Gallery tab pre-seeds 50+ before/after pairs and is designed to feel like a community feed at scale — every thumbnail goes through `c_thumb,g_auto,w_400,h_300,f_auto,q_auto`. Five distinct Cloudinary capability surfaces (gallery, comparison slider, AI Vision transcript, generative envision, forensic background removal) all live inside the mobile app.

3. **Innovative use beyond storage.** Cloudinary AI Vision is our **trust layer** — every photo answers natural-language prompts ("Is there visible garbage?", "Has it been cleaned?", "Is this AI-generated?") and the full transcript is published in-app on the cleanup detail screen. Cloudinary generative transforms (`e_gen_remove`, `e_gen_background_replace`) power the **"Envision Clean"** civic-vision feature — a one-tap rendering of what any reported spot could look like cleaned. Smart cropping (`g_auto`) holds the cleanup pair aligned in the comparison slider; `e_background_removal` adds a forensic-inspection toggle. Auto-tagging (`e_auto_tagging`) drives the gallery filter chips. Cloudinary is the verification mechanism *and* the creative engine *and* the gallery delivery layer — not a CDN.

> **Risk we're accepting:** the Cloudinary card text says "build a web app." The Skills Pack is explicitly listed as the alternative starter, and the judges' stated taste is "social good apps that work with images at scale" — both of which we lean into hard with a polished mobile-first submission.

**Arista Networks — Connect the Dots** ✅ **Claude Pro 12mo + Bose headphones**

The FCM geofence notification engine is the Arista component. When a garbage report comes in, the system routes actionable resource information (the garbage spot) to the humans best positioned to act — filtered by proximity (`last_location` + `ST_DWithin`) and reputation. *"Route useful data to solve a problem in daily life"* is the literal product description.

**Best Use of Solana** ✅ **Ledger Nano S Plus (per team member)**

Waste2Wealth is built on Solana devnet. Every completed cleanup cycle generates multiple micro-transactions in rapid succession: reporter bounty (0.01 SOL), cleaner reward (0.10 SOL), and up to 7 verifier payouts (0.005 SOL each). That's up to 9 atomic transactions per cleanup, triggered programmatically within seconds of consensus.

Solana is specifically the right chain for this: near-zero fees make micro-payments of fractions of a cent viable (on Ethereum, gas would exceed the reward), and sub-second finality means the wallet balance updates while the judge is still watching. The submission maps directly to Solana's stated use case — *"a consumer product that relies on instant, high-frequency transactions."*

On Devpost: frame the escrow-release mechanism and the three-sided payment split as the centerpiece of the Solana submission.

**Figma Make Challenge** ✅ **Figma Plushies + Edu Team Recognition**

Zero engineering cost — this is a process award. Before writing a single line of React Native code, prototype the 5 key screens (Map, Gallery, Report Camera, Verify Swipe, Wallet) in Figma Make. It takes 30–45 minutes, lets you validate layout decisions early (especially the bottom sheet snap points and thumb-zone placement), and kills bad ideas before they're coded.

What to document on Devpost:
- Show the Figma Make prototype alongside the final RN screens — the comparison tells the story
- Mention one specific decision that changed because of the prototype (e.g., moved the shutter button from center to bottom-right after testing thumb reach)
- Include a screenshot of the Figma Make session

No design experience required. The Figma for Edu team highlights 6–10 teams — a compelling "here's how we used it to think faster" narrative is all you need.

**Total potential prizes:** $1,500 (World U) + $500/member (Cloudinary, plus featured-project slot and credits boost) + Ledger Nano S+ per member (Solana) + Arista (Claude Pro + Bose headphones) + Figma plushies

---

## App Design

### Brand Identity

**Name:** Waste2Wealth
**Tagline:** *Clean cities. Earn crypto.*
**Tone:** Optimistic, community-driven, trustworthy — not preachy. Empowering, not guilt-driven.

### Color Palette

**Theme: Light mode throughout. The map canvas is the only dark surface.**

```
Brand Green
  #25671E  (Green Dark — logo, wordmark, emphasis labels, active tab icons)
  #519A66  (Green Medium — primary buttons, active states, progress fills, icons)
  #E9F5EB  (Green Tint — selected chip backgrounds, subtle surface accents)

UI — Light Mode (all screens except map)
  #FFFFFF  (background — all screen surfaces)
  #F5F5F5  (card surface — task cards, transaction rows, bottom sheet)
  #E5E7EB  (borders, separators, dividers)
  #111111  (primary text)
  #6B7280  (secondary text, timestamps, metadata)

Map Canvas — Dark Mode (map tile layer only, not the app chrome)
  Dark teal/gray tile basemap (Google Maps Night mode or custom style)
  #FF3B30  (red — garbage report pins, trash icon markers — high contrast on dark map)
  #F4A261  (amber — cleanup claimed pins)
  #519A66  (green — verified/approved pins)

Solana — Wallet screen only, used sparingly
  #9945FF  (SOL amount displays)
  #14F195  (transaction confirmed amounts)

Status
  #0077B6  (World ID verified badge)
  #FF3B30  (error / reject state)
```

### Typography

```
Display / Headers:    Inter Variable (510 weight)
Body:                 Inter Variable (400 weight)
Monospace (SOL amt):  JetBrains Mono Bold  ← makes crypto amounts feel precise
Vision Transcript:    JetBrains Mono Regular  ← forensic chat log
```

OpenType features `"cv01", "ss03"` enabled globally on Inter Variable.

### Map Pin States

Map canvas is dark-mode only — high contrast red markers read clearly against the dark tile layer.

```
🔴 Garbage reported     → #FF3B30 red filled circle + white trash icon (pulsing ring on new)
🟡 Cleanup claimed      → #F4A261 amber circle + white person icon (animated pulse)
🟢 Pending verification → #519A66 green circle + white checkmark icon
✅ Verified + rewarded  → #25671E dark green + small SOL badge overlay
⚠️ Flagged by AI Vision → grayscale overlay + warning icon
```

---

## Mobile-First Design (React Native)

Every screen is designed for a hand held in portrait mode. The thumb zone rule drives every layout decision: information displays at the top, all interactive elements live in the bottom two-thirds.

---

### Navigation — Bottom Tab Bar

`expo-router` `Tabs` with custom styling. Always visible. 5 destinations:

```
┌──────┬──────┬──────┬──────┬──────┐
│  🗺️  │  🖼️  │  📷  │  ✅  │  💰  │
│ Map  │Gallery│Report│Verify│Wallet│
└──────┴──────┴──────┴──────┴──────┘
```

- **Map** — default landing screen. Profile avatar in top-right header → opens Profile (stack screen) with World ID badge, reputation, and city stats
- **Gallery** — Cloudinary-powered grid of confirmed cleanups with auto-tag filter chips
- **Report** — opens `expo-camera` full-screen immediately, no intermediate screen
- **Verify** — red badge count shows pending verifications waiting for you
- **Wallet** — SOL balance + transaction history

---

### Touch Targets

React Native's default `TouchableOpacity` often renders smaller than intended. Be explicit:

- Primary buttons: `width: '100%'`, `height: 56`, `borderRadius: 8`
- Map pins: `hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}` for 44px minimum
- Bottom nav touch area: `height: 56` per tab
- Vote buttons: `height: 80`, `width: '50%'` — impossible to miss
- Comparison slider drag handle: 56px diameter circular grip
- Never use `Text` with `onPress` — always wrap in a `Pressable`

---

### Screen-by-Screen Design

**1. Map Screen (Home)**

```
┌─────────────────────────┐
│ 🌍 Waste2Wealth    [👤] │  ← White header bar over dark map canvas, #111111 text
│                         │
│   FULL-SCREEN MAP       │  ← react-native-maps, edge-to-edge
│   (garbage pins)        │
│         🔴              │
│     🔴     🔴           │
│                         │
│                    [📷] │  ← FAB report button, 56px circle, bottom-right
│                         │
├─────────────────────────┤  ← @gorhom/bottom-sheet, two snap points
│ ▬  3 tasks near you     │  ← Drag handle
│                         │
│ [🔴 Venice Blvd · 200m] │  ← Task cards, FlatList — Cloudinary thumbnails
│ [🔴 Main St · 450m    ] │
├─────────────────────────┤
│ 🗺️  │ 🖼️ │ 📷 │ ✅3 │ 💰 │  ← Bottom tab bar
└─────────────────────────┘
```

- Bottom sheet snaps between: **peek** (handle visible, 2 cards showing) and **half** (full task list)
- `react-native-maps` renders natively — Google Maps on Android, Apple Maps on iOS
- Map pins use `react-native-reanimated` pulse animation when newly added
- Supabase Realtime updates pin states without user needing to refresh
- Profile avatar (top-right) → stack-pushes Profile screen

---

**2. Camera / Report Screen**

```
┌─────────────────────────┐
│ ✕                [flash]│  ← SafeAreaView top, translucent overlay
│                         │
│                         │
│   expo-camera           │  ← Full screen, no chrome, edge-to-edge
│   LIVE PREVIEW          │
│                         │
│   ┌─────────────────┐   │
│   │ Uploading...    │   │  ← Upload progress (Reanimated shimmer)
│   └─────────────────┘   │
│                         │
│   📍 Acquiring GPS...   │  ← GPS status (shutter locked until locked)
│         [  ⭕  ]        │  ← Shutter: 72px circle, disabled until GPS locked
└─────────────────────────┘
```

After capture:

```
┌─────────────────────────┐
│   [captured photo]      │
│                         │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓░ 94%    │  ← "Verifying with Cloudinary AI..." → "✅ Verified"
│                         │
│ Severity                │
│ ┌───────┬────────┬────┐ │
│ │ Minor │Moderate│Major│ │  ← Segmented control, full-width
│ └───────┴────────┴────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │     Submit Report   │ │  ← Primary CTA, 56px, #519A66 bg, white text
│ └─────────────────────┘ │
└─────────────────────────┘
```

- `expo-haptics.impactAsync(ImpactFeedbackStyle.Medium)` fires when GPS lock acquires
- Shutter button uses `Animated.spring` scale-down on press

---

**3. Cleanup Detail Screen — Cloudinary trust transparency surface**

```
┌─────────────────────────┐
│ ←  Cleanup #3214        │
│ Venice Blvd · Moderate  │
├─────────────────────────┤
│  ┌───────────────────┐  │
│  │ before │ after    │  │  ← ComparisonSlider — drag center handle
│  │  📸    │  📸      │  │     both at c_fill,w_800,h_600,g_auto
│  │        ‖          │  │
│  └───────────────────┘  │
│  [ Forensic mode  ⓘ ]  │  ← Toggle → e_background_removal
├─────────────────────────┤
│ AI Vision Transcript ▾  │  ← Collapsible card
│ ┌─────────────────────┐ │
│ │ Q: Is there visible │ │
│ │    garbage? → YES   │ │  ← JetBrains Mono Regular
│ │ Q: AI-generated?    │ │
│ │    → NO             │ │
│ │ Q: Garbage removed  │ │
│ │    after?  → YES    │ │
│ │ model: ai_vision_v3 │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

- Slider drag handle: `react-native-gesture-handler` PanGestureHandler over a clipped overlay (Reanimated `interpolate` for instant updates on UI thread)
- Forensic mode toggle reloads the same delivery URL with `e_background_removal` appended
- Transcript card uses `LayoutAnimation.easeInEaseOut` to expand/collapse smoothly

---

**4. Envision Clean Screen — Cloudinary generative-AI showcase**

```
┌─────────────────────────┐
│ ←  Envision Clean       │
│ Imagine this spot clean │
├─────────────┬───────────┤
│   ORIGINAL  │  ENVISION │
│   [photo]   │ [generated]│  ← Side-by-side, both expo-image
│             │           │
├─────────────┴───────────┤
│ Custom prompt           │
│ ┌─────────────────────┐ │
│ │ clean street, trees │ │  ← TextInput, multi-line
│ └─────────────────────┘ │
│ [ Regenerate ] [ Share ]│  ← Regenerate triggers new URL
└─────────────────────────┘
```

- The "Envision" image URL is constructed by `lib/cloudinary.ts:buildEnvisionURL(publicId, prompt)` — chains `e_gen_remove:prompt_(garbage;litter;trash)/e_gen_background_replace:prompt_(USER_PROMPT)/f_auto,q_auto`
- First render can take 8–15 seconds server-side; show a skeleton + "Cloudinary is rendering…" copy while loading
- Subsequent loads of the same URL hit Cloudinary's CDN cache and arrive instantly
- Share button uses `Share.share({ url })` to copy/paste the public delivery URL

---

**5. Gallery Tab — Public Cleanup Gallery (the "images at scale" centerpiece)**

```
┌─────────────────────────┐
│ Cleaned by community    │
│ 1,247 photos · 23 SOL   │  ← Stats subline pulled from Supabase aggregate
│ [Venice] [DTLA] [+more] │  ← Filter chips from e_auto_tagging
│ [Minor][Moderate][Major]│  ← Severity chips
├─────────────────────────┤
│ ┌──────┐ ┌──────┐       │
│ │ 📸   │ │ 📸   │       │  ← Masonry grid, expo-image
│ │ Ven  │ │ Main │       │     c_thumb,g_auto,w_400,h_300
│ └──────┘ └──────┘       │
│ ┌──────┐ ┌──────┐       │
│ │ 📸   │ │ 📸   │       │
│ └──────┘ └──────┘       │
└─────────────────────────┘
```

- Pre-seeded with 50+ before/after pairs from public CC0 cleanup imagery so the gallery feels like a real community feed at hackathon start
- Tap any cleanup → opens `cleanup/[id]` with the comparison slider + transcript
- Pull-to-refresh fetches new confirmed cleanups
- Empty state: friendly illustration + "Be the first to clean a spot near you"

---

**6. Verify Screen**

The signature interaction. Uses `react-native-deck-swiper` (with a `react-native-gesture-handler` fallback ready). Swipe right = approve, swipe left = reject. No learning curve.

```
┌─────────────────────────┐
│ Verify Cleanup          │
│ Venice Blvd · 200m away │
├────────────┬────────────┤
│            │            │
│   BEFORE   │   AFTER    │  ← Cloudinary g_auto thumbnails
│  [photo]   │  [photo]   │     Pressable → full-screen with pinch zoom
│            │            │
├────────────┴────────────┤
│ 📍 GPS: 48m match ✓     │
│ ⏱ 22 min ago  👥 2/7   │
├────────────┬────────────┤
│            │            │
│  ❌ Reject │ ✅ Approve  │  ← height: 80, each 50% width
│            │            │
└─────────────────────────┘
```

- Swipe right → `expo-haptics.notificationAsync(NotificationFeedbackType.Success)` → green flash
- Swipe left → `expo-haptics.notificationAsync(NotificationFeedbackType.Warning)` → red flash
- After voting: `react-native-reanimated` checkmark animation + slide to next pending task
- Photo tap → `Modal` with `react-native-image-zoom-viewer` for pinch-to-zoom

---

**7. Wallet Screen**

```
┌─────────────────────────┐
│ Wallet                  │
│                         │
│ ┌▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄┐   │  ← white card, 4px #25671E top accent bar
│ │  1.42 SOL         │   │  ← JetBrains Mono Bold, 32px, #9945FF
│ │  ≈ $21.30 USD     │   │  ← Inter Regular, 16px, #6B7280
│ │  ✓ Verified Human │   │  ← World ID badge, #0077B6
│ └───────────────────┘   │
│                         │
│ Recent Activity         │
│ ┌─────────────────────┐ │  ← #F5F5F5 card surface, light gray
│ │ +0.10 SOL  Cleanup  │ │  ← #14F195 green amount, #111111 label
│ │ Venice Blvd · 2h ago│ │  ← #6B7280 secondary text
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ +0.005 SOL Verified │ │
│ │ Main St · 5h ago    │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

- Balance card is white (`#FFFFFF`) with a subtle shadow (`elevation: 4`) and a 4px `#25671E` accent bar along the top edge — clean, premium feel in light mode
- Transaction amounts animate up with `react-native-reanimated` count-up when new SOL arrives
- Tap any transaction → opens Solana Explorer in `expo-web-browser`

---

### Gestures (react-native-gesture-handler)

| Gesture | Screen | Action |
|---------|--------|--------|
| Swipe right | Verify | Approve cleanup |
| Swipe left | Verify | Reject cleanup |
| Pinch | Verify photo | Zoom in/out |
| Drag horizontal | Cleanup detail | Move comparison slider |
| Long press map | Map | Quick-report at that location |
| Drag up | Map bottom sheet | Expand task list |
| Pull down | Task list / Gallery | Refresh |
| Tap pin | Map | Open garbage report card |
| Tap thumbnail | Gallery | Open cleanup detail |

---

### Performance

- `react-native-reanimated` for all animations — runs on UI thread, never janks
- `FlatList` with `getItemLayout` for task list and gallery — no re-renders on scroll
- Cloudinary `f_auto,q_auto` on every image — 40–60% smaller, faster loads on mobile data
- `g_auto` smart cropping pre-baked in URL — no client-side cropping work
- Generative URLs cached by Cloudinary's CDN once rendered — second view of an Envision result is instant
- Supabase Realtime for map pin updates — no polling, no unnecessary re-renders
- `expo-image` instead of `Image` — memory-efficient, disk caching, fade-in transitions

---

## Hackathon Build Plan (24–36 hours)

(Full detail in `implementationPlan.md`. Summary below.)

### Pre-Hackathon (do before it starts)

- [ ] Expo account created, `eas` CLI installed, test build on physical device
- [ ] World ID developer account → register app → get `app_id` and `action` string
- [ ] Cloudinary account → enable AI Vision + Auto Tagging + Background Removal + Generative AI add-ons → API keys saved
- [ ] Supabase project created → PostGIS extension enabled → connection string noted
- [ ] Firebase project → FCM enabled → `google-services.json` downloaded for Android, service account JSON saved for backend
- [ ] Solana devnet keypair created → airdrop 5 SOL to escrow wallet (`solana airdrop 5`)
- [ ] Google Maps API key
- [ ] `npx skills add cloudinary-devs/skills` in project root → confirm three skills are available to Claude Code

### Hours 0–6: Foundation — Auth + Map
**Milestone:** Hold phone, World ID verified, see a map pin. ✓

### Hours 6–12: Camera + Cloudinary Upload + AI Vision
**Milestone:** Take photo on Phone A → pin appears on map on Phone B → Phone B gets push notification. ✓

### Hours 12–18: Cleanup Flow + Consensus
**Milestone:** Phone A cleans. Three phones vote. Consensus reached. Pin turns green. ✓

### Hours 18–24: Solana Rewards
**Milestone:** Vote confirmed → balance animates up → Solana Explorer shows tx hash. ✓

### Hours 24–30: Cloudinary Mobile Depth (the centerpiece phase)
**Milestone:** Cleanup detail screen shows comparison slider + AI Vision transcript. Envision Clean renders a generative cleaning preview. Gallery tab populated with 50+ smart-cropped thumbnails and tag filter chips. ✓

### Hours 30–36: Polish + Demo Hardening
**Milestone:** Full flow runs 3× consecutively without error. Demo script < 2 minutes. ✓

---

## The Demo (2 Minutes)

**Setup:** Two phones on stage (Android primary, iPhone secondary). Map pre-seeded with 5 garbage pins at the venue. Gallery pre-seeded with 50+ confirmed cleanups so the social-good-at-scale story lands the moment a judge swipes to that tab.

**0:00–0:20**
Open app on Phone 1 (Android). World ID verified badge in profile pop-over. SOL balance: `0.42 SOL`. Map opens — 5 garbage pins visible around the venue. Native Google Maps rendering, smooth and responsive.

**0:20–0:40**
Phone 1 taps the nearest pin. Garbage photo + location card slides up. Taps "I'll clean this." GPS lock: `📍 Confirmed — 23m from location`. *(Walk 5 feet to the staged location.)*

**0:40–1:00**
Phone 1 opens camera. Points at the "cleaned" area. Capture. Status pill: *"Verifying with Cloudinary AI..."* → *"✅ Verified"* a moment later. Phone vibrates (haptic). Taps submit. Status updates to "Pending Verification."

**1:00–1:20**
Phone 2 (iPhone) receives FCM push notification: *"A cleanup needs verification — 30m away."* Tap → opens directly to the verify screen. Before/after photos side-by-side. Swipe right → haptic success pulse → `✅ Approved`. *(Two planted audience phones vote simultaneously.)* Consensus: 3/3. Pin turns green in real time on both phones.

**1:20–1:40**
Back to Phone 1. Wallet screen. Balance animates up: `+0.10 SOL`. Tap the transaction → Solana Explorer opens showing the real devnet transaction hash. Phone 2's wallet: `+0.005 SOL · Verified a cleanup.`

**1:40–2:00**
Phone 1 jumps to Cleanup Detail for the just-verified cleanup. Drag the comparison slider — before/after pivot smoothly under the thumb. Tap "AI Vision Transcript" — the prompts and answers expand: *"Is there visible garbage? → YES" / "Garbage removed in after photo? → YES" / model: ai_vision_v3*. Swipe to the Gallery tab — judge sees 50+ before/after pairs, smart-cropped, instantly readable. Tap Envision Clean on a different open report — Cloudinary's generative AI renders the cleaned version side-by-side.

**The line to end on:**
*"Every pin that turns green is a piece of real-world garbage cleaned by a real, verified human — Cloudinary AI confirms it, the community votes on it, Solana pays for it."*

---

## Why This Wins

**1. The World ID integration is architecturally necessary, not decorative.**
Every hackathon project that touches rewards gets asked: *"What stops bots from gaming this?"* Every other team fumbles this answer. You have cryptographic proof of humanity, enforced at the protocol level. That's a complete answer.

**2. The Cloudinary integration is the trust AND creative engine — at image scale.**
AI Vision is a verification layer with a published reasoning trace. Generative AI is a civic vision tool. Smart cropping holds the comparison slider together. Auto-tagging drives the gallery. Background removal enables forensic mode. Five distinct capability surfaces, all in one mobile app. The Gallery tab pre-seeds 50+ before/after pairs so the "images at scale" story is visible the moment a judge picks up the phone.

**3. The demo is physical.**
Garbage gets cleaned in front of judges. A map pin changes color. Money moves. Native haptic feedback fires. No judge forgets a demo where something real happened in the room.

**4. The economics are designed, not bolted on.**
Reporter + Cleaner + Verifier each have aligned incentives. Over-reward cleaners → everyone cleans but nobody reports. Over-reward reporters → spam posts. The balance is intentional, and judges who ask will get a coherent answer.

**5. React Native makes the demo undeniably feel native.**
Native camera, native GPS, native haptics, native maps. Judges pick up the phone and it behaves like a real product. No browser permission prompts, no `getUserMedia` lag, no Web Push flakiness on iPhone.

**6. It scales to any city instantly.**
No municipality buy-in, no regulatory approval, no partnerships needed. Anyone downloads the app and the network bootstraps itself.

**7. The 2026 moment.**
AI-generated content is the default threat model for any trust system in 2026. Cloudinary AI Vision asks the synthetic-image question on every upload — and surfaces the answer in-app for the user to see. Trust through transparency, not opacity.

---

## Potential Judge Questions + Answers

**Q: What stops someone from dropping their own trash, reporting it, cleaning it themselves, and collecting the reward?**
A: World ID = one account per person. The reporter and cleaner cannot be the same account. And the reporter earns only when someone *else* cleans it — they have zero control over the outcome.

**Q: What if the Solana rewards are too small to motivate real behavior?**
A: 0.10 SOL ≈ $15 in LA today. The model works at any price — the reward size is a tuning parameter. At scale, waste management companies, municipalities, or ESG-motivated sponsors fund the reward pool.

**Q: What happens if consensus fails — a 3–4 split?**
A: Cleanup enters "dispute" state. A second round of 5 high-reputation users resolves it. If still unresolved after 24h, no reward is paid and the report reopens for another cleaner.

**Q: Why not just use a centralized database without blockchain?**
A: You could, and it would work. The reason for Solana is trustlessness — no company controls when rewards are paid or can change the rules. Users can verify the escrow on-chain. That's the promise we're making.

**Q: Why not just pay cash via Venmo or PayPal?**
A: Two reasons. KYC requirements make identity verification for fiat payments legally complex and centralized. Crypto with World ID gives you sybil resistance + instant global transfer + transparent on-chain audit trail — none of which Venmo offers.

**Q: The Cloudinary card says "web app." Why is this a mobile app?**
A: The card lists two eligible artifacts — the React AI Starter Kit *or* the Skills Pack. We chose the Skills Pack because it's runtime-agnostic, and we chose React Native because every Cloudinary capability we exercise (AI Vision, generative transforms, smart cropping, background removal, auto-tagging) is exposed to mobile via the same delivery URLs. The mobile-first form factor is also where citizen capture actually happens — at the curb, in the wild, with a phone in hand. The judges' stated taste for "social good apps that work with images at scale" maps directly onto mobile capture/upload — and our Gallery tab pre-seeds 50+ before/after pairs to make that scale visible immediately.

**Q: Why no on-device AI / ONNX model?**
A: We considered it. It would have shipped 10MB into the bundle, added 4–8 hours of debugging, locked us out of Expo Go, and still wouldn't have answered the actual trust question (*"is this photo of garbage real?"*). Cloudinary's hosted AI Vision answers it in plain English and ships the reasoning to the client as a transcript. Better trust story, smaller app, more time to polish.

---

## Competitive Landscape

| App | What they do | What they're missing |
|-----|-------------|---------------------|
| SeeClickFix | Report issues to city | No rewards, <5% resolution rate |
| Litterati | Log litter data | No rewards, no cleanup coordination |
| RecycleNation | Find recycling centers | No community action |
| Plastic Bank | Plastic for cash (developing world) | Centralized, no real-time coordination |
| **Waste2Wealth** | Report + Clean + Verify + Earn | — |

No existing app combines real-time coordination + crypto rewards + proof-of-human + AI verification. This is a genuinely new category.

---

*Built for LA Hacks 2026 · Stack: React Native (Expo) + Python FastAPI + Cloudinary AI Vision · Track: Sustain the Spark · Company Tracks: World U · Cloudinary · Solana · Arista Networks · Figma Make · Gemma 4*
