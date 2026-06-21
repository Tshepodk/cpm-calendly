# Kalendly — Design Specification

**Date:** 2026-04-29
**Owner:** Albert (sole user)
**Status:** Approved (awaiting implementation plan)

## 1. Overview

Kalendly is a single-admin Calendly clone for personal use. It exposes public booking pages where guests pick available times based on the admin's Google Calendar availability, and writes confirmed bookings back to Google Calendar — which then handles all guest notifications via standard calendar invites.

The product is intentionally narrow: one admin, one Google Calendar, no payments, no team features, no SMS. The point is a clean, branded, self-hosted booking surface that the admin fully controls, integrated cleanly with Google Calendar through Composio.

## 2. Goals & non-goals

### Goals
- Public, shareable booking pages — one per appointment type, accessed at `kalendly.example.com/<slug>`
- Multiple appointment types with independent rules (duration, buffers, custom questions, location, color)
- Editable weekly availability with date-specific overrides
- Two-way Google Calendar integration: read busy times to compute availability, write new bookings back as events with the guest as an attendee
- Auto-generated Google Meet link on each booking (with graceful fallback for personal Gmail accounts)
- Guest reschedule and cancel flow via a tokenized URL embedded in the calendar invite description
- Admin login (single user) protected by NextAuth Credentials with a bcrypt-hashed password in `.env`
- Distinctive branded design — editorial typography, refined iris-purple primary, light mode

### Non-goals (explicitly out of scope for v1)
- Multi-user / team scheduling, round-robin, group events
- Multiple Google calendars used as conflict sources (only one calendar per integration)
- Payments, Stripe, paid bookings
- Workflows, automations, webhook integrations beyond Google Calendar
- SMS reminders (Twilio)
- Polls / when2meet-style group polls
- Embeddable widget
- Routing forms / analytics dashboard
- Dark mode
- Custom-branded Google OAuth consent screen (consent will say "Composio"; white-labeling is a future follow-up)
- Self-serve sign-up — only the single admin operates this instance

## 3. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend + backend | Next.js 15 App Router (single repo, single deploy) | "Node.js backend" satisfied by route handlers + server actions |
| Language | TypeScript (strict) | |
| Styling | Tailwind CSS v4 + shadcn/ui primitives | Tokens overridden to bake in the iris palette |
| Auth | NextAuth v5 (Auth.js), Credentials provider | bcryptjs for password hash compare |
| DB | MongoDB Atlas (free tier OK) | Official `mongodb` Node driver — no Mongoose |
| Calendar integration | Composio Node SDK (`@composio/core`) | Direct `tools.execute(...)` calls; no LLM in the loop |
| Validation | Zod | Used for all API route + server action inputs |
| Date / TZ math | `date-fns` + `date-fns-tz` | Handles DST transitions correctly |
| Fonts | Fraunces (display), Geist (UI), Geist Mono (numerals) | Self-hosted via `next/font/google` |
| Hosting | Vercel | NextAuth secret + MongoDB URI as env vars |

## 4. Architecture

### Route layout

```
/app
  /(admin)                       protected by middleware
    /login/page.tsx              public — only place to enter site as admin
    /dashboard/page.tsx
    /event-types/page.tsx
    /event-types/new/page.tsx
    /event-types/[id]/edit/page.tsx
    /availability/page.tsx
    /bookings/page.tsx
    /settings/page.tsx
  /(public)
    /page.tsx                    public profile: lists active event types
    /[slug]/page.tsx             booking page for one event type
    /[slug]/confirm/page.tsx     booking form
    /[slug]/booked/page.tsx      success
    /b/[token]/page.tsx          guest manage page (reschedule/cancel)
  /api
    /availability/[slug]/route.ts        GET — slot list for date range
    /bookings/route.ts                   POST — create booking (public)
    /bookings/[token]/route.ts           PATCH — reschedule, DELETE — cancel
    /integrations/google/callback/route.ts   GET — Composio OAuth callback handler
    /auth/[...nextauth]/route.ts         NextAuth handler
  /middleware.ts                 redirects unauthenticated /(admin)/* to /login
```

### Module boundaries (`/lib`)

Each module has a single responsibility and is testable in isolation.

- `lib/db.ts` — MongoDB client singleton + typed accessors for each collection
- `lib/auth.ts` — NextAuth config, session helpers (`requireAdmin()`, `getSession()`)
- `lib/calendar.ts` — Composio wrapper. Public surface:
  ```ts
  initiateGoogleConnection(userId, callbackUrl): Promise<{ redirectUrl, connectionId }>
  getConnection(connectionId): Promise<{ status, calendarId? }>
  listCalendars(userId): Promise<{ id, summary, primary }[]>
  getBusyTimes(userId, calendarId, startUtc, endUtc): Promise<{ start, end }[]>
  createCalendarEvent(userId, calendarId, input): Promise<{ googleEventId, meetLink? }>
  deleteCalendarEvent(userId, calendarId, googleEventId): Promise<void>
  ```
  Internally calls `composio.tools.execute("GOOGLECALENDAR_*", ...)`. The rest of the app never imports `@composio/core` directly — this isolates the third-party dependency.
- `lib/availability.ts` — pure computation. `computeSlots(eventType, weeklyHours, dateOverrides, busyTimes, now, options)` returns `Slot[]`. No I/O. Heavily unit-tested.
- `lib/booking.ts` — orchestration. `createBooking(input)` validates, re-checks availability, calls `calendar.createCalendarEvent`, inserts the DB row. Wrapped in a try/rollback to handle "Google created the event but DB write failed" cases.
- `lib/tokens.ts` — generates and validates the 32-byte hex `manageToken`s.
- `lib/timezone.ts` — small wrappers around `date-fns-tz` for slot rendering.

## 5. Data model

All collections live in a single MongoDB database `kalendly`.

### `users`
Single document. Exists for future-proofing and so that NextAuth's session can reference a user record.
```ts
{
  _id: ObjectId,
  email: string,                  // matches ADMIN_EMAIL env
  passwordHash: string,            // bcrypt; mirrors ADMIN_PASSWORD_HASH for consistency
  name: string,                    // shown on public profile
  bio: string | null,              // one-liner on public profile
  defaultTimezone: string,         // IANA, e.g. "Europe/Copenhagen"
  createdAt: Date,
  updatedAt: Date
}
```
On boot, if no user document exists, one is created from `ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH`.

### `integrations`
At most one Google Calendar integration in v1.
```ts
{
  _id: ObjectId,
  userId: ObjectId,                // FK -> users._id
  provider: "google_calendar",
  composioConnectionId: string,    // returned from Composio after OAuth completes
  composioUserId: string,          // matches users._id stringified, used as Composio user_id
  status: "ACTIVE" | "EXPIRED" | "FAILED" | "INACTIVE",
  calendarId: string,              // chosen from GOOGLECALENDAR_LIST_CALENDARS, defaults to "primary"
  calendarSummary: string,         // human label for UI
  connectedAt: Date,
  lastCheckedAt: Date
}
```

### `eventTypes`
```ts
{
  _id: ObjectId,
  slug: string,                    // unique, [a-z0-9-], used in URL
  title: string,
  description: string,             // markdown allowed (sanitized on render)
  durationMinutes: number,
  color: "iris" | "rose" | "amber" | "sage" | "slate",  // closed enum, mapped to palette tokens
  location: {
    type: "google_meet" | "phone" | "custom",
    customText?: string,           // shown to guest if type === "custom"
    phoneNumber?: string           // shown to guest if type === "phone"
  },
  rules: {
    bufferBeforeMin: number,       // default 0
    bufferAfterMin: number,        // default 0
    minNoticeMinutes: number,      // default 240 (4h)
    maxAdvanceDays: number,        // default 60
    maxBookingsPerDay: number | null  // null = unlimited
  },
  customQuestions: Array<{
    id: string,                    // stable UUID, referenced from bookings.customAnswers
    label: string,
    type: "short_text" | "long_text" | "select",
    required: boolean,
    options?: string[]             // only when type === "select"
  }>,
  active: boolean,
  position: number,                // for ordering on public profile
  createdAt: Date,
  updatedAt: Date
}
```
Indexes: `{ slug: 1 }` unique; `{ active: 1, position: 1 }`.

### `availability`
Single document holding the weekly working-hours grid + date overrides.
```ts
{
  _id: ObjectId,
  userId: ObjectId,
  timezone: string,                // IANA; intervals are interpreted in this TZ
  weeklyHours: Array<{
    dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6,   // 0 = Sunday
    intervals: Array<{ start: "HH:MM", end: "HH:MM" }>  // empty array = unavailable
  }>,
  dateOverrides: Array<{
    date: "YYYY-MM-DD",
    intervals: Array<{ start: "HH:MM", end: "HH:MM" }>  // empty = blocked entirely
  }>,
  updatedAt: Date
}
```

### `bookings`
```ts
{
  _id: ObjectId,
  eventTypeSlug: string,           // denormalized for fast public-page queries
  eventTypeId: ObjectId,
  guestName: string,
  guestEmail: string,
  guestTimezone: string,
  customAnswers: Record<string, string>,  // keyed by customQuestion.id
  startUtc: Date,
  endUtc: Date,
  googleEventId: string,
  meetLink: string | null,
  manageToken: string,             // 32-byte hex, indexed unique
  status: "confirmed" | "cancelled" | "rescheduled",
  rescheduledToBookingId: ObjectId | null,  // points to the new booking when status === "rescheduled"
  createdAt: Date,
  cancelledAt: Date | null
}
```
Indexes: `{ manageToken: 1 }` unique; `{ startUtc: 1 }`; `{ status: 1, startUtc: 1 }`.

A TTL index on `{ endUtc: 1 }` set to 90 days expires old bookings (and therefore their `manageToken`s) automatically.

## 6. Authentication & security

### Login flow
1. `/login` is the only public admin entry point — no link from the public profile.
2. Form posts email + password to NextAuth Credentials authorize callback.
3. The callback bcrypt-compares against `ADMIN_PASSWORD_HASH` from env. Email must match `ADMIN_EMAIL` exactly.
4. Successful auth returns a NextAuth JWT session cookie (`httpOnly`, `secure`, `sameSite: "lax"`, 30-day expiry).
5. Failed auth returns a generic "Invalid email or password" — never distinguishes which field was wrong.

### Password setup
- A `npm run set-password` script reads a password from stdin, prints the bcrypt hash to stdout. The admin pastes it into `.env.local` as `ADMIN_PASSWORD_HASH`. Plaintext never touches disk.
- bcrypt cost factor 12.

### Rate limiting
- POST `/api/auth/callback/credentials`: max 5 attempts per IP per 15 minutes. Implementation: small in-memory bucket. If Vercel scales beyond a single instance the bucket leaks but does not fail open — at worst rate limiting becomes per-instance, which is still meaningful for a personal site.

### Middleware
- `middleware.ts` matches `/(admin)/:path*` and redirects to `/login?next=...` when no session. Skips `/login` itself.

### Public surface security
- POST `/api/bookings` is rate-limited (10/min per IP) to deter spam.
- All inputs validated with Zod schemas at the route boundary.
- Guest email format checked but not verified — Google Calendar's invite delivery is the implicit verification.
- `manageToken` is `crypto.randomBytes(32).toString("hex")` (256 bits of entropy). Brute-forcing is infeasible.
- `manageToken` lookups are constant-time (MongoDB unique index → O(1) hash).
- `/b/[token]` does NOT leak whether a token exists. Invalid tokens render a generic "Booking not found or already cancelled" page.

### Headers
- Standard Next.js secure headers via `next.config.ts`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimal.
- CSP defined inline in `next.config.ts`: `default-src 'self'`, allow `https://fonts.googleapis.com` for Google Fonts, no inline scripts (Next.js handles its own nonces).

## 7. Composio Google Calendar integration

### Auth-config provisioning (zero-setup)
The Composio auth config is provisioned by the app itself on first connect — no dashboard step, no env var to paste in. `lib/calendar.ensureGoogleAuthConfig()` calls `composio.authConfigs.list({ toolkit: "googlecalendar", isComposioManaged: true })`; if any managed config exists for the toolkit it reuses the first one's `id`, otherwise it calls `composio.authConfigs.create("googlecalendar", { type: "use_composio_managed_auth", name: "Kalendly Google Calendar" })`. The resolved id is cached in module memory for the lifetime of the process.

> **Note on consent screen branding:** Because we use Composio managed auth, the OAuth consent screen displays "Composio" as the requesting application. For a single-user personal tool this is acceptable. Future follow-up: register a dedicated Google Cloud OAuth app and switch to `use_custom_auth` to display "Kalendly" instead.

### Connect flow (admin-side)
1. Admin signs in, navigates to `/settings`.
2. Clicks "Connect Google Calendar". Server action calls:
   ```ts
   const authConfigId = await ensureGoogleAuthConfig();
   composio.connectedAccounts.initiate(
     userId,                                  // users._id stringified
     authConfigId,
     { callbackUrl: `${APP_URL}/api/integrations/google/callback` }
   )
   ```
3. The returned `redirectUrl` is sent to the browser via redirect. Admin completes Google OAuth.
4. Composio invokes `GET /api/integrations/google/callback?status=success&connectedAccountId=...`. The callback:
   - Calls `composio.connectedAccounts.get(connectedAccountId)` to confirm `status === "ACTIVE"`.
   - Calls `composio.tools.execute("GOOGLECALENDAR_LIST_CALENDARS", { userId })` to fetch the available calendars.
   - Inserts the `integrations` row with `calendarId = "primary"` as the default.
   - Redirects to `/settings?connected=1`.
5. Admin can switch the active calendar from a dropdown in `/settings` (writes `calendarId` to the integration row).

### Read availability
For a given date range `[startUtc, endUtc]`, `lib/calendar.getBusyTimes()` calls:
```ts
composio.tools.execute("GOOGLECALENDAR_FIND_FREE_SLOTS", {
  userId,
  arguments: {
    time_min: startUtc.toISOString(),
    time_max: endUtc.toISOString(),
    items: [{ id: integration.calendarId }],
    timezone: availability.timezone
  }
})
```
The response includes both busy intervals and pre-computed free slots. We use the busy intervals and run our own slot-fitting because we need to apply Kalendly's own rules (buffers, min notice, max-per-day) that Google doesn't know about.

### Write a booking
On confirmed booking, `lib/calendar.createCalendarEvent()` calls:
```ts
composio.tools.execute("GOOGLECALENDAR_CREATE_EVENT", {
  userId,
  arguments: {
    calendar_id: integration.calendarId,
    summary: `${eventType.title} with ${guestName}`,
    description: buildEventDescription({ eventType, customAnswers, manageToken, appUrl: APP_URL }),
    start_datetime: startUtc.toISOString(),
    timezone: "UTC",
    event_duration_minutes: eventType.durationMinutes,
    attendees: [{ email: guestEmail, displayName: guestName }],
    create_meeting_room: eventType.location.type === "google_meet",
    send_updates: "all"     // Google sends invite emails to attendees
  }
})
```
Returned object includes `id` (stored as `googleEventId`) and the conferencing data when Meet was requested. The Meet link is parsed out and stored in `bookings.meetLink`.

The event description includes a section like:
```
Need to make a change?
Reschedule or cancel: ${APP_URL}/b/${manageToken}
```
This is the only place the manage URL is exposed to the guest, satisfying the reschedule/cancel requirement under the "Google Calendar handles all email" notification choice.

### Cancel a booking
`lib/calendar.deleteCalendarEvent()` calls:
```ts
composio.tools.execute("GOOGLECALENDAR_DELETE_EVENT", {
  userId,
  arguments: {
    calendar_id: integration.calendarId,
    event_id: booking.googleEventId,
    send_updates: "all"
  }
})
```
Google Calendar emails the guest the cancellation automatically.

### Connection failure handling
- On any `tools.execute` call, if Composio returns a connection-level error (status `EXPIRED` or `FAILED`), the calendar wrapper throws a typed `CalendarConnectionError`.
- The admin UI surfaces a banner: "Google Calendar connection lost — reconnect in Settings."
- The public booking page falls back to "Booking is temporarily unavailable" rather than showing stale availability. This is preferable to silently letting overlapping bookings be created.

### Personal Gmail vs Workspace Meet caveat
Per Composio docs: `create_meeting_room: true` "by default adds Google Meet link (works for Workspace, gracefully falls back for personal Gmail)." On personal Gmail, no link is generated. The implementation must:
- Treat `meetLink` as nullable everywhere
- On the booking confirmation + the calendar event description, only render the Meet link section if it exists
- For personal Gmail accounts, the event-type "Google Meet" location should still create the event successfully but without a Meet link. The admin should validate this on first setup and may switch the location to "custom" with their own conferencing URL if needed.

## 8. Availability computation (`lib/availability.ts`)

A pure function: takes the inputs, returns the slots. No I/O. Algorithm:

1. **Window:** `[max(now + minNoticeMinutes, today), today + maxAdvanceDays]`, expressed in the admin's timezone.
2. **Per-day candidate intervals:** for each date in the window:
   - If a `dateOverride` exists for the date, use its intervals (empty intervals = day blocked).
   - Otherwise, use `weeklyHours[dayOfWeek].intervals`.
3. **Slot generation:** within each interval, generate slots stepping by `durationMinutes + bufferAfterMin`, where each slot is `[t, t + durationMinutes]`. (Buffer-before is handled below.)
4. **Subtract busy times:** drop any candidate slot whose `[start - bufferBefore, end + bufferAfter]` overlaps a busy interval from Google Calendar.
5. **Apply max bookings per day:** count existing `confirmed` bookings on the same date (in the admin's TZ). If at the cap, drop remaining slots for that day.
6. **Output:** `Array<{ startUtc: Date, endUtc: Date }>`, sorted.

DST is handled by `date-fns-tz` — interval boundaries are computed in the admin's TZ, then converted to UTC. Slot generation across a DST transition produces slots whose UTC duration is correct (the wall-clock minute spacing stays even).

The function is unit-tested with fixtures covering: simple weekday, split-shift day, day with override blocking it, day with override extending hours, DST spring-forward day, DST fall-back day, slot-vs-busy overlap edge cases, max-per-day cap, min-notice cutoff inside the working day.

## 9. Public booking flow

### `/` — public profile
Server-rendered. Loads `users.findOne()` + `eventTypes.find({ active: true }).sort({ position: 1 })`. Renders:
- Header: name in Fraunces Display 56px, bio in Geist 18px, generous spacing
- Event-type cards in a single column on mobile, 2-up on desktop. Each card: color stripe, title in Fraunces, duration + location-icon in Geist Mono, short description
- Subtle grain noise overlay on the background (CSS `background-image: url(/grain.svg)` with low opacity)
- Footer: small "Powered by Kalendly" mark

### `/[slug]` — booking page
Server-rendered. Loads the event type, computes 30 days of availability via `lib/availability.ts` after a single `getBusyTimes()` Composio call.

**Layout (desktop):** two-pane. Left pane (40%): event-type info — title (Fraunces), duration / location / timezone (Geist Mono), description (Geist), a small "Hosted by [name]" line. Right pane (60%): calendar grid (current month, navigable) on top, time slots below.

**Layout (mobile):** stacked. Event info collapsed to a header strip. Calendar full-width. Slots below.

Slots render in Geist Mono with tabular-nums:
```
9:00 AM
9:30 AM
10:00 AM
```
Hover: subtle iris-tint background fade. Click: locks in selection (slot button gets primary fill + white text), reveals a "Confirm" button.

Timezone: detected from `Intl.DateTimeFormat().resolvedOptions().timeZone`, displayed as a small "Detected: America/New_York · Change ↓" link that opens a TZ-search dropdown.

Slot data is server-side cached for 30 seconds (`revalidate: 30`) on the page itself — keeps Composio calls bounded if the page is shared widely.

### `/[slug]/confirm`
Receives `?start=<isoUtc>` from the slot click. Re-validates that the slot is still available (server-side fetch) before rendering — if not, redirects back with a "That slot was just taken" toast.

Form fields:
- Name (required)
- Email (required, format-validated)
- Each `customQuestion` rendered according to its type, with proper labeling
- Final "Schedule Event" button in primary iris

Submit posts to `POST /api/bookings`. On success, redirects to `/[slug]/booked?token=<manageToken>`.

### `/[slug]/booked`
Reads the booking by token, shows confirmation. Includes:
- Big checkmark in iris
- "Confirmed for Tuesday, May 5 at 9:30 AM" (Fraunces date, Geist Mono time)
- "An invite has been sent to <guestEmail>"
- Meet link if present
- "Need to make a change?" link → `/b/<token>`
- Add-to-calendar fallback button: generates an `.ics` blob client-side from the booking data (for guests who don't use Google)

## 10. Reschedule / cancel flow

`/b/[token]` server-loads the booking. If not found, status `cancelled`, status `rescheduled`, or `endUtc` is in the past, render the generic "Booking not found or already cancelled" page (no token-existence leak). When a booking is rescheduled, the new booking issues a fresh `manageToken` that becomes the only active link.

Otherwise, render:
- The booking summary
- Two buttons: **Reschedule** (primary) / **Cancel** (danger outline)

### Cancel
- Click → confirm modal ("Cancel this booking?")
- Confirm → `DELETE /api/bookings/[token]`
- Server: load booking, mark `status = "cancelled"`, `cancelledAt = now`, call `calendar.deleteCalendarEvent`. Order matters: DB write first (so the token can't double-cancel), then Google Calendar delete. If Google delete fails, surface to admin via the dashboard "needs attention" panel — the booking is still marked cancelled in our system, but the admin can manually delete the Google event.
- Render "Cancelled" state in place.

### Reschedule
- Click → redirect to `/[slug]?reschedule=<token>`. The booking page renders in "rescheduling" mode: a small banner at top showing the current time and "Pick a new time below to reschedule".
- Selecting + confirming a new slot calls `PATCH /api/bookings/[token]` with `{ newStartUtc }`.
- Server flow:
  1. Validate new slot is still available
  2. Create a new booking row (`status = "confirmed"`, fresh `manageToken`)
  3. Call `calendar.createCalendarEvent` for the new slot
  4. Mark old booking `status = "rescheduled"`, `rescheduledToBookingId = newBookingId`
  5. Call `calendar.deleteCalendarEvent` on the old `googleEventId`
  6. Return `{ newToken }`; the guest is redirected to `/[slug]/booked?token=<newToken>`
- Google Calendar sends a cancellation for the old event and an invite for the new event automatically.
- The original token stops resolving (status check rejects `rescheduled`). The new token is the source of truth going forward.

## 11. Admin UI surface

All admin pages share a sidebar layout: logo at top, sections (Dashboard, Event Types, Availability, Bookings, Settings), profile + sign-out at the bottom. Sidebar collapses to a top bar on mobile.

### `/dashboard`
- Three KPI tiles (Geist Mono numerals): "Bookings this week", "Bookings next 7 days", "This month"
- "Next 5 bookings" list — guest name, event-type name with color stripe, time in Geist Mono, click → side panel with full details
- "Connect Google Calendar" callout if no active integration (only place to start the OAuth flow on first run, plus `/settings`)

### `/event-types`
- Card grid with drag handle for ordering (`position` field)
- Each card: color stripe, title (Fraunces), slug + duration (Geist Mono), description excerpt, copy-link button, active toggle, edit button
- Top-right: large "+ New event type" primary button

### `/event-types/new` and `/event-types/[id]/edit`
Sectioned form on a single page (no wizard). Sections collapse-expandable but default open:
- **Basics** — title, slug (auto-suggested from title, editable, validated unique), description (markdown textarea with preview tab), color picker (5 swatches), duration (preset buttons 15/30/45/60/90/custom)
- **Location** — radio: Google Meet / Phone / Custom; conditional fields below
- **Scheduling rules** — buffer before, buffer after, min notice, max advance days, max bookings per day
- **Custom questions** — repeater with add/remove/reorder; each item has label, type, required toggle, options (when type === select)
- **Status** — active toggle; danger zone with delete button

Save uses a server action; on success returns to `/event-types`.

### `/availability`
Single screen.
- Top: timezone selector (autocomplete IANA list)
- Weekly grid: 7 rows, one per day. Each row has a toggle (available/unavailable) and a stack of interval rows with start + end time pickers. "Add interval" button per day for split shifts.
- Below the weekly grid: "Date overrides" — calendar widget; clicking a date opens a small panel to add/edit/remove that date's intervals (or block the date entirely)
- Save button is sticky at the bottom; saves the entire availability document atomically

### `/bookings`
- Tabs: Upcoming / Past / Cancelled
- Filter: event type (multi-select)
- Table: guest name, event-type with color stripe, start time (Geist Mono), status pill
- Row click opens a side panel with full details, custom answers, and a "Cancel booking" button (admin can cancel from here too — same flow as guest cancel)

### `/settings`
- **Profile** — name, bio, default timezone
- **Google Calendar** — connection status pill (active/expired/none), calendar dropdown (loaded via `GOOGLECALENDAR_LIST_CALENDARS`), reconnect / disconnect buttons
- **Password** — single button "Generate new password hash" → opens a modal that runs the `set-password` script via a server action and shows the new bcrypt hash for the admin to paste into `.env.local`. Note: the running session continues with the old password until the env var is updated and the server restarts.

## 12. Design system

### Typography
| Role | Family | Notes |
|---|---|---|
| Display | Fraunces (variable, optical-size + weight) | Headlines, event-type titles, the wordmark. Weight 500, optical size auto. |
| UI / body | Geist (sans, variable) | All UI text. Weight 400 default, 500 for emphasis. |
| Numerals / time | Geist Mono | Time slots, durations, dates, KPI numbers. `font-variant-numeric: tabular-nums`. |

All loaded via `next/font/google` for self-hosting, automatic preloading, and zero CLS.

### Color tokens (Tailwind theme)
```
--background:     #FAFAF7   warm off-white
--surface:        #FFFFFF
--ink:            #1A1625   near-black with purple undertone
--ink-soft:       #4A4458
--ink-muted:      #8A8499
--border:         #EAE7E0   warm border
--border-strong:  #D8D4CB

--primary:        #5B2AB8   iris (the brand color)
--primary-hover:  #4A1FA3
--primary-tint:   #F1EBFF   selected-slot bg, hover fill
--primary-ink:    #FFFFFF   text on primary surfaces

--success:        #2F7A52
--danger:         #B23B3B
--warning:        #B27A3B
```

### Event-type color palette (5 swatches)
Each maps to a `{ stripe, dot, tint }` token triple used on cards and slots:
- iris (primary) — `#5B2AB8`
- rose — `#B23B5E`
- amber — `#B27A3B`
- sage — `#5E8B6A`
- slate — `#4A5562`

Closed enum, no custom hex picker — keeps the visual system coherent.

### Spacing & elevation
- Spacing scale: standard Tailwind 4 / 8 grid
- Border radius: cards `rounded-xl` (12px); inputs `rounded-lg` (8px); buttons `rounded-lg`
- Shadows: only one elevation — a single soft shadow on cards on hover (`0 8px 24px -12px rgba(26,22,37,0.10)`). No layered drop-shadow stacks.
- Borders preferred over shadows for static elements

### Motion
- Page-load orchestrated reveal: top-down fade-up, 60ms stagger, total ≤ 400ms
- Calendar day select: scale 0.96 → 1.0, color transition, 180ms
- Slot hover: background-color 120ms ease-out
- Page transitions: cross-fade only (no slide, no morph)
- All animations respect `prefers-reduced-motion` (collapse to instant)

### Atmosphere
- Single grain SVG overlay (`/public/grain.svg`) at 0.04 opacity on the public profile (`/`) only. Static, not animated.
- No gradients anywhere in the UI. The brand is solid color + typographic confidence.

## 13. Logo specification

### Wordmark
"Kalendly" set in **Fraunces 500, optical-size 144, tracking -0.01em**. The capital **K**'s upper-right terminal extends slightly beyond the standard glyph and ends in a small filled circle (the "date marker") in iris `#5B2AB8`. The rest of the wordmark is `--ink`.

Two SVG variants delivered at `/public/logo/`:
- `wordmark.svg` — full "Kalendly" with the iris dot accent
- `mark.svg` — standalone K monogram derived from the same wordmark, square crop, used for favicons (32×32, 192×192) and avatar placements

The SVGs are inlined in the header components for color-customizability if needed (e.g. white-on-iris when used over a primary surface).

### Favicon set
Generated from `mark.svg`:
- `/favicon.ico` (32×32)
- `/icon.svg` (vector)
- `/apple-icon.png` (180×180)
- `/icon-192.png`, `/icon-512.png` for PWA manifest

## 14. Environment variables

`.env.local`:
```
# Database
MONGODB_URI=mongodb+srv://...

# NextAuth
NEXTAUTH_SECRET=                       # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# Admin credentials
ADMIN_EMAIL=albert@shiney.ai
ADMIN_PASSWORD_HASH=                   # set via npm run set-password

# App
APP_URL=http://localhost:3000          # used in calendar-event manage links

# Composio (auth config is auto-provisioned via the API on first connect)
COMPOSIO_API_KEY=
```

Production `.env`s on Vercel mirror the same keys with production values (HTTPS URLs, production Mongo URI).

## 15. Setup checklist

1. Provision MongoDB Atlas free cluster → IP allow-list → connection string → paste as `MONGODB_URI`
2. Run `openssl rand -base64 32` → paste as `NEXTAUTH_SECRET`
3. Sign up at composio.dev → API Settings → copy API key → paste as `COMPOSIO_API_KEY`. The auth config is created automatically on first connect.
4. Run `npm run set-password`, type a strong password → copy printed bcrypt hash → paste as `ADMIN_PASSWORD_HASH`
5. `npm run dev` → open `localhost:3000/login` → sign in with email + password
6. Navigate to `/settings` → "Connect Google Calendar" → complete OAuth
7. In `/settings`, confirm the active calendar selection
8. Set weekly availability in `/availability`
9. Create one or more event types in `/event-types`
10. Copy a public link → test-book yourself in an incognito window → confirm:
    - Booking page shows correct slots
    - Submit creates a Google Calendar event
    - Guest email receives the Google Calendar invite
    - Manage link in the calendar invite description works
    - Cancel via manage link removes the Google event and emails the cancellation

## 16. Open follow-ups (post-v1)

These are tracked here as known future work, explicitly out of scope for v1:

- White-labeled OAuth consent (custom Google Cloud OAuth app → switch Composio auth config to `use_custom_auth`, displays "Kalendly" instead of "Composio")
- Custom-domain support (deploy `kalendly.<your-domain>`)
- Dark-mode variant (opt-in toggle, separate token set)
- Multiple Google calendars for conflict-checking (read from N, write to one)
- Calendar-event-edit listener (Composio trigger) so manual edits in Google Calendar reflect in the admin's bookings table

## 17. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Race: two guests pick the same slot simultaneously | Double-booking | Re-fetch busy times + re-validate inside `POST /api/bookings`; second submission gets 409 with a "slot taken" message |
| Composio outage | Booking page unavailable | Public booking page renders a clear "Temporarily unavailable" state on Composio errors; never serves stale availability that could lead to double-bookings |
| Google deletes our access (token revoked outside Kalendly) | Admin's calendar disconnects silently | `lib/calendar` returns typed `CalendarConnectionError`; admin dashboard surfaces a banner; public booking page disables booking |
| Personal Gmail Meet fallback (no link generated) | Booking confirmation shows missing Meet link | All Meet-link rendering is guarded; admin notified via setup checklist to verify on first booking |
| `manageToken` URL leaks | Anyone with link can cancel/reschedule | Acceptable per Calendly's own model; tokens are not enumerable (256 bits); 90-day TTL after meeting end |
| Admin loses `.env.local` (e.g. forgets bcrypt hash) | Locked out of admin | Recovery: SSH to Vercel env vars and reset `ADMIN_PASSWORD_HASH`; documented in setup checklist |
| MongoDB free-tier limits exceeded | Booking failures | Single-user scale: bookings are <1KB each, well under free-tier ceiling; not a near-term risk |

## 18. Acceptance criteria

The implementation is "done" when:
1. Admin can log in at `/login` with email + bcrypt-validated password from env
2. Admin can connect Google Calendar via Composio OAuth and pick which calendar to use
3. Admin can create at least 3 event types with different durations, locations, and custom questions
4. Admin can set weekly availability + at least one date override
5. The public profile at `/` lists active event types in correct order
6. A guest can visit `/[slug]`, see correct available slots (respecting busy times, buffers, min notice, max advance), pick a time, fill out the form, and confirm
7. The booking creates a Google Calendar event with the guest as attendee, a Meet link (if Workspace), and the manage URL in the description
8. The guest receives the Google Calendar invite (verified by Google's own delivery)
9. The guest can visit the manage URL and cancel — the Google event is removed and Google emails the cancellation
10. The guest can visit the manage URL and reschedule — old event removed, new event created, new Meet link generated, new manage URL provided
11. Branding matches the spec: Fraunces wordmark with iris dot accent, Geist UI, Geist Mono numerals, off-white background, no purple gradients
12. All admin routes are protected by middleware
13. Login is rate-limited; Composio failures are surfaced clearly

---
