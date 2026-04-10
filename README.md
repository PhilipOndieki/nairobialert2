# NairobiAlert

Real-time flood crisis response system for Nairobi, Kenya.
Built with React 18 + Vite 5 + Tailwind CSS v3 + Firebase v10.

---

## Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | React 18, Vite 5, React Router v6       |
| Styling    | Tailwind CSS v3, DM Serif / Sans / Mono |
| Database   | Firebase Firestore (real-time)          |
| Auth       | Firebase Authentication                 |
| Map        | Leaflet.js + react-leaflet v4           |
| Deployment | Vercel                                  |

---

## Prerequisites

- Node 18+
- A Firebase project with Firestore and Authentication enabled
- (Optional) Firebase CLI for deploying Firestore rules

---

## Local Development Setup

### 1. Clone and install

```bash
git clone https://github.com/philipondieki/nairobialert2.git
cd nairobialert2
npm install
```

### 2. Configure Firebase

Copy the environment template and fill in your Firebase credentials:

```bash
cp .env.example .env
```

Open `.env` and replace each placeholder with the values from your Firebase
project: **Firebase Console → Project Settings → Your Apps → Web App → SDK setup and configuration**.

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

> **Security note:** Firebase client-side keys are not secrets. Access is
> enforced by Firestore security rules, not by keeping keys private.

### 3. Enable Firebase services

In the Firebase Console:

1. **Firestore** — Create database in production mode (rules will be deployed below)
2. **Authentication** — Enable the **Email/Password** provider
3. **Create an admin user** — In Authentication → Users → Add user

### 4. Deploy Firestore security rules

```bash
npm install -g firebase-tools
firebase login
firebase use your-project-id
firebase deploy --only firestore:rules
```

### 5. Run locally

```bash
npm run dev
```

App will be available at `http://localhost:3000`.

---

## Seeding Zones Data

The home page and map need at least one zone document to display content.
Use the Firebase Console (Firestore → zones collection → Add document) or
run this one-time seed script in your browser console after logging in:

**Firestore Console → Add collection `zones`**, then add documents with this shape:

```json
{
  "name":       "Mathare",
  "lat":        -1.2584,
  "lng":        36.8512,
  "radius":     1500,
  "risk_level": "critical",
  "population": "~200,000"
}
```

### Suggested seed zones for Nairobi

| name              | lat      | lng     | risk_level | population |
|-------------------|----------|---------|------------|------------|
| Mathare           | -1.2584  | 36.8512 | critical   | ~200,000   |
| Mukuru kwa Njenga | -1.3102  | 36.8756 | critical   | ~170,000   |
| Kibera            | -1.3136  | 36.7887 | warning    | ~250,000   |
| Korogocho         | -1.2264  | 36.8906 | warning    | ~150,000   |
| Kawangware        | -1.2771  | 36.7494 | watch      | ~120,000   |
| Westlands         | -1.2635  | 36.8015 | safe       | ~80,000    |

Set `radius` to `1500` (metres) for all zones as a starting value.

---

## Firestore Schema Reference

### `incidents/{id}`
```
type:             string  ('flood' | 'landslide' | 'blocked' | 'rescue' | 'shelter' | 'other')
severity:         string  ('critical' | 'warning' | 'info')
zone_name:        string
description:      string
reporter_phone:   string | null
people_affected:  number
lat:              number
lng:              number
source:           string  ('web' | 'sms' | 'ussd' | 'admin')
status:           string  ('pending' | 'open' | 'rejected' | 'resolved')
created_at:       Timestamp
verified_by:      string | null
verified_at:      Timestamp | null
```

### `zones/{id}`
```
name:       string
lat:        number
lng:        number
radius:     number   (metres)
risk_level: string  ('critical' | 'warning' | 'watch' | 'safe')
population: string
```

### `teams/{id}`
```
code:          string
name:          string
organisation:  string
members:       number
status:        string  ('standby' | 'deployed' | 'enroute')
location:      string
task:          string
```

### `shelters/{id}`
```
name:      string
address:   string
lat:       number
lng:       number
capacity:  number
occupancy: number
is_open:   boolean
```

---

## Admin Access

1. Navigate to `/admin/login`
2. Sign in with the Firebase Auth user you created during setup
3. You'll land on `/admin/dashboard` — pending incident queue is shown immediately

### Incident workflow

```
citizen submits → status: pending
admin reviews   → Verify → status: open   (appears on public map)
                → Reject → status: rejected
admin resolves  → Resolve → status: resolved (removed from map)
```

---

## Deploying to Vercel

### 1. Push to GitHub

```bash
git remote add origin https://github.com/philipondieki/nairobialert2.git
git push -u origin main
```

### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repository
3. Framework: **Vite** (auto-detected)
4. Add all `VITE_FIREBASE_*` environment variables in the Vercel dashboard
5. Click **Deploy**

### 3. Custom domain (optional)

In Vercel → Project → Settings → Domains, add your domain (e.g. `nairobialert.co.ke`).

---

## SMS / USSD Architecture (Planned)

The MVP does not include live SMS/USSD handling. When integrating:

- **Provider:** Africa's Talking API (or Twilio)
- **Inbound SMS/USSD** → serverless function (Firebase Function or Vercel Edge Function)
- Function parses message, writes to Firestore `incidents` collection with `source: 'sms'` or `source: 'ussd'`
- All existing security rules and admin review workflow apply equally

The architecture hookpoint is in `src/firebase/incidents.js` → `createIncident()` —
the same function is used regardless of whether the incident originates from the web form,
SMS, USSD, or an admin directly.

---

## Project Structure

```
src/
├── main.jsx                   Entry point
├── App.jsx                    Router (createBrowserRouter)
├── index.css                  Tailwind + Google Fonts
├── firebase/
│   ├── config.js              Firebase init (env vars only)
│   ├── incidents.js           Firestore CRUD + real-time listeners
│   ├── zones.js               Zones collection helpers
│   ├── teams.js               Teams collection helpers
│   └── shelters.js            Shelters collection helpers
├── hooks/
│   ├── useAuth.js             Auth context + hook
│   ├── useIncidents.js        Incident listener hooks
│   └── useZones.js            Zone listener hooks
├── components/
│   ├── Navbar.jsx             Responsive navigation
│   ├── Footer.jsx             Site footer + admin link
│   ├── StatusBadge.jsx        Reusable severity/status badge
│   ├── ZoneCard.jsx           Zone risk level card
│   ├── IncidentCard.jsx       Incident display card
│   └── ProtectedRoute.jsx     Auth guard for admin routes
├── layouts/
│   ├── PublicLayout.jsx       Navbar + Footer wrapper
│   └── AdminLayout.jsx        Sidebar admin layout
└── pages/
    ├── Home.jsx               Hero + stats + zones
    ├── Map.jsx                Leaflet map + sidebar
    ├── Report.jsx             Public report form
    ├── About.jsx              System info
    └── admin/
        ├── Login.jsx          Firebase auth form
        ├── Dashboard.jsx      Stats + pending queue
        ├── Incidents.jsx      Full incident management
        ├── Teams.jsx          Team CRUD
        └── Shelters.jsx       Shelter CRUD
```

---

## Design System

Fonts: **DM Serif Display** (headings), **DM Sans** (body), **DM Mono** (labels/badges)

| Token       | Value     |
|-------------|-----------|
| teal        | `#0a7e6e` |
| teal-dark   | `#075c50` |
| teal-light  | `#e6f5f3` |
| red         | `#c0392b` |
| amber       | `#d4780a` |
| green       | `#1a7a4a` |
| bg          | `#f7f5f2` |
| text        | `#1c1a17` |

All tokens are configured in `tailwind.config.js`.

---

## License

For emergency use. Contact the project maintainer for licensing details.
