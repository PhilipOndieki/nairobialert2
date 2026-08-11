# NairobiAlert — Technical Documentation

> **Scope.** `README.md` at the repo root is the feature-level product tour. This
> document is the engineering reference: how the code is actually wired
> together, the exact data model, the algorithms, the integration contracts,
> and — importantly — where the implementation diverges from what's described
> elsewhere. Read this before modifying `client/src/firebase/*`, security
> rules, or the dispatch/report/donation flows.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Repository Layout](#2-repository-layout)
3. [Application Bootstrap & Routing](#3-application-bootstrap--routing)
4. [State Management Pattern](#4-state-management-pattern)
5. [Firestore Data Model](#5-firestore-data-model)
6. [Team Dispatch System](#6-team-dispatch-system)
7. [Firestore Security Rules](#7-firestore-security-rules)
8. [Core Algorithms](#8-core-algorithms)
9. [Third-Party Integrations](#9-third-party-integrations)
10. [PWA & Service Worker](#10-pwa--service-worker)
11. [Build, CI/CD & Deployment](#11-build-cicd--deployment)
12. [Local Development](#12-local-development)
13. [Known Gaps & Technical Debt](#13-known-gaps--technical-debt)
14. [Extending the System](#14-extending-the-system)

---

## 1. System Architecture

NairobiAlert is a **client-only SPA** — there is no application server. All
business logic lives in the React client; the only server-side surface is
Firestore Security Rules (declarative, not procedural) and an as-yet-unused
Cloud Functions codebase (see [§13](#13-known-gaps--technical-debt)).

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser (React 18 SPA, code-split via React.lazy)               │
│                                                                    │
│   AuthProvider (React Context, wraps entire router)                │
│     └── RouterProvider (react-router-dom v6, createBrowserRouter)  │
│           ├── PublicLayout   → Home · Map · Report · About         │
│           │     + AIChatbot (floating, all public pages)           │
│           │     + DonationModal (triggered from Navbar/Footer)     │
│           └── ProtectedRoute → AdminLayout → Dashboard · Incidents │
│                                              · Teams · Shelters    │
└───────────────┬─────────────────────┬──────────────────┬─────────┘
                │ firebase/* SDK       │ fetch()          │ fetch()
                ▼                     ▼                  ▼
        ┌───────────────┐   ┌─────────────────┐  ┌──────────────────┐
        │ Firestore      │   │ Google Gemini   │  │ Paystack inline.js│
        │ (onSnapshot,   │   │ Flash API       │  │ + Nominatim       │
        │  IndexedDB     │   │ (@google/       │  │ (reverse geocode) │
        │  persistence)  │   │  generative-ai) │  │ + CartoDB tiles   │
        └───────────────┘   └─────────────────┘  └──────────────────┘
                │
                ▼
        ┌───────────────────────┐
        │ Firebase Auth          │  (admin email/password only —
        │ (email/password)       │   no public sign-up)
        └───────────────────────┘
```

Every read the UI performs is a live Firestore `onSnapshot` subscription —
there are no one-shot `getDocs()` calls anywhere in `src/firebase/`. This is
the single most important architectural fact about the codebase: **all
cross-user coordination (admin verifies → public map updates) happens
implicitly through Firestore's real-time listeners, with no polling and no
custom pub/sub layer.**

---

## 2. Repository Layout

```
nairobialert2/
├── .github/workflows/nairobialert-ci-cd.yml   # CI build + deploy notification
├── README.md                                   # Feature tour (product-level)
├── docs/TECHNICAL_DOCUMENTATION.md             # This file (engineering-level)
└── client/                                     # Everything else lives here
    ├── src/
    │   ├── firebase/           # Data-access layer — see §4
    │   │   ├── config.js       # App init, offline persistence
    │   │   ├── incidents.js    # Incident CRUD + team dispatch batches
    │   │   ├── teams.js        # Team CRUD + dispatch-related subscriptions
    │   │   ├── shelters.js     # Shelter CRUD
    │   │   └── zones.js        # Zone CRUD
    │   ├── hooks/               # React hooks wrapping firebase/* subscriptions
    │   │   ├── useAuth.jsx      # AuthContext + login/logout
    │   │   ├── useIncidents.js  # useOpenIncidents, useAllIncidents, etc.
    │   │   └── useZones.js
    │   ├── layouts/
    │   │   ├── PublicLayout.jsx # Navbar + Outlet + Footer + Chatbot + Modal
    │   │   └── AdminLayout.jsx  # Sidebar shell for /admin/*
    │   ├── pages/
    │   │   ├── Home.jsx, Map.jsx, Report.jsx, About.jsx
    │   │   └── admin/Dashboard.jsx, Incidents.jsx, Teams.jsx, Shelters.jsx, Login.jsx
    │   ├── components/
    │   │   ├── AIChatbot.jsx, DonationModal.jsx
    │   │   ├── Navbar.jsx, Footer.jsx, ProtectedRoute.jsx
    │   │   ├── StatusBadge.jsx  # Central color-map for all badge variants
    │   │   ├── IncidentCard.jsx, ZoneCard.jsx
    │   ├── utils/paystack.js    # Paystack popup + reference generation
    │   ├── App.jsx               # Router definition
    │   └── main.jsx               # React root + Vercel Analytics
    ├── functions/                # Firebase Cloud Functions — scaffold only, see §13
    │   └── index.js
    ├── public/
    │   ├── manifest.json, sw.js  # PWA manifest + service worker
    │   └── favicon.svg
    ├── firestore.rules           # Declarative security model — see §7
    ├── firestore.indexes.json    # Empty — no composite indexes defined
    ├── firebase.json             # Firestore + Functions deploy config
    ├── vite.config.js            # Build config, manual chunking
    └── .env.example
```

---

## 3. Application Bootstrap & Routing

`main.jsx` mounts `<App />` and initializes `@vercel/analytics`. `App.jsx`
builds a single `createBrowserRouter` tree with two independent branches:

| Branch | Wrapper | Notes |
|---|---|---|
| Public | `<PublicLayout />` | `/`, `/map`, `/report`, `/about`, `*` (404) |
| Admin login | none (standalone) | `/admin/login` — deliberately outside `AdminLayout` so it renders as a centered card, not inside the sidebar shell |
| Admin (protected) | `<ProtectedRoute><AdminLayout /></ProtectedRoute>` | `/admin/dashboard`, `/admin/incidents`, `/admin/teams`, `/admin/shelters` |

Every page component is `React.lazy`-loaded and wrapped in `<Suspense
fallback={<PageLoader />}>` individually (not once at the router root) — this
means navigating between two admin pages still triggers `PageLoader` on each
chunk fetch, by design, so the loading state is always visible.

`ProtectedRoute` (`components/ProtectedRoute.jsx`) reads `useAuth()`:
- while `loading` is true, it renders a spinner (not `children`) — this
  avoids a flash of the login redirect while Firebase Auth is still
  resolving persisted session state on page load
- if `!user`, it issues `<Navigate to="/admin/login" state={{ from:
  location }} replace />` so `Login.jsx` can redirect back after auth

---

## 4. State Management Pattern

There is no Redux/Zustand/Context-based global store for domain data. The
pattern used everywhere is:

```
firebase/<domain>.js          hooks/use<Domain>.js         Component
──────────────────────         ─────────────────────        ──────────
subscribeTo<X>(onData, onErr)  useEffect(() => {              const { data, loading, error }
  → onSnapshot(query, cb)        const unsub = subscribeToX(     = useX()
  → returns unsubscribe            setData, setError)
                                  return unsub  ← cleanup
                                }, [deps])
```

- **`firebase/*.js` modules are pure — no React imports.** They export
  subscription factories (`subscribeTo…`) that take `(onData, onError)` and
  return the Firestore `unsubscribe` function, plus async CRUD functions
  (`createIncident`, `updateShelter`, etc.).
- **`hooks/*.js` wrap exactly one subscription** in `useState` +
  `useEffect`, always returning the unsubscribe function from the effect for
  cleanup. This is the only place `loading`/`error` local state is
  introduced.
- Components that need data **not** covered by an existing hook (e.g.
  `Map.jsx` and `admin/Incidents.jsx` both need live `teams`) call
  `subscribeToTeams` directly inside their own `useEffect` rather than going
  through a hook — there's no `useTeams()` hook. This is an intentional
  inconsistency worth knowing about if you're searching for "the teams
  hook" — it doesn't exist; each consumer subscribes ad hoc.
- **Auth** is the one true global store: `AuthProvider` (`hooks/useAuth.jsx`)
  wraps the whole router in `App.jsx` and exposes `{ user, loading, error,
  login, logout }` via `useAuth()`.

---

## 5. Firestore Data Model

Five collections: `incidents`, `zones`, `shelters`, `teams`, `donations`.
Field-level source of truth is `firestore.rules` (validation) cross-checked
against the actual writer functions in `src/firebase/*.js`.

### `incidents`

| Field | Type | Set by | Notes |
|---|---|---|---|
| `type` | string | `createIncident` | `flood \| landslide \| blocked \| rescue \| shelter \| other`, or free text if the Report form's "Other — type your own" is used (rules only enforce the enum on the closed set; a custom string still satisfies `data.type is string && size() > 0` since the enum check `in [...]` would actually reject it — see [§13](#13-known-gaps--technical-debt)) |
| `severity` | string | `createIncident` | `critical \| warning \| info` |
| `zone_name` | string | `createIncident` | Free string, not a foreign key to `zones` — matched by name only |
| `description` | string | `createIncident` | Min 10 chars (enforced client + rules) |
| `reporter_phone` | string\|null | `createIncident` | Admin-visible only in UI (not enforced by rules — see §13) |
| `people_affected` | int | `createIncident` | Defaults to `0` |
| `lat`, `lng` | float\|int | `createIncident` | `0` when unresolved |
| `location_display` | string\|null | `createIncident` | Nominatim reverse-geocode result |
| `location_source` | string | `createIncident` | `"gps"` or `"zone"` |
| `source` | string | `createIncident` | Always `"web"` from the current client — `sms`/`ussd`/`admin` values exist in the rules enum and README but nothing in this codebase writes them (see §13) |
| `status` | string | lifecycle functions | `pending → open \| rejected`, `open → resolved` |
| `dispatched_team_id` | string\|null | `dispatchTeamToIncident` | **Not in README** — see [§6](#6-team-dispatch-system) |
| `dispatched_team_name` | string\|null | `dispatchTeamToIncident` | Denormalized for display without a join |
| `dispatched_at` | Timestamp\|null | `dispatchTeamToIncident` | |
| `created_at` | Timestamp | `createIncident` | `serverTimestamp()`; rules require `data.created_at == request.time` |
| `verified_by` | string\|null | verify/reject/resolve | Admin email |
| `verified_at` | Timestamp\|null | verify/reject/resolve | |

### `zones`

`name`, `lat`, `lng`, `radius` (metres), `risk_level`
(`critical\|warning\|watch\|safe`), `population` (string, for display). Used
by the Report form's Haversine auto-match and the Home page's "zones at
risk" counter (`useZonesAtRiskCount`).

### `shelters`

`name`, `address`, `lat`, `lng`, `capacity` (int), `occupancy` (int),
`is_open` (bool). Occupancy percentage is computed client-side everywhere
it's displayed (`Math.round(occupancy/capacity*100)`) — it is not a stored
field.

### `teams`

`code`, `name`, `organisation`, `members` (int), `status`
(`standby\|deployed\|enroute`), `location`, `task`, plus dispatch-tracking
fields added by `createTeam` but **not present in `firestore.rules`
`validTeam()`**: `dispatched_to_incident_id`, `dispatched_to_zone`,
`dispatched_at`. Since `validTeam()` only runs on `create`, and these three
fields are always written as `null` at creation time, this passes — but any
future tightening of `validTeam()` to a strict field allow-list would break
team creation. See [§13](#13-known-gaps--technical-debt).

### `donations`

`donorEmail`, `donorName`, `isAnonymous` (bool), `amount` (number, major
units), `currency` (ISO 4217), `frequency` (`once\|monthly`), `message`,
`reference` (`NAL-{ts36}-{rand4}`), `status`
(`completed\|pending\|failed`), `paystackData: { reference, status, amount,
channel }`, `createdAt`.

---

## 6. Team Dispatch System

This entire subsystem exists in `src/firebase/incidents.js` and
`src/firebase/teams.js` and drives the UI in
`src/pages/admin/Incidents.jsx`, but it is **not documented in
`README.md` at all**. It's a real, shipped feature — treat it as first-class
when reasoning about the incident lifecycle.

### State machine

```
Team.status:      standby ──dispatch──► enroute ──markDeployed──► deployed
                     ▲                                                │
                     └──────────────── recall / resolve / reject ─────┘

Incident.dispatched_team_id:  null ──dispatch──► <teamId> ──recall/resolve/reject──► null
```

### Write functions (all in `firebase/incidents.js`, all atomic via
`writeBatch`)

- **`dispatchTeamToIncident(incidentId, incident, team, adminEmail)`** — in
  one batch: (1) sets the incident's `dispatched_team_id/name/dispatched_at`;
  (2) if the team was previously dispatched to a *different* incident,
  clears that incident's dispatch fields so it doesn't keep a stale
  reference to a team it no longer has; (3) sets the team's `status:
  'enroute'`, `dispatched_to_incident_id`, `dispatched_to_zone`,
  `dispatched_at`, `location` (overwritten to the incident's zone), and
  `task` (auto-generated as `"Responding to {type} — {zone_name}"`).
- **`recallTeam(incidentId, teamId)`** — returns the team to `standby` and
  clears dispatch fields on the incident, without changing incident status.
- **`markTeamDeployed(teamId)`** — single-field update, `enroute → deployed`
  (the team has physically arrived).
- **`rejectIncident`** and **`resolveIncident`** both check
  `incident.dispatched_team_id` and, if set, fold a team-recall into the
  same batch that changes incident status — so an admin can never leave a
  team "stuck" en route to a rejected or resolved incident.

### UI surface

`admin/Incidents.jsx` renders, per incident row when expanded:
- a **Dispatch Team** button (only shown when `status === 'open'` and no
  team is assigned) opening `DispatchModal`, which lists teams filtered to
  `status === 'standby'` and previews the exact field changes before commit
- a **Dispatch strip** (once a team is assigned) with "Mark Arrived" and
  "Recall Team" actions, live-animated (pulsing dot) while `enroute`
- the public `/map` Teams sidebar tab and team markers reflect
  `dispatched_to_zone`/`status` in real time via the same `subscribeToTeams`
  listener — dispatch changes propagate to the public map with no separate
  code path

There is no `useTeams()` hook — every consumer (`Map.jsx`,
`admin/Incidents.jsx`, `admin/Teams.jsx`) calls `subscribeToTeams` directly.

---

## 7. Firestore Security Rules

`firestore.rules` denies by default; every collection is explicitly listed.

| Collection | Read | Create | Update | Delete |
|---|---|---|---|---|
| `incidents` | `status == 'open'` publicly, or `isAuth()` for all | Public, `validIncidentCreate()` | `isAuth()` + `validIncidentUpdate()` | `isAuth()` |
| `zones` | Public | `isAuth()` + `validZone()` | `isAuth()` (no field validation) | `isAuth()` |
| `shelters` | Public | `isAuth()` + `validShelter()` | `isAuth()` (no field validation) | `isAuth()` |
| `teams` | Public | `isAuth()` + `validTeam()` | `isAuth()` (no field validation) | `isAuth()` |
| `donations` | `isAuth()` only | Public, `validDonation()` | `isAuth()` | `isAuth()` |

Key points for anyone touching this file:

- **`isAuth()`** is `request.auth != null` — there is only one auth tier.
  There's no separate "responder" or "moderator" role; every signed-in
  Firebase Auth user has full admin rights over every collection. Admin
  accounts are provisioned manually via Firebase Console (no self-serve
  signup path exists in the client).
- **`validIncidentCreate()`** locks `status == 'pending'` and
  `created_at == request.time`, and requires `verified_by`/`verified_at` to
  be `null` — this is what prevents a public, unauthenticated caller from
  writing a pre-verified incident straight to the public map.
- **`validIncidentUpdate()`** only checks that `status` is one of the four
  valid enum values — it does **not** restrict which other fields an
  authenticated caller can change, and does not scope which status
  transitions are legal (e.g. nothing stops an authed client from writing
  `resolved → pending`). The client-side lifecycle functions
  (`verifyIncident`/`rejectIncident`/`resolveIncident`) are the only
  enforcement of the intended state machine — the rule itself is
  permissive by design, trusting the admin UI.
- **`update`/`delete` on `zones`/`shelters`/`teams`** have no field
  validation at all (`allow update: if isAuth();`) — any authenticated user
  can write arbitrary fields to these collections. Only `create` is
  validated.
- **Coordinate dual-type check** — Firestore distinguishes `int` from
  `float`, and GPS coordinates from `navigator.geolocation` are floats while
  zone-centroid fallback coordinates read from Firestore may come back as
  `int` if stored as whole numbers. `validIncidentCreate()` explicitly
  checks `(data.lat is float || data.lat is int)` for this reason — dropping
  either branch silently breaks report submission for whichever coordinate
  type it excludes.

---

## 8. Core Algorithms

### Haversine distance (`pages/Report.jsx`)

A dependency-free `haversineKm(lat1, lng1, lat2, lng2)` using the standard
great-circle formula (`R = 6371` km) is used purely to find the nearest
registered zone to a GPS fix — `findNearestZone()` runs it against every
document in the live `zones` subscription (no spatial index; fine at the
data volumes this app operates at, would need revisiting past a few hundred
zones).

### Three-tier location resolution (`pages/Report.jsx` → `LocationSection`)

1. **GPS** — `navigator.geolocation.getCurrentPosition` with
   `enableHighAccuracy: true`, `timeout: 10000`, `maximumAge: 60000`. On
   success: reverse-geocode via Nominatim, `findNearestZone` for the
   auto-matched dropdown value, render a static (non-interactive) Leaflet
   preview at the resolved coordinates.
2. **GPS denied/timeout** — falls back to the zone `<select>`, using the
   selected zone's stored `lat`/`lng` as the incident coordinates, and
   surfaces a `"Using zone centre as location — lower accuracy"` warning.
   This state is also reachable directly (skip GPS) since the zone dropdown
   is always rendered as an option, not gated behind a failed GPS attempt.
3. **Manual override** — even after a successful GPS match, the zone
   dropdown remains editable ("auto-matched — override if needed"),
   letting the reporter correct a wrong auto-match without re-triggering
   GPS.

`location_source` is derived at submit time as `resolvedLocation?.lat ?
'gps' : 'zone'` — i.e. it's inferred from the presence of a GPS-resolved
`lat`, not tracked as an explicit flag through the tier state machine.

### Reference generation (`utils/paystack.js`)

`generateReference()` → `NAL-{Date.now().toString(36).toUpperCase()}-{4
random base-36 chars}`. Not cryptographically unique — collision risk is
theoretical only (same millisecond + same 4 random chars), acceptable for a
donation reference used for display/reconciliation, not as a security token.

---

## 9. Third-Party Integrations

### Gemini Flash chatbot (`components/AIChatbot.jsx`)

- Calls `@google/generative-ai` **directly from the browser** using
  `VITE_GEMINI_API_KEY` — the key is exposed client-side by Vite's `import.meta.env`
  convention (any `VITE_*` var is bundled into the client). This is a
  deliberate tradeoff for a serverless architecture, not an oversight, but
  it means the Gemini key has no server-side rate limiting or scoping
  beyond whatever Google Cloud console restrictions are applied to it.
- One giant system prompt is prepended to every user message inline (not
  using the SDK's dedicated system-instruction parameter) and re-sent on
  every call — there is no multi-turn chat session object, so the model has
  no memory of prior messages in the conversation beyond what's visible in
  the UI. Each `callGemini()` call is a single-shot `generateContent`.
- Model id: `gemini-flash-latest`.
- Errors surface an in-chat message directing users to call 999/1199 rather
  than a generic failure — this is deliberate per the crisis-tool framing,
  not left over debug text.

### Paystack donations (`utils/paystack.js`, `components/DonationModal.jsx`)

- `inline.js` (`https://js.paystack.co/v2/inline.js`) is injected via a
  dynamically created `<script>` tag on first use (`loadPaystackScript`),
  not present in `index.html` — keeps it out of the initial bundle/HTML.
- Amount is converted to minor units via `Math.round(amount * 100)` before
  being handed to `PaystackPop.setup()`.
- **`verifyPayment()` has a silent dev fallback**: if
  `VITE_PAYSTACK_VERIFY_URL` is unset, it returns a fabricated `{ data: {
  status: 'success', amount: 0, channel: 'unknown' } }` and logs a
  `console.warn`. This means a donation flow will write a `status:
  'completed'` document to Firestore **without ever having verified the
  payment server-side** if that env var isn't configured — see [§13](#13-known-gaps--technical-debt)
  for why this matters for the current deployment.

### Nominatim reverse geocoding (`pages/Report.jsx`)

Direct client-side `fetch()` to
`nominatim.openstreetmap.org/reverse` with a custom `User-Agent` header, per
OSM's usage policy. No API key, no server proxy, no rate-limit handling
beyond a try/catch that falls back to raw coordinates on failure.

### Leaflet / CartoDB tiles

`react-leaflet` throughout; basemap tiles are `light_all` CartoDB tiles
loaded from `{s}.basemaps.cartocdn.com` (subdomains `a-d` for parallel
loading). No API key required for this tile source at current usage.

---

## 10. PWA & Service Worker

`public/sw.js` implements three caching strategies keyed by hostname
(**not** by a manifest-driven route table — it's a plain `fetch` listener
with hostname string matching):

| Match | Strategy |
|---|---|
| `firestore.googleapis.com`, `googleapis.com`, `nominatim.openstreetmap.org` | Network-first, fall back to cache on failure |
| `cartocdn.com` / `basemaps` | Cache-first, populate cache on miss |
| everything else (app shell) | Cache-first, populate cache on miss |

Cache name is `nairobialert-v1`, hardcoded — **bumping this string is the
only mechanism for invalidating stale cached assets** on `activate`; there
is no build-time cache-busting integration between Vite's output hashes and
`sw.js`. Non-GET requests and `chrome-extension:` URLs are explicitly
skipped.

Offline **write** queuing (for report submissions made with no
connectivity) is a separate mechanism: `enableIndexedDbPersistence(db)` in
`firebase/config.js` handles this at the Firestore SDK level, independent of
the service worker. `failed-precondition` (multiple tabs) and
`unimplemented` (unsupported browser) are caught and logged as non-fatal
warnings — the app continues in online-only mode in both cases.

---

## 11. Build, CI/CD & Deployment

- **Vite** (`vite.config.js`) manually splits three vendor chunks
  (`react-vendor`, `firebase-vendor`, `map-vendor`) via
  `rollupOptions.output.manualChunks`; every page is additionally
  code-split via `React.lazy`. `@` resolves to `client/src`. Dev server runs
  on port 3000.
- **CI** (`.github/workflows/nairobialert-ci-cd.yml`): triggers on push/PR
  to `main`/`master`, scoped to `client/**` path changes. Single `build`
  job — Node 20, `npm install`, `npm run build` with all `VITE_*` secrets
  injected from GitHub Actions Secrets, uploads `client/dist` as a 7-day
  artifact. A separate `deploy` job runs only on push to `main` and is
  **purely informational** (`echo` statements) — it does not actually
  deploy anything. Real deployment is handled entirely by Vercel's own
  GitHub integration outside this workflow, triggered independently by the
  same push.
- **Firebase deploy** is manual/local: `npm run deploy:rules` (→ `firebase
  deploy --only firestore:rules`) is the only wired script. There is no CI
  step that deploys Firestore rules or Cloud Functions — rule changes must
  be deployed by a developer running the command locally.

---

## 12. Local Development

```bash
cd client
npm install
cp .env.example .env      # then fill in Firebase, Gemini, Paystack keys
npm run dev                # Vite dev server, http://localhost:3000
```

`.env.example` currently lists Firebase + `VITE_GEMINI_API_KEY` +
`VITE_PAYSTACK_PUBLIC_KEY` only — it does **not** include
`VITE_PAYSTACK_VERIFY_URL`, even though `utils/paystack.js` and the README
both reference it. Add it manually if you're testing donation verification
against a real Cloud Function.

Admin accounts are created manually in **Firebase Console → Authentication
→ Users → Add User** — there is no seed script or emulator setup checked
into the repo, and no `firebase emulators:start` config beyond the default
`functions` emulator scripts in `client/functions/package.json`.

There is currently **no automated test suite** (no `test` script, no Jest/
Vitest/Playwright config) — verification is manual, via `npm run dev` /
`npm run build` + `npm run preview`.

---

## 13. Known Gaps & Technical Debt

This section exists so nobody re-discovers these the hard way. All were
found by reading the actual source against what `README.md` and inline
comments claim.

1. **The Paystack verification Cloud Function is not implemented.**
   `README.md` presents `exports.verifyPaystackPayment` in
   `functions/index.js` as shipped code. The actual `client/functions/index.js`
   is the untouched Firebase scaffold — `setGlobalOptions` plus a fully
   commented-out example function. Nothing is exported. Until this is
   written and deployed, and `VITE_PAYSTACK_VERIFY_URL` is set, every
   donation in production silently uses the dev fallback in
   `verifyPayment()` (see [§9](#9-third-party-integrations)) — meaning
   payments are recorded as `completed` in Firestore without genuine
   server-side verification against Paystack's secret key. This is a
   real payment-integrity gap if the current deployment is accepting live
   donations without this function deployed — worth confirming with
   whoever owns the Paystack/Firebase project before treating donation data
   as trustworthy.

2. **SMS/USSD are not wired to anything.** README's "SMS / USSD
   Architecture" section is a design document, not a description of running
   code. There is no Africa's Talking webhook handler, no Cloud Function
   parsing inbound SMS, and the `source: 'sms' | 'ussd'` enum values in
   `firestore.rules`/the data model are unreachable — the only writer of
   `incidents.source` in the entire codebase is `createIncident()` in
   `firebase/incidents.js`, which hardcodes `source: 'web'`.

3. **`validIncidentUpdate()` doesn't constrain the state machine.** It only
   checks `status` is a valid enum member, not that the transition is legal
   (e.g. nothing in rules stops `resolved → pending`) and doesn't restrict
   which other fields an authenticated write can touch. The intended
   `pending → open/rejected`, `open → resolved` flow is enforced entirely by
   which JS functions the admin UI calls, not by the rules themselves.

4. **`update`/`delete` on `zones`, `shelters`, `teams` have zero field
   validation** (`allow update: if isAuth();`) — only `create` runs the
   `valid*()` checks. Any authenticated session (i.e. any admin account) can
   write malformed data to these collections via direct SDK calls, bypassing
   the app's own CRUD functions.

5. **`teams.dispatched_to_incident_id` / `dispatched_to_zone` /
   `dispatched_at` are absent from `validTeam()`.** `createTeam()` writes
   them as `null`, which happens to satisfy the current (loose) `create`
   rule, but the rule was clearly written before the dispatch feature
   existed and never updated to reflect it. Tightening `validTeam()` later
   without adding these fields will break team creation.

6. **Custom incident "type" values likely fail Firestore rules.** The
   Report form's "Other — type your own" path lets a user submit an
   arbitrary string as `type`, but `validIncidentCreate()` requires `data.type
   in ['flood', 'landslide', 'blocked', 'rescue', 'shelter', 'other']` — a
   custom string that isn't literally `'other'` will be rejected by
   Firestore at write time. This is a live-bug candidate worth verifying
   against a real Firestore project rather than assuming the form always
   works end-to-end.

7. **`reporter_phone` is not format-validated in rules** — only client-side
   regex-checked in `Report.jsx`. A direct SDK write can put anything in
   that field.

8. **No composite indexes defined** (`firestore.indexes.json` is `{
   "indexes": [], "fieldOverrides": [] }`). Several queries combine `where`
   + `orderBy` on different fields (e.g. `subscribeToIncidentsByStatus`,
   `subscribeToAvailableTeams`) — Firestore auto-suggests indexes the first
   time an unindexed compound query runs and fails in the console/error
   logs; none of those suggested indexes have been captured back into this
   file, so a fresh Firestore project will hit "index required" errors on
   first use until someone clicks through the console prompts (or exports
   them here).

9. **No automated tests.** Confidence in changes to the dispatch system,
   location resolver, or security rules currently depends entirely on
   manual testing against a real (or emulated) Firebase project.

10. **CI's `deploy` job doesn't deploy anything** — it's log statements only
    (see [§11](#11-build-cicd--deployment)). Don't mistake a green CI run
    for confirmation that Firestore rules or Cloud Functions changes went
    live; those require a manual `firebase deploy`.

---

## 14. Extending the System

### Add a new zone
Create a document in `zones` with all `validZone()` fields. It appears
immediately in the Report form dropdown and the Haversine auto-match — no
code changes needed.

### Add a new incident type
1. Add `{ value, label }` to `INCIDENT_TYPES` in `pages/Report.jsx`.
2. Add the value to the `type` enum in `validIncidentCreate()` in
   `firestore.rules`, then `npm run deploy:rules`.
3. Add a label mapping anywhere `type` is rendered as a friendly string
   (currently `IncidentCard.jsx`, `Home.jsx`, `Map.jsx`'s
   `TYPE_TO_FILTER`).

### Add a new team status (beyond standby/deployed/enroute)
Update `TEAM_STATUS_CLASSES` in `components/StatusBadge.jsx`, the `status`
enum in `validTeam()` in `firestore.rules`, and audit
`dispatchTeamToIncident`/`recallTeam`/`markTeamDeployed` in
`firebase/incidents.js` — they currently assume exactly these three states
when deciding what UI/actions to show.

### Wire up the Paystack verification Cloud Function
Implement `exports.verifyPaystackPayment` in `client/functions/index.js` per
the sketch already documented in `utils/paystack.js`'s doc comment and in
`README.md`, deploy with `firebase deploy --only functions`, then set
`VITE_PAYSTACK_VERIFY_URL` in both `.env` and the GitHub Actions repo
secrets so CI-built bundles point at it.
