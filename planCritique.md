# Waste2Wealth — Plan Risk Register

> Pre-build review of `implementationPlan.md` and `Waste2Wealth.md` after the **mobile-only / Cloudinary-Skills-Pack rewrite**. Critical bugs from the prior critique are now baked into the plan as fixes. This doc tracks what's resolved, what's still risky, and what to watch during the build.

---

## Resolved (no longer issues — verify before Phase 1)

These were CRITICAL findings in the prior critique. The current `implementationPlan.md` already incorporates the fixes — listed here so each can be sanity-checked once code starts landing.

| # | Original issue | Fix in current plan | Where to verify |
|---|----------------|---------------------|-----------------|
| 1 | `generateVerificationRequest` doesn't exist in `@worldcoin/idkit-core` | **Partially resolved.** Plan no longer references that function. New approach is the IDKit Bridge pattern — install `@worldcoin/idkit-core`, call its session helper, open the resulting URL via `expo-linking`, poll for proof. The plan also explicitly marks this as a Phase 0 verification step (must round-trip on a physical device before Phase 1 starts) because the SDK's helper names have changed across versions and we should not hardcode them. **Still risky — see item L below.** | `lib/worldid.ts` snippet in Phase 1.7; Phase 0.4 |
| 2 | `pip install worldcoin` doesn't exist | Replaced with direct `httpx` call to `POST https://developer.worldcoin.org/api/v1/verify/{app_id}` | `backend/routes/users.py` in Phase 1.8 |
| 3 | Solana Python SDK uses old API (`solana.keypair`, `spl.token.transfer` for SOL) | Rewritten with modern `solders` 0.30+ (verified against the solders docs): `solders.system_program.transfer({...})` takes a **dict**, not `TransferParams`; `Message.new_with_blockhash([ix], payer, blockhash)` builds the message; `VersionedTransaction(msg, [signer])` is the recommended transaction type. Async client via `solana.rpc.async_api.AsyncClient.send_transaction(tx)`. | `backend/services/solana.py` in Phase 4.2 |
| 4 | ONNX EfficientNet "AI-detection" model wasn't a real downloadable model | **Cut.** AI-generated detection is now Cloudinary AI Vision Moderation (cloud-side). Removes 4–8h of debugging and keeps the project on Expo Go. | Phase 0.10 removed; Phase 2 explicitly uses Vision instead |
| 5 | FCM geofence query checked the same point against itself; users had no `last_location` column | Schema now includes `users.last_location GEOGRAPHY(POINT,4326)` with a GIST index. Map screen pushes location updates via `POST /users/location`. Geofence query correctly compares each user's `last_location` to the report's location, with a fallback to broadcast if `last_location` is null. | `backend/services/geofence.py` in Phase 2.5; schema in Phase 1.9 |
| 6 | World U vs. Solana track conflict | Decision recorded: off-chain World ID argument (non-mini-app IDKit path, backend nullifier check) keeps Solana prize eligibility. World Chain swap is the documented fallback. | Pre-build decisions table in plan |
| 7 | `module:react-native-dotenv` conflicts with Expo native env handling | Removed from `babel.config.js`; plan explicitly forbids re-adding it | Phase 1.3 babel config |
| 8 | `decodeBase64ToFloat32`, `DARK_MAP_STYLE`, `pendingCount` were undefined references | Two of them obsolete (ONNX cut). `DARK_MAP_STYLE` now has a defined source (`mapstyle.withgoogle.com` JSON in `constants/mapStyle.ts`). `pendingCount` now sourced from a Supabase query in `(tabs)/_layout.tsx`. | Phase 1.6 / 1.10 |
| 9 | `cloudinary-react-native` deep-import path | Replaced with public API (verified against the official RN integration docs): `import { upload } from 'cloudinary-react-native'`, called as `await upload(cld, { file, options, callback })`. Also: `eager_async: true` so the upload doesn't block on AI moderation. The Cloudinary AI Vision REST endpoint path `POST /v2/analysis/<cloud>/analyze/ai_vision_moderation` is also confirmed correct. | `lib/cloudinary.ts` in Phase 2.2 |
| 10 | `eas build` queue would kill timeline | Plan defaults to Expo Go for development. EAS only used as a last-resort `--profile preview` build for the demo if a native module forces it. With ONNX cut, no native module forces it. | Phase 0.1 + 6.x non-negotiables |
| 11 | Supabase Realtime needs RLS policies | Schema block in Phase 1.9 explicitly enables RLS and adds `public read` policies for `reports`, `cleanups`, `votes`, `transactions`. Without these, Realtime is silent. | Phase 1.9 SQL block |
| 12 | GPS 50m threshold unreliable indoors | Plan explicitly uses **200m** for the demo, with a code comment to tighten in production. | Phase 3.1 claim endpoint |

---

## Still Risky — things to watch during the build

### HIGH

**A. Cloudinary AI Vision quota burn-through during demo prep.**
The free trial covers a finite number of calls. We do 2–3 calls per report and 1 per cleanup. If 10 dev iterations + 50 seed cleanups + the live demo all exercise Vision, the quota could be exhausted by Saturday morning.

*Mitigation:*
- Run all Vision calls only in **production** path during dev — mock the Vision response in unit tests
- For the 50 seed cleanups, hand-craft `vision_transcript` JSONB in the seed script instead of running them through the live API
- Keep a backup Cloudinary account ready

**L. IDKit-Core bridge helper API has churned across versions.**
The plan no longer hardcodes a `https://world.org/verify?...` URL — that earlier guess could not be confirmed against primary docs. The current plan uses the IDKit Bridge pattern: install `@worldcoin/idkit-core`, call its session helper, open the resulting URL with `expo-linking`, poll for proof. **But the exact helper name has changed multiple times** (`bridge_url`, `createSession`, `pollProof`, etc. depending on the package version pinned). The plan explicitly marks this as a Phase 0 verification step.

*Mitigation:*
- Phase 0.4 now requires a real-device round-trip against staging `app_id` BEFORE Phase 1 starts
- If the bridge helper isn't usable, fall back to either (a) custom-scheme deep link `worldcoin://verify?...` with `return_to=waste2wealth://worldid`, or (b) in-app QR code scanned by World App
- Worst-case fallback: integrate `@worldcoin/idkit` (the React web component) inside a `WebView` — works in RN but adds a dependency. ~2 hours of work.

**B. World App availability on iPhone for the demo.**
Both demo phones must have World App installed and a separate orb-verified credential. If the App Store review on either World App account is in any kind of moderation hold, the demo doesn't work.

*Mitigation:*
- Verify both phones can complete a full World ID flow at least 12 hours before demo
- Have a third phone pre-loaded as backup
- If World App is broken on iOS demo phone, swap to a second Android device

**C. Cloudinary Skills Pack `cloudinary-react` skill is web-leaning.**
The skill targets the web React SDK and `<CldImage>`. We use plain delivery URLs in RN. If the skill insists on suggesting `<CldImage>` or `next-cloudinary` patterns, the dev workflow drifts toward web idioms.

*Mitigation:*
- Use `cloudinary-docs` and `cloudinary-transformations` as the primary skills during development
- Cite `cloudinary-react` for *patterns* (folder structure, error handling) only — never copy code from it directly into RN files
- Document in the Devpost write-up which skill produced which code path

### MEDIUM

**D. `react-native-deck-swiper` maintenance status.**
Sporadic releases, occasional RN version compatibility issues. If it breaks under RN 0.74+, we burn 2 hours debugging.

*Mitigation:* the plan already names a fallback — hand-rolled swipe via `react-native-gesture-handler` PanGestureHandler + Reanimated. ~2 hours and more reliable. Don't sink more than 30 min into deck-swiper before bailing.

**E. Cloudinary generative AI render time (~8–15s).**
Envision Clean is the most visually impressive feature, but the first render is slow. If the demo hits a cold cache, the judge stares at a skeleton for 15 seconds.

*Mitigation:*
- Pre-warm 5–10 envision URLs before the demo (each one cached forever once generated)
- Have at least one envision result that's known-cached and demo from that report
- If demo Cloudinary quota is healthy, render the gallery's seed envisions ahead of time too

**F. iOS deep link return from World App.**
iOS sometimes drops query params on universal-link returns if the app was backgrounded for too long. The proof might come back as `waste2wealth://worldid` with no params.

*Mitigation:*
- The `verifyWithWorldID` function rejects after 120s — surface a user-friendly "Please retry" toast
- Test the World App → app return on both iOS 17 and iOS 18 before demo
- Have `worldcoin://verify` (custom-scheme) as a fallback URL if universal links fail

**G. Solana devnet flakiness.**
Devnet is occasionally slow or rejects transactions during high load. A 0.10 SOL transfer can take 30+ seconds.

*Mitigation:*
- Test escrow → recipient transfer end-to-end the morning of the demo
- Pre-fund the demo wallets with ~0.5 SOL each so the demo doesn't depend on the live transfer for the visible balance
- If devnet rejects, fall back to mocking the tx hash in the transactions table — keeps the wallet UX flow visible to the judge even if the chain is sad

**H. Supabase Realtime missed events on RLS misconfiguration.**
If the RLS `public read` policies are misconfigured, Realtime subscribes but receives no data. Map pins look frozen.

*Mitigation:*
- Phase 1.9 includes the explicit `CREATE POLICY` block — run it verbatim
- After Phase 1, sanity check: open the app on Phone B, insert a report manually via SQL editor on the laptop, confirm the pin appears on Phone B within 2 seconds
- If Realtime is silent, check the Supabase dashboard's "Realtime" log — it tells you which policy is blocking

### LOW

**I. Inter Variable + OpenType features on Android.**
Android sometimes ignores `fontFeatureSettings` even with the variable font installed. The fallback (regular Inter without `cv01/ss03`) is still readable; it just loses the geometric character.

*Mitigation:* test on Android on Saturday morning. If it's flagrant, swap to Inter + `Inter-Bold` static fonts via `expo-font`. Cosmetic, not blocking.

**J. Gemma 4 severity tagging returns invalid JSON sometimes.**
Gemini 2.0 Flash occasionally wraps JSON in code fences or adds explanation. The plan strips backticks and a `json\n` prefix, but edge cases will slip through.

*Mitigation:* the tagging is non-blocking — failure leaves `severity` at the user's manual selection. Acceptable. Don't gate anything on Gemma's output.

**K. Pre-seed gallery images.**
If we use unattributed cleanup photos from random sources, that's a copyright risk in a public Devpost submission.

*Mitigation:* use Unsplash CC0 / Pexels / Cloudinary's own demo assets only. Cite the source on the Devpost page.

---

## Pre-Build Verification Checklist (do once before Phase 1)

- [ ] `npx skills add cloudinary-devs/skills` succeeds; three skills visible to Claude Code
- [ ] World App on demo Phone 1 can verify against the staging `app_id` end-to-end
- [ ] World App on demo Phone 2 can verify with a *different* World ID
- [ ] Cloudinary AI Vision add-on enabled; one test moderation call returns successfully
- [ ] Cloudinary Generative AI add-on enabled; one `e_gen_remove` test URL returns an image
- [ ] Supabase project provisioned with PostGIS; `SELECT PostGIS_version()` succeeds
- [ ] Solana CLI installed; `solana balance <ESCROW>` returns ≥5 SOL on devnet
- [ ] FCM Android `google-services.json` and iOS `GoogleService-Info.plist` in repo root
- [ ] Both demo phones can install Expo Go and run a "hello world" Expo project
- [ ] Inter Variable and JetBrains Mono Bold TTFs in `assets/fonts/`
- [ ] Map renders with the dark JSON style on a physical device

---

## What's Good (keep as-is)

- Phase milestone structure — don't start next phase until milestone passes on device ✓
- Cut list priority order is correct ✓
- Design token system is consistent and mobile-first ✓
- Supabase table schema is well-designed (now with `last_location` and `cloudinary_tags`) ✓
- Demo script is tight and realistic — under 2 minutes ✓
- Solana front-end code (`@solana/web3.js` + polyfills in `index.js`) is correct ✓
- Cloudinary URL builders centralized in `lib/cloudinary.ts` so changes don't sprawl ✓
- 2-hour claim expiry background task — judges will ask about this, good detail ✓
- The cut list exists at all — rare and smart ✓
- Mobile-only commitment is now reflected end-to-end — no half-finished web companion to maintain ✓

---

## When to Update This Doc

- After Phase 1 completes on device — confirm resolved items 7, 8, 11 actually work
- After the first Cloudinary AI Vision call returns successfully — confirm item A's quota is healthy
- After the first World ID round-trip — confirm item F (deep link return) on both iOS and Android
- If any HIGH or MEDIUM risk fires during the build — record the actual mitigation that was applied and what the judge-facing story now is
