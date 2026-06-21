# Kalendly

A Linear-style, single-tenant scheduling app — your own self-hosted alternative to Calendly.

Pick from your event types, share a public booking page, and let guests grab a slot. Your Google Calendar is the source of truth for availability and where the booking lands.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript**, **Tailwind v4**
- **NextAuth v5** (credentials, single admin)
- **MongoDB** (driver, Atlas-friendly)
- **Composio** for Google Calendar OAuth + busy-time / event creation
- **Vitest** for unit tests
- **shadcn-style UI primitives** built on **base-ui** + **Radix** popover

## Features

- Public booking pages with searchable timezone picker (auto-detects, IANA list)
- Reschedule + cancel via signed magic-link tokens (`/b/[token]`)
- Admin dashboard, event types, availability editor, bookings inbox, settings
- Light / dark / system theme
- Mobile-friendly Linear-style chrome (hairline borders, mono numerals, single accent)
- Loading skeletons on every admin route

## Local setup

```bash
git clone https://github.com/albertshiney/kalendly_public.git kalendly
cd kalendly
npm install
cp .env.example .env.local
# fill in the values in .env.local — see below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and you'll be redirected to `/login`. Sign in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set, then connect Google Calendar from **Settings**.

### Environment variables

All seven are required (see `lib/env.ts`):

| Var | What | Example |
|---|---|---|
| `MONGODB_URI` | Mongo connection string | `mongodb+srv://user:pass@cluster.mongodb.net/kalendly` |
| `NEXTAUTH_SECRET` | JWT signing secret | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Origin used by NextAuth | `http://localhost:3000` |
| `ADMIN_EMAIL` | The single admin's email | `you@example.com` |
| `ADMIN_PASSWORD` | The single admin's password | any non-empty string |
| `APP_URL` | Public origin (used in invite links / OAuth callback) | `http://localhost:3000` |
| `COMPOSIO_API_KEY` | API key from [composio.dev](https://composio.dev) | `ak_…` |

## Deployment (Vercel)

1. Import the repo on Vercel.
2. Add all seven env vars under **Project → Settings → Environment Variables** (Production + Preview).
3. Set `NEXTAUTH_URL` and `APP_URL` to your final domain (e.g. `https://kalendly.example.com`).
4. Redeploy.

The build is tolerant when env vars are missing (won't fail the deploy), but the running site will throw on every request until they're set — set them, then redeploy.

## Scripts

- `npm run dev` — local dev (Turbopack)
- `npm run build` — production build
- `npm run start` — production server
- `npm run lint` — ESLint
- `npm run test` — Vitest
- `npm run typecheck` — `tsc --noEmit`

## Project layout

```
app/
  (admin)/          dashboard, event types, availability, bookings, settings
  (auth)/login      credentials sign-in
  (public)/         public profile + booking flow
  api/              REST handlers for booking + integration callbacks
components/
  admin/            admin-specific UI (Sidebar, EventTypeForm, …)
  public/           BookingShell + calendar/slot picker
  ui/               shadcn-style primitives + TimezoneCombobox
lib/                env, db, calendar, availability, booking, …
server-actions/     Next.js server actions
auth.ts             NextAuth config
proxy.ts            middleware for protected admin routes
```

## License

MIT — do whatever you want with this. Attribution appreciated but not required.
