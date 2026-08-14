# Expenn — Mobile

Expo SDK 54 React Native app for travelers. Authenticates and fetches all data from the [Expenn .NET API](../api/README.md).

## Stack

| Feature | Library |
|---|---|
| Framework | Expo SDK 54 · Expo Router v6 |
| API | `lib/api.ts` → Expenn .NET REST API |
| Auth | JWT stored in `expo-secure-store` (native) / `localStorage` (web) |
| OIDC | `expo-web-browser` in-app browser for SSO flows |
| Camera | `expo-camera` (receipt capture) |
| Fonts | Inter via `expo-font` |
| Icons | `lucide-react-native` |

## Setup

```bash
pnpm install
pnpm start
```

Set `EXPO_PUBLIC_API_URL` in your shell or CI environment when the default API URL is not reachable.

> **Physical device:** use your machine's LAN IP instead of `localhost`:  
> `EXPO_PUBLIC_API_URL=http://192.168.1.42:5000`

```bash
npx expo run:ios      # native iOS build
npx expo run:android  # native Android build
npx tsc --noEmit      # TypeScript check
```

## Environment variables

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | Base URL of the .NET API. Bundled into the app at build time. |

## CI/CD

Native builds — no EAS Build/Submit. Every workflow runs `expo prebuild` fresh (native `ios/`/
`android/` projects are gitignored, never committed) and signs with credentials decoded from
GitHub Secrets and orchestrated by Fastlane (`fastlane/Fastfile`, without `match`).

| Workflow | Trigger | What it does |
|---|---|---|
| `mobile-android-ci.yml` | PR / push to `dev` (path `mobile/**`) | Type-check → prebuild → signed internal APK (`fastlane android android_internal`) → workflow artifact |
| `mobile-ios-ci.yml` | PR / push to `dev` (path `mobile/**`) | Type-check → prebuild → signed Ad Hoc IPA (`fastlane ios ios_adhoc`) → workflow artifact |
| `mobile-android-release.yml` | push to `main` | Prebuild → signed release AAB → `fastlane android android_release` uploads to Play Console |
| `mobile-ios-release.yml` | push to `main` | Prebuild → signed release IPA → `fastlane ios ios_release` uploads to TestFlight |

### ⚠️ Known blocker: placeholder app icons

`assets/icon.png`, `assets/adaptive-icon.png`, and `assets/splash-icon.png` are all 1×1 pixel
stub images today. `expo prebuild --platform android` **fails outright** trying to process the
adaptive icon in this state (confirmed locally) — real icon assets (1024×1024 for `icon.png`/
`adaptive-icon.png` at minimum) must be added before `mobile-android-ci.yml` or
`mobile-android-release.yml` can pass. iOS prebuild currently tolerates the placeholders and
succeeds, but shipping 1×1 icons would fail App Store review regardless.

### Required GitHub Secrets

I cannot generate any of these — they come from your own Apple Developer and Google Play Console
accounts. Nothing here should ever be committed to the repo.

| Secret | Used by | What it is |
|---|---|---|
| `ANDROID_INTERNAL_KEYSTORE_BASE64` | Android CI | `base64 -i internal.keystore` output of a **dev-only** keystore. Generate locally: `keytool -genkeypair -v -keystore internal.keystore -alias internal -keyalg RSA -keysize 2048 -validity 10000` |
| `ANDROID_INTERNAL_KEYSTORE_PASSWORD` | Android CI | Password set when creating the keystore above |
| `ANDROID_INTERNAL_KEY_ALIAS` | Android CI | `-alias` value used above (e.g. `internal`) |
| `ANDROID_INTERNAL_KEY_PASSWORD` | Android CI | Key password (often same as keystore password) |
| `ANDROID_RELEASE_KEYSTORE_BASE64` | Android Release | Same as above but the **permanent production signing key** — back this up yourself outside GitHub, it cannot be regenerated once Play Store builds are signed with it |
| `ANDROID_RELEASE_KEYSTORE_PASSWORD` / `ANDROID_RELEASE_KEY_ALIAS` / `ANDROID_RELEASE_KEY_PASSWORD` | Android Release | Same shape as the internal ones, for the release keystore |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Android Release | Play Console → Setup → API access → service account JSON key (needs Release Manager permission) |
| `IOS_ADHOC_CERTIFICATE_P12_BASE64` / `IOS_ADHOC_CERTIFICATE_PASSWORD` | iOS CI | A `.p12` export of an Apple **Development** or **Distribution** certificate, base64-encoded |
| `IOS_ADHOC_PROVISIONING_PROFILE_BASE64` | iOS CI | An **Ad Hoc** `.mobileprovision` from the Apple Developer portal — the test devices you want to install on must be registered as UDIDs in this profile *before* it's generated |
| `IOS_DISTRIBUTION_CERTIFICATE_P12_BASE64` / `IOS_DISTRIBUTION_CERTIFICATE_PASSWORD` | iOS Release | A `.p12` export of an Apple **Distribution** certificate |
| `IOS_APPSTORE_PROVISIONING_PROFILE_BASE64` | iOS Release | An **App Store** `.mobileprovision` from the Apple Developer portal |
| `APPSTORE_CONNECT_API_KEY_ID` / `APPSTORE_CONNECT_API_ISSUER_ID` / `APPSTORE_CONNECT_API_KEY_BASE64` | iOS Release | App Store Connect → Users and Access → Integrations → API Keys. `_KEY_BASE64` is the base64 of the downloaded `.p8` file |
| `KEYCHAIN_PASSWORD` | iOS CI/Release | Any password you choose — used only to lock/unlock the temporary CI keychain Fastlane creates per run |

### Required GitHub repository Variables (not secret)

| Variable | Default if unset | Purpose |
|---|---|---|
| `DEV_API_URL` | `http://localhost:5000` | `EXPO_PUBLIC_API_URL` baked into dev/CI builds |
| `PROD_API_URL` | `https://api.expenn.com` | `EXPO_PUBLIC_API_URL` baked into release builds |
| `IOS_BUNDLE_IDENTIFIER` | `com.expenn.traveler` | Must match `app.json`'s `ios.bundleIdentifier` |
| `ANDROID_PACKAGE_NAME` | `com.expenn.traveler` | Must match `app.json`'s `android.package` |
| `APPLE_TEAM_ID` | — | Apple Developer Team ID (Membership page) |
| `IOS_ADHOC_PROFILE_NAME` | — | The exact name you gave the Ad Hoc profile when creating it |
| `IOS_APPSTORE_PROFILE_NAME` | — | The exact name you gave the App Store profile when creating it |
| `GOOGLE_PLAY_TRACK` | `internal` | Play Console track `android_release` publishes to |

### What you still need to do before this runs end-to-end

1. Replace the placeholder icons (above).
2. Generate both Android keystores locally (command above) and add all four secrets per keystore.
3. In Apple Developer: create a Distribution certificate, an Ad Hoc profile (with test device UDIDs
   registered) and an App Store profile, and an App Store Connect API key.
4. In Play Console: create the app listing (first upload to a new app still needs to happen through
   the console) and a service account with API access.
5. Add every secret/variable above under **Settings → Secrets and variables → Actions**.
6. Trigger `mobile-android-ci.yml`/`mobile-ios-ci.yml` via `workflow_dispatch` first and check the
   Actions log before relying on the automatic PR/`dev` triggers — same for the release workflows
   before merging to `main`, since those hit real store APIs.

I haven't been able to run an actual signed build myself — there's no macOS/Xcode or real Apple/
Google credentials in this environment. What's verified: `expo prebuild` succeeds for iOS and
correctly resolves `com.expenn.traveler` everywhere, `expo prebuild` for Android currently fails on
the placeholder icon (see above), the version-bump script, and all four workflow YAML files parse
correctly. The Fastlane lanes themselves are unverified beyond Ruby syntax checking.

## Auth flows

The login screen (`app/login.tsx`) offers three tabs plus an optional SSO button:

### Email OTP (default tab)
1. User enters email → `POST /api/auth/send-otp`
2. User enters 6-digit code → `POST /api/auth/verify-otp`
3. JWT stored in SecureStore and sent as `Authorization: Bearer` on every request

### Password
- `POST /api/auth/login` with `{ email, password }`

### Active Directory
- `POST /api/auth/ad/login` with `{ username, password }` — accepts `DOMAIN\user` or `user@corp.com`

### SSO / OIDC
- Shown automatically when `GET /api/auth/oidc/info` returns `{ enabled: true }`
- Opens an in-app browser via `expo-web-browser`
- On success, the .NET API redirects to `expenn://auth/oidc-callback?token=...`
- The deep-link handler stores the JWT and fetches `/api/auth/me`

All flows call `finish()` in `AuthContext`, which stores the session and user object.

## API client

```ts
import { trips, expenses, auth, documents } from '@/lib/api';

// List trips assigned to the current user
const myTrips = await trips.list({ mine: true });

// Submit an expense for review
await expenses.submit(expenseId);

// Upload a receipt photo
await uploadFile('/api/storage/upload', fileUri, 'receipt.jpg', 'image/jpeg');
```

The `apiFetch<T>()` helper in `lib/api.ts` reads the stored session token, sets `Authorization: Bearer`, and handles `ApiError` (with `status: number`) on failure.

## Screens

| Route | Description |
|---|---|
| `/login` | Multi-tab auth — OTP · Password · Active Directory · SSO |
| `/(tabs)` | Home — active trip hero, recent expenses, quick actions |
| `/(tabs)/trips` | Trip list with search and status filters |
| `/(tabs)/scan` | Capture a receipt — camera, expense form, trip picker |
| `/(tabs)/expenses` | Full expense list with filters and submit actions |
| `/(tabs)/documents` | Document vault — folders and document metadata |
| `/(tabs)/settings` | Profile, workspace info, dark mode, sign out |
| `/trips/[id]` | Trip detail — stats, progress, expense breakdown |
| `/document/[id]` | Document detail |

## Responsive design

All sizing goes through `constants/theme.ts`:

| Helper | Behaviour |
|---|---|
| `scale(n)` | Linear scale from 390px base (iPhone 14) |
| `ms(n)` | Moderate font scale — 35% of `scale()` — gentler growth |
| `TAB_BAR_H` | Shared scroll-view bottom padding that clears the tab bar |
| `isTablet` | `true` when screen width ≥ 600px |
