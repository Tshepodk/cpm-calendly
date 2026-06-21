# Kalendly Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Kalendly v1 — a single-admin Calendly clone with public booking pages, Google Calendar integration via Composio, and an editorial-minimalist design — end-to-end per `docs/superpowers/specs/2026-04-29-kalendly-design.md`.

**Architecture:** Single Next.js 15 App Router app. Admin UI behind NextAuth Credentials. MongoDB for persistence. Composio Node SDK as the only Google Calendar client. Pure availability computation in `lib/availability.ts` with full unit tests. Server Actions for admin mutations, REST routes for public booking writes.

**Tech Stack:** Next.js 15 · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui · NextAuth v5 (Auth.js) · MongoDB official driver · `@composio/core` · Zod · `bcryptjs` · `date-fns` + `date-fns-tz` · Vitest · `next/font` (Fraunces, Geist, Geist Mono).

**Working directory:** `/Users/albertbakhoj/Desktop/kalendly` (already a git repo with the spec committed on `main`).

---

## File Structure

This plan creates the following structure. Each file has one clear responsibility — see Section 4 of the spec for module boundaries.

```
kalendly/
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── vitest.config.ts
├── components.json                      # shadcn config
├── middleware.ts
├── auth.ts                              # NextAuth v5 config (root)
├── .env.example                         # template (committed)
├── .env.local                           # gitignored
├── .gitignore
│
├── app/
│   ├── layout.tsx                       # root html, fonts, providers
│   ├── globals.css                      # tokens + base + tailwind
│   ├── (admin)/
│   │   ├── layout.tsx                   # sidebar shell, requireAdmin()
│   │   ├── dashboard/page.tsx
│   │   ├── event-types/page.tsx
│   │   ├── event-types/new/page.tsx
│   │   ├── event-types/[id]/edit/page.tsx
│   │   ├── availability/page.tsx
│   │   ├── bookings/page.tsx
│   │   └── settings/page.tsx
│   ├── (auth)/
│   │   └── login/page.tsx               # outside admin layout (no sidebar)
│   ├── (public)/
│   │   ├── layout.tsx                   # public chrome (footer, grain)
│   │   ├── page.tsx                     # public profile
│   │   ├── [slug]/page.tsx              # booking page
│   │   ├── [slug]/confirm/page.tsx      # booking form
│   │   ├── [slug]/booked/page.tsx       # confirmation
│   │   └── b/[token]/page.tsx           # guest manage
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── availability/[slug]/route.ts
│       ├── bookings/route.ts
│       ├── bookings/[token]/route.ts
│       └── integrations/google/callback/route.ts
│
├── components/
│   ├── ui/                              # shadcn primitives (button, input, etc)
│   ├── brand/
│   │   ├── Wordmark.tsx
│   │   └── Mark.tsx
│   ├── admin/
│   │   ├── Sidebar.tsx
│   │   ├── KpiTile.tsx
│   │   ├── EventTypeCard.tsx
│   │   ├── EventTypeForm.tsx
│   │   ├── AvailabilityEditor.tsx
│   │   ├── BookingsTable.tsx
│   │   └── SettingsSections.tsx
│   └── public/
│       ├── ProfileCard.tsx
│       ├── BookingCalendar.tsx
│       ├── SlotPicker.tsx
│       ├── BookingForm.tsx
│       └── ManagePanel.tsx
│
├── lib/
│   ├── db.ts
│   ├── collections.ts                   # typed accessors
│   ├── types.ts                         # shared types
│   ├── auth-helpers.ts                  # requireAdmin, getSession
│   ├── calendar.ts                      # Composio wrapper
│   ├── composio.ts                      # composio client singleton
│   ├── availability.ts                  # pure slot computation
│   ├── booking.ts                       # booking orchestration
│   ├── tokens.ts
│   ├── timezone.ts
│   ├── validation.ts                    # Zod schemas
│   ├── rate-limit.ts
│   └── env.ts                           # validated env loader
│
├── server-actions/
│   ├── event-types.ts
│   ├── availability.ts
│   ├── settings.ts
│   ├── bookings.ts
│   └── integrations.ts
│
├── scripts/
│   └── set-password.ts
│
├── public/
│   ├── grain.svg
│   ├── logo/
│   │   ├── wordmark.svg
│   │   └── mark.svg
│   ├── favicon.ico
│   ├── icon.svg
│   ├── apple-icon.png
│   └── manifest.json
│
├── tests/
│   ├── availability.test.ts
│   ├── tokens.test.ts
│   └── timezone.test.ts
│
└── docs/superpowers/
    ├── specs/2026-04-29-kalendly-design.md
    └── plans/2026-04-29-kalendly-implementation.md
```

---

## Tasks

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `.gitignore`, `.env.example`

- [ ] **Step 1: Scaffold the Next.js project**

Run from `/Users/albertbakhoj/Desktop/kalendly`:
```bash
npx --yes create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm --turbopack --no-experimental-https
```
Choose defaults at any remaining prompts. The empty directory + existing `.git` is fine — `create-next-app` writes around them.

Expected: produces `app/`, `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `tailwind` v4 setup, `.gitignore`.

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install next-auth@^5.0.0-beta mongodb @composio/core bcryptjs zod date-fns date-fns-tz clsx class-variance-authority lucide-react @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-select @radix-ui/react-label @radix-ui/react-toast @radix-ui/react-popover @radix-ui/react-checkbox tailwind-merge react-day-picker
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install --save-dev @types/bcryptjs vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom mongodb-memory-server tsx
```

- [ ] **Step 4: Add npm scripts to `package.json`**

Open `package.json`. The `scripts` section should be:
```json
"scripts": {
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest",
  "set-password": "tsx scripts/set-password.ts",
  "typecheck": "tsc --noEmit"
}
```

- [ ] **Step 5: Replace `.gitignore`**

Replace the contents of `.gitignore` with:
```
# deps
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# testing
/coverage

# next.js
/.next/
/out/
*.tsbuildinfo
next-env.d.ts

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env (KEEP .env.example)
.env
.env*.local
.env.local

# vercel
.vercel

# vitest
/coverage
```

- [ ] **Step 6: Create `.env.example`**

Create `.env.example`:
```
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/kalendly

# NextAuth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Admin credentials (single user)
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD_HASH=

# App
APP_URL=http://localhost:3000

# Composio
COMPOSIO_API_KEY=
COMPOSIO_GOOGLE_AUTH_CONFIG_ID=
```

- [ ] **Step 7: Create `.env.local` (gitignored, for development)**

```bash
cp .env.example .env.local
```
Open `.env.local` and fill in real values for development:
- `MONGODB_URI`: free Atlas cluster URI (set up later before first run)
- `NEXTAUTH_SECRET`: run `openssl rand -base64 32`
- `ADMIN_EMAIL`: your email
- `ADMIN_PASSWORD_HASH`: leave blank for now, filled in Task 7
- `COMPOSIO_API_KEY` / `COMPOSIO_GOOGLE_AUTH_CONFIG_ID`: leave blank for now, filled in setup checklist

- [ ] **Step 8: Configure strict TypeScript**

Open `tsconfig.json` and ensure `compilerOptions` includes:
```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "forceConsistentCasingInFileNames": true,
  "skipLibCheck": true
}
```
Keep all the create-next-app defaults; add the keys above if missing.

- [ ] **Step 9: Verify the scaffold runs**

```bash
npm run dev
```
Expected: server starts at http://localhost:3000 and the default Next.js page loads. Stop the server with Ctrl-C.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 15 + Tailwind + deps

Initialize project with TypeScript, Tailwind v4, shadcn-ready
deps, NextAuth v5, MongoDB driver, Composio core, Vitest."
```

---

### Task 2: Design tokens, fonts, and global CSS

**Files:**
- Create: `app/globals.css` (replace), `app/layout.tsx` (replace)
- Modify: `tailwind.config.ts` if generated, otherwise tokens live in CSS for Tailwind v4

- [ ] **Step 1: Replace `app/globals.css`**

Replace the entire contents with:
```css
@import "tailwindcss";

@theme {
  --color-background: #FAFAF7;
  --color-surface: #FFFFFF;
  --color-ink: #1A1625;
  --color-ink-soft: #4A4458;
  --color-ink-muted: #8A8499;
  --color-border: #EAE7E0;
  --color-border-strong: #D8D4CB;

  --color-primary: #5B2AB8;
  --color-primary-hover: #4A1FA3;
  --color-primary-tint: #F1EBFF;
  --color-primary-ink: #FFFFFF;

  --color-success: #2F7A52;
  --color-danger: #B23B3B;
  --color-warning: #B27A3B;

  --color-event-iris:  #5B2AB8;
  --color-event-rose:  #B23B5E;
  --color-event-amber: #B27A3B;
  --color-event-sage:  #5E8B6A;
  --color-event-slate: #4A5562;

  --font-display: var(--font-fraunces), Georgia, serif;
  --font-sans:    var(--font-geist), ui-sans-serif, system-ui, sans-serif;
  --font-mono:    var(--font-geist-mono), ui-monospace, "SF Mono", monospace;

  --radius-card:  12px;
  --radius-input: 8px;
  --radius-pill:  9999px;
}

html, body {
  background: var(--color-background);
  color: var(--color-ink);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

h1, h2, h3, h4 {
  font-family: var(--font-display);
  letter-spacing: -0.01em;
}

.font-display { font-family: var(--font-display); }
.font-sans    { font-family: var(--font-sans); }
.font-mono    { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }

.tabular { font-variant-numeric: tabular-nums; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-up { animation: fadeUp 320ms ease-out both; }
```

- [ ] **Step 2: Replace `app/layout.tsx` to wire fonts**

```tsx
import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600"],
  display: "swap",
});
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kalendly",
  description: "Schedule a meeting.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${geist.variable} ${geistMono.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Replace `app/page.tsx` with a placeholder so the app boots**

```tsx
export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <h1 className="text-4xl font-display">Kalendly</h1>
    </main>
  );
}
```

- [ ] **Step 4: Verify**

```bash
npm run dev
```
Open http://localhost:3000 — confirm the "Kalendly" headline renders in a serif (Fraunces) on a warm off-white background. Ctrl-C to stop.

- [ ] **Step 5: Commit**

```bash
git add app/ tailwind.config.ts || true
git add app/
git commit -m "feat: design tokens + fonts (Fraunces / Geist / Geist Mono)

Wire Tailwind v4 @theme tokens for ink/iris/border palette and
expose CSS variables for next/font families. Add reduced-motion
guard + fade-up keyframe."
```

---

### Task 3: shadcn/ui base setup

**Files:**
- Create: `components.json`, `lib/utils.ts`, `components/ui/*`

- [ ] **Step 1: Initialize shadcn**

```bash
npx --yes shadcn@latest init -d
```
At prompts: Style = Default, Base color = Neutral, CSS variables = Yes. Accept defaults.

- [ ] **Step 2: Add the shadcn primitives we'll use**

```bash
npx --yes shadcn@latest add button input label textarea select dialog tabs card toast popover checkbox calendar form switch dropdown-menu separator badge
```

- [ ] **Step 3: Override `components/ui/button.tsx` variants for the iris primary**

Open `components/ui/button.tsx`. Find the `buttonVariants` declaration and replace the `variant` block with:
```ts
variant: {
  default: "bg-[--color-primary] text-[--color-primary-ink] hover:bg-[--color-primary-hover] shadow-sm",
  destructive: "bg-[--color-danger] text-white hover:opacity-90",
  outline: "border border-[--color-border-strong] bg-[--color-surface] hover:bg-[--color-primary-tint] text-[--color-ink]",
  secondary: "bg-[--color-primary-tint] text-[--color-ink] hover:bg-[--color-primary-tint]/80",
  ghost: "hover:bg-[--color-primary-tint] text-[--color-ink]",
  link: "text-[--color-primary] underline-offset-4 hover:underline",
},
```
Leave `size` and other parts as generated.

- [ ] **Step 4: Verify**

```bash
npm run typecheck
```
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add components/ lib/utils.ts components.json
git commit -m "feat: shadcn primitives + iris button variants"
```

---

### Task 4: Logo SVGs and favicons

**Files:**
- Create: `public/logo/wordmark.svg`, `public/logo/mark.svg`, `public/grain.svg`, `public/icon.svg`, `app/icon.svg` (Next.js icon convention), `components/brand/Wordmark.tsx`, `components/brand/Mark.tsx`

- [ ] **Step 1: Create `public/logo/wordmark.svg`**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 64" role="img" aria-label="Kalendly">
  <text x="0" y="46" font-family="'Fraunces', Georgia, serif" font-size="48" font-weight="500" letter-spacing="-0.5" fill="#1A1625">Kalendly</text>
  <circle cx="49" cy="14" r="5" fill="#5B2AB8"/>
</svg>
```

- [ ] **Step 2: Create `public/logo/mark.svg`**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Kalendly">
  <rect width="64" height="64" rx="12" fill="#FAFAF7"/>
  <text x="14" y="50" font-family="'Fraunces', Georgia, serif" font-size="56" font-weight="500" fill="#1A1625">K</text>
  <circle cx="49" cy="14" r="5" fill="#5B2AB8"/>
</svg>
```

- [ ] **Step 3: Create `public/icon.svg` and `app/icon.svg`**

Both files identical to `public/logo/mark.svg` content above. Next.js will use `app/icon.svg` automatically as the favicon.

- [ ] **Step 4: Create `public/grain.svg` (subtle noise overlay)**

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <filter id="n">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/>
    <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.04 0"/>
  </filter>
  <rect width="100%" height="100%" filter="url(#n)"/>
</svg>
```

- [ ] **Step 5: Create `components/brand/Wordmark.tsx`**

```tsx
import Image from "next/image";

export function Wordmark({ className }: { className?: string }) {
  return (
    <Image
      src="/logo/wordmark.svg"
      alt="Kalendly"
      width={160}
      height={32}
      className={className}
      priority
    />
  );
}
```

- [ ] **Step 6: Create `components/brand/Mark.tsx`**

```tsx
import Image from "next/image";

export function Mark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo/mark.svg"
      alt="Kalendly"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
```

- [ ] **Step 7: Use the wordmark on the home page**

Replace `app/page.tsx`:
```tsx
import { Wordmark } from "@/components/brand/Wordmark";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <Wordmark className="h-12 w-auto" />
    </main>
  );
}
```

- [ ] **Step 8: Verify**

```bash
npm run dev
```
Open http://localhost:3000 — the "Kalendly" wordmark renders with the iris dot accent on the K. Ctrl-C.

- [ ] **Step 9: Commit**

```bash
git add public/ app/icon.svg app/page.tsx components/brand/
git commit -m "feat: brand assets (wordmark + K mark + grain overlay)"
```

---

### Task 5: MongoDB client + types + accessors

**Files:**
- Create: `lib/env.ts`, `lib/db.ts`, `lib/types.ts`, `lib/collections.ts`

- [ ] **Step 1: Create `lib/env.ts`**

```ts
import { z } from "zod";

const schema = z.object({
  MONGODB_URI: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url(),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD_HASH: z.string().min(1),
  APP_URL: z.string().url(),
  COMPOSIO_API_KEY: z.string().min(1),
  COMPOSIO_GOOGLE_AUTH_CONFIG_ID: z.string().min(1),
});

let parsed: z.infer<typeof schema> | null = null;

export function env() {
  if (parsed) return parsed;
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Missing/invalid env vars: ${missing}`);
  }
  parsed = result.data;
  return parsed;
}
```

- [ ] **Step 2: Create `lib/types.ts`**

```ts
import type { ObjectId } from "mongodb";

export type EventColor = "iris" | "rose" | "amber" | "sage" | "slate";

export type CustomQuestion =
  | { id: string; label: string; type: "short_text" | "long_text"; required: boolean }
  | { id: string; label: string; type: "select"; required: boolean; options: string[] };

export type LocationSpec =
  | { type: "google_meet" }
  | { type: "phone"; phoneNumber: string }
  | { type: "custom"; customText: string };

export interface UserDoc {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  bio: string | null;
  defaultTimezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ConnectionStatus = "ACTIVE" | "EXPIRED" | "FAILED" | "INACTIVE" | "INITIATED";

export interface IntegrationDoc {
  _id: ObjectId;
  userId: ObjectId;
  provider: "google_calendar";
  composioConnectionId: string;
  composioUserId: string;
  status: ConnectionStatus;
  calendarId: string;
  calendarSummary: string;
  connectedAt: Date;
  lastCheckedAt: Date;
}

export interface EventTypeDoc {
  _id: ObjectId;
  slug: string;
  title: string;
  description: string;
  durationMinutes: number;
  color: EventColor;
  location: LocationSpec;
  rules: {
    bufferBeforeMin: number;
    bufferAfterMin: number;
    minNoticeMinutes: number;
    maxAdvanceDays: number;
    maxBookingsPerDay: number | null;
  };
  customQuestions: CustomQuestion[];
  active: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AvailabilityDoc {
  _id: ObjectId;
  userId: ObjectId;
  timezone: string;
  weeklyHours: Array<{
    dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    intervals: Array<{ start: string; end: string }>;
  }>;
  dateOverrides: Array<{
    date: string;
    intervals: Array<{ start: string; end: string }>;
  }>;
  updatedAt: Date;
}

export type BookingStatus = "confirmed" | "cancelled" | "rescheduled";

export interface BookingDoc {
  _id: ObjectId;
  eventTypeSlug: string;
  eventTypeId: ObjectId;
  guestName: string;
  guestEmail: string;
  guestTimezone: string;
  customAnswers: Record<string, string>;
  startUtc: Date;
  endUtc: Date;
  googleEventId: string;
  meetLink: string | null;
  manageToken: string;
  status: BookingStatus;
  rescheduledToBookingId: ObjectId | null;
  createdAt: Date;
  cancelledAt: Date | null;
}
```

- [ ] **Step 3: Create `lib/db.ts`**

```ts
import { MongoClient, type Db } from "mongodb";
import { env } from "./env";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (db) return db;
  client = new MongoClient(env().MONGODB_URI);
  await client.connect();
  db = client.db("kalendly");
  return db;
}
```

- [ ] **Step 4: Create `lib/collections.ts` with typed accessors and an index initializer**

```ts
import type { Collection } from "mongodb";
import { getDb } from "./db";
import type {
  UserDoc,
  IntegrationDoc,
  EventTypeDoc,
  AvailabilityDoc,
  BookingDoc,
} from "./types";

export async function users(): Promise<Collection<UserDoc>> {
  return (await getDb()).collection<UserDoc>("users");
}
export async function integrations(): Promise<Collection<IntegrationDoc>> {
  return (await getDb()).collection<IntegrationDoc>("integrations");
}
export async function eventTypes(): Promise<Collection<EventTypeDoc>> {
  return (await getDb()).collection<EventTypeDoc>("eventTypes");
}
export async function availability(): Promise<Collection<AvailabilityDoc>> {
  return (await getDb()).collection<AvailabilityDoc>("availability");
}
export async function bookings(): Promise<Collection<BookingDoc>> {
  return (await getDb()).collection<BookingDoc>("bookings");
}

let indexesEnsured = false;

export async function ensureIndexes() {
  if (indexesEnsured) return;
  const [et, bk] = [await eventTypes(), await bookings()];
  await et.createIndex({ slug: 1 }, { unique: true });
  await et.createIndex({ active: 1, position: 1 });
  await bk.createIndex({ manageToken: 1 }, { unique: true });
  await bk.createIndex({ startUtc: 1 });
  await bk.createIndex({ status: 1, startUtc: 1 });
  await bk.createIndex({ endUtc: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });
  indexesEnsured = true;
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/env.ts lib/db.ts lib/types.ts lib/collections.ts
git commit -m "feat: env validation, Mongo client, typed collection accessors"
```

---

### Task 6: First-run user bootstrap

**Files:**
- Create: `lib/bootstrap.ts`

- [ ] **Step 1: Create `lib/bootstrap.ts`**

```ts
import { ObjectId } from "mongodb";
import { users, availability, ensureIndexes } from "./collections";
import { env } from "./env";

let bootstrapped = false;

export async function bootstrap() {
  if (bootstrapped) return;
  await ensureIndexes();

  const userCol = await users();
  const existing = await userCol.findOne({ email: env().ADMIN_EMAIL });
  if (!existing) {
    const userId = new ObjectId();
    await userCol.insertOne({
      _id: userId,
      email: env().ADMIN_EMAIL,
      passwordHash: env().ADMIN_PASSWORD_HASH,
      name: "Admin",
      bio: null,
      defaultTimezone: "UTC",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const availCol = await availability();
    await availCol.insertOne({
      _id: new ObjectId(),
      userId,
      timezone: "UTC",
      weeklyHours: [
        { dayOfWeek: 0, intervals: [] },
        { dayOfWeek: 1, intervals: [{ start: "09:00", end: "17:00" }] },
        { dayOfWeek: 2, intervals: [{ start: "09:00", end: "17:00" }] },
        { dayOfWeek: 3, intervals: [{ start: "09:00", end: "17:00" }] },
        { dayOfWeek: 4, intervals: [{ start: "09:00", end: "17:00" }] },
        { dayOfWeek: 5, intervals: [{ start: "09:00", end: "17:00" }] },
        { dayOfWeek: 6, intervals: [] },
      ],
      dateOverrides: [],
      updatedAt: new Date(),
    });
  } else if (existing.passwordHash !== env().ADMIN_PASSWORD_HASH) {
    // Keep DB in sync with env on hash rotation.
    await userCol.updateOne(
      { _id: existing._id },
      { $set: { passwordHash: env().ADMIN_PASSWORD_HASH, updatedAt: new Date() } }
    );
  }

  bootstrapped = true;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/bootstrap.ts
git commit -m "feat: first-run bootstrap (creates user + default availability)"
```

---

### Task 7: Password setup CLI

**Files:**
- Create: `scripts/set-password.ts`

- [ ] **Step 1: Create the script**

```ts
import bcrypt from "bcryptjs";
import readline from "node:readline";

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const password = await prompt("Enter new admin password: ");
  if (password.length < 12) {
    console.error("Password must be at least 12 characters.");
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 12);
  console.log("\n=== Add this line to .env.local ===");
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
  console.log("====================================\n");
}

main();
```

- [ ] **Step 2: Run it once and capture the hash**

```bash
npm run set-password
```
Type a strong password (≥ 12 characters). Copy the printed `ADMIN_PASSWORD_HASH=...` value and paste it into `.env.local`.

- [ ] **Step 3: Commit**

```bash
git add scripts/
git commit -m "feat: set-password CLI (bcrypt cost-12 hash for .env.local)"
```

---

### Task 8: NextAuth v5 with Credentials provider

**Files:**
- Create: `auth.ts` (root), `app/api/auth/[...nextauth]/route.ts`, `lib/auth-helpers.ts`, `next-auth.d.ts`

- [ ] **Step 1: Create `auth.ts` at the project root**

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { env } from "@/lib/env";
import { bootstrap } from "@/lib/bootstrap";
import { users } from "@/lib/collections";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: env().NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        if (parsed.data.email !== env().ADMIN_EMAIL) return null;

        await bootstrap();
        const user = await (await users()).findOne({ email: parsed.data.email });
        if (!user) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        return { id: user._id.toString(), email: user.email, name: user.name };
      },
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    authorized: ({ auth }) => !!auth?.user,
  },
});
```

- [ ] **Step 2: Create `app/api/auth/[...nextauth]/route.ts`**

```ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 3: Create `next-auth.d.ts` for typed sessions**

```ts
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string; email: string; name: string } & DefaultSession["user"];
  }
}
```

- [ ] **Step 4: Create `lib/auth-helpers.ts`**

```ts
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function getOptionalSession() {
  return auth();
}
```

- [ ] **Step 5: Verify type-check passes**

```bash
npm run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add auth.ts app/api/auth lib/auth-helpers.ts next-auth.d.ts
git commit -m "feat: NextAuth v5 Credentials provider + admin guard"
```

---

### Task 9: Login page

**Files:**
- Create: `app/(auth)/layout.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/login/login-form.tsx`

- [ ] **Step 1: Create `app/(auth)/layout.tsx`**

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen flex items-center justify-center px-6">{children}</main>;
}
```

- [ ] **Step 2: Create `app/(auth)/login/page.tsx`**

```tsx
import { Wordmark } from "@/components/brand/Wordmark";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in · Kalendly" };

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm space-y-10 animate-fade-up">
      <div className="flex flex-col items-center gap-2">
        <Wordmark className="h-8 w-auto" />
        <p className="text-sm text-[--color-ink-muted]">Admin sign-in</p>
      </div>
      <LoginForm />
    </div>
  );
}
```

- [ ] **Step 3: Create `app/(auth)/login/login-form.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/dashboard";
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    start(async () => {
      const res = await signIn("credentials", {
        redirect: false,
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      });
      if (res?.error) {
        setError("Invalid email or password.");
        return;
      }
      router.push(next);
    });
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {error && <p className="text-sm text-[--color-danger]">{error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Wire `next-auth/react` provider for the client `signIn` call**

The Credentials provider with `redirect: false` from a client component requires `next-auth/react` import — but NextAuth v5 also exposes server-action `signIn`. We use the client variant here. No additional provider wrapper needed; v5 ships with the React provider configured automatically.

- [ ] **Step 5: Smoke-test the login form (manual)**

```bash
npm run dev
```
Open http://localhost:3000/login — confirm form renders, submit with wrong creds shows "Invalid email or password." Submit with correct creds redirects to /dashboard (which 404s — fixed in Task 12). Ctrl-C.

- [ ] **Step 6: Commit**

```bash
git add app/\(auth\)/
git commit -m "feat: login page + form (NextAuth credentials sign-in)"
```

---

### Task 10: Middleware + rate limiter

**Files:**
- Create: `middleware.ts`, `lib/rate-limit.ts`

- [ ] **Step 1: Create `lib/rate-limit.ts`**

```ts
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (b.count >= limit) return { ok: false, remaining: 0, retryAfterMs: b.resetAt - now };
  b.count += 1;
  return { ok: true, remaining: limit - b.count };
}
```

- [ ] **Step 2: Create `middleware.ts` at the project root**

```ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isAdminRoute =
    req.nextUrl.pathname.startsWith("/dashboard") ||
    req.nextUrl.pathname.startsWith("/event-types") ||
    req.nextUrl.pathname.startsWith("/availability") ||
    req.nextUrl.pathname.startsWith("/bookings") ||
    req.nextUrl.pathname.startsWith("/settings");

  if (!isAdminRoute) return NextResponse.next();
  if (req.auth?.user) return NextResponse.next();

  const url = new URL("/login", req.url);
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/event-types/:path*",
    "/availability/:path*",
    "/bookings/:path*",
    "/settings/:path*",
  ],
};
```

- [ ] **Step 3: Verify**

```bash
npm run typecheck
npm run dev
```
Open http://localhost:3000/dashboard — confirm redirect to `/login?next=/dashboard`. Ctrl-C.

- [ ] **Step 4: Commit**

```bash
git add middleware.ts lib/rate-limit.ts
git commit -m "feat: route middleware + in-memory rate limiter"
```

---

### Task 11: Composio client + calendar wrapper (read methods)

**Files:**
- Create: `lib/composio.ts`, `lib/calendar.ts`

- [ ] **Step 1: Create `lib/composio.ts`**

```ts
import { Composio } from "@composio/core";
import { env } from "./env";

let client: Composio | null = null;

export function composio(): Composio {
  if (!client) client = new Composio({ apiKey: env().COMPOSIO_API_KEY });
  return client;
}

export class CalendarConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalendarConnectionError";
  }
}
```

- [ ] **Step 2: Create `lib/calendar.ts` with the read API**

```ts
import { composio, CalendarConnectionError } from "./composio";
import { env } from "./env";

export interface BusyInterval {
  start: Date;
  end: Date;
}

export interface CalendarSummary {
  id: string;
  summary: string;
  primary: boolean;
}

export async function initiateGoogleConnection(userId: string, callbackUrl: string) {
  const req = await composio().connectedAccounts.initiate(
    userId,
    env().COMPOSIO_GOOGLE_AUTH_CONFIG_ID,
    { callbackUrl }
  );
  return { redirectUrl: req.redirectUrl, connectionId: req.id };
}

export async function getConnection(connectionId: string) {
  const acc = await composio().connectedAccounts.get(connectionId);
  return { id: acc.id, status: acc.status as string };
}

export async function listCalendars(userId: string): Promise<CalendarSummary[]> {
  const res = await composio().tools.execute("GOOGLECALENDAR_LIST_CALENDARS", {
    userId,
    arguments: {},
  });
  if (!res.successful) throw new CalendarConnectionError(res.error ?? "list_calendars failed");
  // Composio returns { items: [{ id, summary, primary }, ...] }
  const items = (res.data as { items?: unknown[] }).items ?? [];
  return (items as Array<{ id: string; summary: string; primary?: boolean }>).map((c) => ({
    id: c.id,
    summary: c.summary,
    primary: !!c.primary,
  }));
}

export async function getBusyTimes(
  userId: string,
  calendarId: string,
  start: Date,
  end: Date,
  timezone: string,
): Promise<BusyInterval[]> {
  const res = await composio().tools.execute("GOOGLECALENDAR_FIND_FREE_SLOTS", {
    userId,
    arguments: {
      time_min: start.toISOString(),
      time_max: end.toISOString(),
      items: [{ id: calendarId }],
      timezone,
    },
  });
  if (!res.successful) throw new CalendarConnectionError(res.error ?? "find_free_slots failed");
  const calendars = (res.data as { calendars?: Record<string, { busy?: Array<{ start: string; end: string }> }> }).calendars ?? {};
  const cal = calendars[calendarId];
  const busy = cal?.busy ?? [];
  return busy.map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/composio.ts lib/calendar.ts
git commit -m "feat: Composio client + calendar read API (list + busy)"
```

---

### Task 12: Calendar wrapper (write methods)

**Files:**
- Modify: `lib/calendar.ts`

- [ ] **Step 1: Append the write API to `lib/calendar.ts`**

Add at the bottom of `lib/calendar.ts`:
```ts
export interface CreateEventInput {
  summary: string;
  description: string;
  startUtc: Date;
  durationMinutes: number;
  attendees: Array<{ email: string; displayName?: string }>;
  withMeet: boolean;
}

export interface CreatedEvent {
  googleEventId: string;
  meetLink: string | null;
}

export async function createCalendarEvent(
  userId: string,
  calendarId: string,
  input: CreateEventInput,
): Promise<CreatedEvent> {
  const res = await composio().tools.execute("GOOGLECALENDAR_CREATE_EVENT", {
    userId,
    arguments: {
      calendar_id: calendarId,
      summary: input.summary,
      description: input.description,
      start_datetime: input.startUtc.toISOString(),
      timezone: "UTC",
      event_duration_minutes: input.durationMinutes,
      attendees: input.attendees.map((a) => ({ email: a.email, displayName: a.displayName })),
      create_meeting_room: input.withMeet,
      send_updates: "all",
    },
  });
  if (!res.successful) throw new CalendarConnectionError(res.error ?? "create_event failed");
  const data = res.data as {
    id?: string;
    htmlLink?: string;
    hangoutLink?: string;
    conferenceData?: { entryPoints?: Array<{ entryPointType: string; uri: string }> };
  };
  const meetEntry = data.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video");
  const meetLink = data.hangoutLink ?? meetEntry?.uri ?? null;
  if (!data.id) throw new CalendarConnectionError("create_event: missing event id");
  return { googleEventId: data.id, meetLink };
}

export async function deleteCalendarEvent(userId: string, calendarId: string, eventId: string) {
  const res = await composio().tools.execute("GOOGLECALENDAR_DELETE_EVENT", {
    userId,
    arguments: { calendar_id: calendarId, event_id: eventId, send_updates: "all" },
  });
  if (!res.successful) throw new CalendarConnectionError(res.error ?? "delete_event failed");
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/calendar.ts
git commit -m "feat: calendar write API (create + delete event)"
```

---

### Task 13: OAuth callback route + connect server action

**Files:**
- Create: `server-actions/integrations.ts`, `app/api/integrations/google/callback/route.ts`

- [ ] **Step 1: Create `server-actions/integrations.ts`**

```ts
"use server";

import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/auth-helpers";
import { initiateGoogleConnection, getConnection, listCalendars } from "@/lib/calendar";
import { integrations, users } from "@/lib/collections";
import { env } from "@/lib/env";

export async function startGoogleConnect() {
  const session = await requireAdmin();
  const userId = session.user.id;
  const callbackUrl = `${env().APP_URL}/api/integrations/google/callback`;
  const { redirectUrl, connectionId } = await initiateGoogleConnection(userId, callbackUrl);

  await (await integrations()).updateOne(
    { userId: new ObjectId(userId), provider: "google_calendar" },
    {
      $setOnInsert: {
        _id: new ObjectId(),
        userId: new ObjectId(userId),
        provider: "google_calendar",
        composioUserId: userId,
        connectedAt: new Date(),
        calendarSummary: "",
      },
      $set: {
        composioConnectionId: connectionId,
        status: "INITIATED" as const,
        calendarId: "primary",
        lastCheckedAt: new Date(),
      },
    },
    { upsert: true },
  );

  redirect(redirectUrl);
}

export async function setActiveCalendar(calendarId: string, calendarSummary: string) {
  const session = await requireAdmin();
  await (await integrations()).updateOne(
    { userId: new ObjectId(session.user.id), provider: "google_calendar" },
    { $set: { calendarId, calendarSummary, lastCheckedAt: new Date() } },
  );
}

export async function disconnectGoogle() {
  const session = await requireAdmin();
  await (await integrations()).deleteOne({
    userId: new ObjectId(session.user.id),
    provider: "google_calendar",
  });
}
```

- [ ] **Step 2: Create the callback route**

`app/api/integrations/google/callback/route.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { integrations } from "@/lib/collections";
import { getConnection, listCalendars } from "@/lib/calendar";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const userId = session.user.id;
  const integ = await (await integrations()).findOne({
    userId: new ObjectId(userId),
    provider: "google_calendar",
  });
  if (!integ) {
    return NextResponse.redirect(new URL("/settings?error=no_connection", req.url));
  }

  const { status } = await getConnection(integ.composioConnectionId);
  if (status !== "ACTIVE") {
    await (await integrations()).updateOne(
      { _id: integ._id },
      { $set: { status: status as any, lastCheckedAt: new Date() } },
    );
    return NextResponse.redirect(new URL("/settings?error=connection_failed", req.url));
  }

  const cals = await listCalendars(userId);
  const primary = cals.find((c) => c.primary) ?? cals[0];

  await (await integrations()).updateOne(
    { _id: integ._id },
    {
      $set: {
        status: "ACTIVE",
        calendarId: primary?.id ?? "primary",
        calendarSummary: primary?.summary ?? "Primary",
        connectedAt: new Date(),
        lastCheckedAt: new Date(),
      },
    },
  );

  return NextResponse.redirect(new URL("/settings?connected=1", req.url));
}
```

- [ ] **Step 3: Commit**

```bash
git add server-actions/ app/api/integrations
git commit -m "feat: Google Calendar OAuth connect flow (server action + callback)"
```

---

### Task 14: Pure availability slot computation (TDD)

**Files:**
- Create: `lib/timezone.ts`, `lib/availability.ts`, `tests/availability.test.ts`, `vitest.config.ts`

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": new URL("./", import.meta.url).pathname,
    },
  },
});
```

- [ ] **Step 2: Create `lib/timezone.ts`**

```ts
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export function zonedDateAt(dateYMD: string, timeHM: string, timezone: string): Date {
  return fromZonedTime(`${dateYMD}T${timeHM}:00`, timezone);
}

export function ymdInTz(d: Date, timezone: string): string {
  const z = toZonedTime(d, timezone);
  const y = z.getFullYear();
  const m = String(z.getMonth() + 1).padStart(2, "0");
  const day = String(z.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dayOfWeekInTz(d: Date, timezone: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  return toZonedTime(d, timezone).getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export function eachDayBetween(start: Date, end: Date, timezone: string): string[] {
  const out: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    out.push(ymdInTz(cursor, timezone));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return Array.from(new Set(out));
}
```

- [ ] **Step 3: Write the failing tests in `tests/availability.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { computeSlots } from "@/lib/availability";
import type { AvailabilityDoc, EventTypeDoc } from "@/lib/types";

const baseEventType = {
  durationMinutes: 30,
  rules: {
    bufferBeforeMin: 0,
    bufferAfterMin: 0,
    minNoticeMinutes: 0,
    maxAdvanceDays: 7,
    maxBookingsPerDay: null,
  },
} as unknown as EventTypeDoc;

const baseAvailability: AvailabilityDoc = {
  _id: undefined as never,
  userId: undefined as never,
  timezone: "UTC",
  weeklyHours: [
    { dayOfWeek: 0, intervals: [] },
    { dayOfWeek: 1, intervals: [{ start: "09:00", end: "10:00" }] },
    { dayOfWeek: 2, intervals: [{ start: "09:00", end: "10:00" }] },
    { dayOfWeek: 3, intervals: [{ start: "09:00", end: "10:00" }] },
    { dayOfWeek: 4, intervals: [{ start: "09:00", end: "10:00" }] },
    { dayOfWeek: 5, intervals: [{ start: "09:00", end: "10:00" }] },
    { dayOfWeek: 6, intervals: [] },
  ],
  dateOverrides: [],
  updatedAt: new Date(),
};

describe("computeSlots", () => {
  it("emits 30-minute slots inside the working interval", () => {
    const now = new Date("2026-05-04T00:00:00Z"); // Monday UTC
    const slots = computeSlots({
      eventType: baseEventType,
      availability: baseAvailability,
      busy: [],
      now,
      bookingsPerDay: {},
    });
    const monday = slots.filter((s) => s.startUtc.toISOString().startsWith("2026-05-04"));
    expect(monday.map((s) => s.startUtc.toISOString())).toEqual([
      "2026-05-04T09:00:00.000Z",
      "2026-05-04T09:30:00.000Z",
    ]);
  });

  it("respects min notice", () => {
    const now = new Date("2026-05-04T09:10:00Z");
    const eventType = {
      ...baseEventType,
      rules: { ...baseEventType.rules, minNoticeMinutes: 60 },
    } as EventTypeDoc;
    const slots = computeSlots({
      eventType,
      availability: baseAvailability,
      busy: [],
      now,
      bookingsPerDay: {},
    });
    const monday = slots.filter((s) => s.startUtc.toISOString().startsWith("2026-05-04"));
    expect(monday).toHaveLength(0);
  });

  it("subtracts busy intervals (with buffers)", () => {
    const now = new Date("2026-05-04T00:00:00Z");
    const eventType = {
      ...baseEventType,
      rules: { ...baseEventType.rules, bufferAfterMin: 15 },
    } as EventTypeDoc;
    const slots = computeSlots({
      eventType,
      availability: baseAvailability,
      busy: [{ start: new Date("2026-05-04T09:30:00Z"), end: new Date("2026-05-04T09:45:00Z") }],
      now,
      bookingsPerDay: {},
    });
    const monday = slots.filter((s) => s.startUtc.toISOString().startsWith("2026-05-04"));
    expect(monday).toHaveLength(0);
  });

  it("applies maxBookingsPerDay cap", () => {
    const now = new Date("2026-05-04T00:00:00Z");
    const eventType = {
      ...baseEventType,
      rules: { ...baseEventType.rules, maxBookingsPerDay: 1 },
    } as EventTypeDoc;
    const slots = computeSlots({
      eventType,
      availability: baseAvailability,
      busy: [],
      now,
      bookingsPerDay: { "2026-05-04": 1 },
    });
    expect(slots.filter((s) => s.startUtc.toISOString().startsWith("2026-05-04"))).toHaveLength(0);
  });

  it("honors date overrides (block)", () => {
    const now = new Date("2026-05-04T00:00:00Z");
    const avail: AvailabilityDoc = {
      ...baseAvailability,
      dateOverrides: [{ date: "2026-05-04", intervals: [] }],
    };
    const slots = computeSlots({
      eventType: baseEventType,
      availability: avail,
      busy: [],
      now,
      bookingsPerDay: {},
    });
    expect(slots.filter((s) => s.startUtc.toISOString().startsWith("2026-05-04"))).toHaveLength(0);
  });

  it("honors date overrides (extend)", () => {
    const now = new Date("2026-05-04T00:00:00Z");
    const avail: AvailabilityDoc = {
      ...baseAvailability,
      dateOverrides: [{ date: "2026-05-04", intervals: [{ start: "14:00", end: "15:00" }] }],
    };
    const slots = computeSlots({
      eventType: baseEventType,
      availability: avail,
      busy: [],
      now,
      bookingsPerDay: {},
    });
    const monday = slots
      .filter((s) => s.startUtc.toISOString().startsWith("2026-05-04"))
      .map((s) => s.startUtc.toISOString());
    expect(monday).toEqual([
      "2026-05-04T14:00:00.000Z",
      "2026-05-04T14:30:00.000Z",
    ]);
  });

  it("respects maxAdvanceDays window", () => {
    const now = new Date("2026-05-04T00:00:00Z");
    const eventType = {
      ...baseEventType,
      rules: { ...baseEventType.rules, maxAdvanceDays: 1 },
    } as EventTypeDoc;
    const slots = computeSlots({
      eventType,
      availability: baseAvailability,
      busy: [],
      now,
      bookingsPerDay: {},
    });
    expect(slots.every((s) => s.startUtc < new Date("2026-05-06T00:00:00Z"))).toBe(true);
  });
});
```

- [ ] **Step 4: Run tests to confirm they fail**

```bash
npm test
```
Expected: tests fail because `computeSlots` doesn't exist yet.

- [ ] **Step 5: Implement `lib/availability.ts`**

```ts
import { addDays } from "date-fns";
import type { AvailabilityDoc, EventTypeDoc } from "./types";
import { dayOfWeekInTz, eachDayBetween, zonedDateAt } from "./timezone";

export interface Slot {
  startUtc: Date;
  endUtc: Date;
}

export interface ComputeSlotsInput {
  eventType: EventTypeDoc;
  availability: AvailabilityDoc;
  busy: Array<{ start: Date; end: Date }>;
  now: Date;
  bookingsPerDay: Record<string, number>;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

export function computeSlots(input: ComputeSlotsInput): Slot[] {
  const { eventType, availability, busy, now, bookingsPerDay } = input;
  const tz = availability.timezone;

  const earliestUtc = new Date(now.getTime() + eventType.rules.minNoticeMinutes * 60_000);
  const latestUtc = addDays(now, eventType.rules.maxAdvanceDays);

  const days = eachDayBetween(earliestUtc, latestUtc, tz);
  const slots: Slot[] = [];

  for (const ymd of days) {
    const override = availability.dateOverrides.find((o) => o.date === ymd);
    let intervals: Array<{ start: string; end: string }>;
    if (override) {
      intervals = override.intervals;
    } else {
      const sample = zonedDateAt(ymd, "12:00", tz);
      const dow = dayOfWeekInTz(sample, tz);
      intervals = availability.weeklyHours.find((w) => w.dayOfWeek === dow)?.intervals ?? [];
    }

    if (intervals.length === 0) continue;
    if (eventType.rules.maxBookingsPerDay !== null && (bookingsPerDay[ymd] ?? 0) >= eventType.rules.maxBookingsPerDay) {
      continue;
    }

    const cap = eventType.rules.maxBookingsPerDay !== null
      ? eventType.rules.maxBookingsPerDay - (bookingsPerDay[ymd] ?? 0)
      : Number.POSITIVE_INFINITY;

    let emittedToday = 0;

    for (const interval of intervals) {
      const intervalStart = zonedDateAt(ymd, interval.start, tz);
      const intervalEnd = zonedDateAt(ymd, interval.end, tz);

      let cursor = intervalStart;
      while (true) {
        const slotEnd = new Date(cursor.getTime() + eventType.durationMinutes * 60_000);
        if (slotEnd > intervalEnd) break;
        if (cursor < earliestUtc) {
          cursor = new Date(cursor.getTime() + eventType.durationMinutes * 60_000);
          continue;
        }

        const checkStart = new Date(cursor.getTime() - eventType.rules.bufferBeforeMin * 60_000);
        const checkEnd = new Date(slotEnd.getTime() + eventType.rules.bufferAfterMin * 60_000);
        const conflict = busy.some((b) => overlaps(checkStart, checkEnd, b.start, b.end));

        if (!conflict) {
          slots.push({ startUtc: cursor, endUtc: slotEnd });
          emittedToday += 1;
          if (emittedToday >= cap) break;
        }

        cursor = new Date(cursor.getTime() + eventType.durationMinutes * 60_000);
      }
      if (emittedToday >= cap) break;
    }
  }

  return slots;
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test
```
Expected: all 7 tests pass.

- [ ] **Step 7: Commit**

```bash
git add lib/availability.ts lib/timezone.ts tests/availability.test.ts vitest.config.ts
git commit -m "feat: pure availability slot computation with full test suite"
```

---

### Task 15: Token generation + tests

**Files:**
- Create: `lib/tokens.ts`, `tests/tokens.test.ts`

- [ ] **Step 1: Write the failing test in `tests/tokens.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { newManageToken, isValidTokenShape } from "@/lib/tokens";

describe("manageToken", () => {
  it("generates a 64-character hex token", () => {
    const t = newManageToken();
    expect(t).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces unique tokens", () => {
    const a = newManageToken();
    const b = newManageToken();
    expect(a).not.toBe(b);
  });

  it("validates token shape", () => {
    expect(isValidTokenShape(newManageToken())).toBe(true);
    expect(isValidTokenShape("short")).toBe(false);
    expect(isValidTokenShape("z".repeat(64))).toBe(false);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- tokens
```
Expected: fails (module not found).

- [ ] **Step 3: Implement `lib/tokens.ts`**

```ts
import { randomBytes } from "node:crypto";

export function newManageToken(): string {
  return randomBytes(32).toString("hex");
}

export function isValidTokenShape(s: string): boolean {
  return /^[0-9a-f]{64}$/.test(s);
}
```

- [ ] **Step 4: Verify tests pass**

```bash
npm test -- tokens
```

- [ ] **Step 5: Commit**

```bash
git add lib/tokens.ts tests/tokens.test.ts
git commit -m "feat: manageToken generation + shape validation"
```

---

### Task 16: Validation schemas

**Files:**
- Create: `lib/validation.ts`

- [ ] **Step 1: Create `lib/validation.ts`**

```ts
import { z } from "zod";

const slugRe = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;

export const customQuestionSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().min(1),
    label: z.string().min(1).max(120),
    type: z.literal("short_text"),
    required: z.boolean(),
  }),
  z.object({
    id: z.string().min(1),
    label: z.string().min(1).max(120),
    type: z.literal("long_text"),
    required: z.boolean(),
  }),
  z.object({
    id: z.string().min(1),
    label: z.string().min(1).max(120),
    type: z.literal("select"),
    required: z.boolean(),
    options: z.array(z.string().min(1).max(80)).min(1).max(20),
  }),
]);

export const locationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("google_meet") }),
  z.object({ type: z.literal("phone"), phoneNumber: z.string().min(3).max(40) }),
  z.object({ type: z.literal("custom"), customText: z.string().min(1).max(500) }),
]);

export const eventTypeFormSchema = z.object({
  slug: z.string().regex(slugRe),
  title: z.string().min(1).max(120),
  description: z.string().max(2000).default(""),
  durationMinutes: z.number().int().min(5).max(8 * 60),
  color: z.enum(["iris", "rose", "amber", "sage", "slate"]),
  location: locationSchema,
  rules: z.object({
    bufferBeforeMin: z.number().int().min(0).max(240),
    bufferAfterMin: z.number().int().min(0).max(240),
    minNoticeMinutes: z.number().int().min(0).max(7 * 24 * 60),
    maxAdvanceDays: z.number().int().min(1).max(365),
    maxBookingsPerDay: z.number().int().min(1).max(50).nullable(),
  }),
  customQuestions: z.array(customQuestionSchema).max(20),
  active: z.boolean(),
});

export const availabilityFormSchema = z.object({
  timezone: z.string().min(1),
  weeklyHours: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      intervals: z.array(
        z.object({
          start: z.string().regex(/^\d{2}:\d{2}$/),
          end: z.string().regex(/^\d{2}:\d{2}$/),
        }),
      ),
    }),
  ).length(7),
  dateOverrides: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      intervals: z.array(
        z.object({
          start: z.string().regex(/^\d{2}:\d{2}$/),
          end: z.string().regex(/^\d{2}:\d{2}$/),
        }),
      ),
    }),
  ),
});

export const profileFormSchema = z.object({
  name: z.string().min(1).max(80),
  bio: z.string().max(280).nullable(),
  defaultTimezone: z.string().min(1),
});

export const bookingRequestSchema = z.object({
  slug: z.string().regex(slugRe),
  startUtc: z.string().datetime(),
  guestName: z.string().min(1).max(80),
  guestEmail: z.string().email().max(254),
  guestTimezone: z.string().min(1),
  customAnswers: z.record(z.string(), z.string().max(2000)),
});
```

- [ ] **Step 2: Commit**

```bash
git add lib/validation.ts
git commit -m "feat: Zod schemas for forms and booking requests"
```

---

### Task 17: Booking orchestration

**Files:**
- Create: `lib/booking.ts`

- [ ] **Step 1: Create `lib/booking.ts`**

```ts
import { ObjectId } from "mongodb";
import { availability, bookings, eventTypes, integrations, users } from "./collections";
import { computeSlots } from "./availability";
import { ymdInTz } from "./timezone";
import { newManageToken } from "./tokens";
import { createCalendarEvent, deleteCalendarEvent, getBusyTimes } from "./calendar";
import { env } from "./env";
import type { BookingDoc, EventTypeDoc } from "./types";

export class BookingError extends Error {
  constructor(public readonly code: "slot_taken" | "not_found" | "validation" | "calendar", message: string) {
    super(message);
  }
}

interface CreateBookingInput {
  slug: string;
  startUtc: Date;
  guestName: string;
  guestEmail: string;
  guestTimezone: string;
  customAnswers: Record<string, string>;
}

export async function createBooking(input: CreateBookingInput): Promise<BookingDoc> {
  const evt = await (await eventTypes()).findOne({ slug: input.slug, active: true });
  if (!evt) throw new BookingError("not_found", "Event type not found");

  const integration = await (await integrations()).findOne({ provider: "google_calendar", status: "ACTIVE" });
  if (!integration) throw new BookingError("calendar", "Calendar not connected");

  const user = await (await users()).findOne({ _id: integration.userId });
  if (!user) throw new BookingError("not_found", "User not found");

  const avail = await (await availability()).findOne({ userId: user._id });
  if (!avail) throw new BookingError("not_found", "Availability not configured");

  const startUtc = input.startUtc;
  const endUtc = new Date(startUtc.getTime() + evt.durationMinutes * 60_000);

  const windowStart = new Date(startUtc.getTime() - 24 * 60 * 60 * 1000);
  const windowEnd = new Date(endUtc.getTime() + 24 * 60 * 60 * 1000);

  const busy = await getBusyTimes(integration.composioUserId, integration.calendarId, windowStart, windowEnd, avail.timezone);

  const dayKey = ymdInTz(startUtc, avail.timezone);
  const sameDayCount = await (await bookings()).countDocuments({
    eventTypeSlug: evt.slug,
    status: "confirmed",
    startUtc: {
      $gte: new Date(`${dayKey}T00:00:00Z`),
      $lt: new Date(`${dayKey}T23:59:59Z`),
    },
  });

  const candidates = computeSlots({
    eventType: evt,
    availability: avail,
    busy,
    now: new Date(),
    bookingsPerDay: { [dayKey]: sameDayCount },
  });
  const free = candidates.some((s) => s.startUtc.getTime() === startUtc.getTime());
  if (!free) throw new BookingError("slot_taken", "Slot is no longer available");

  const manageToken = newManageToken();
  const description = buildEventDescription(evt, input.guestName, input.customAnswers, manageToken);

  const created = await createCalendarEvent(integration.composioUserId, integration.calendarId, {
    summary: `${evt.title} with ${input.guestName}`,
    description,
    startUtc,
    durationMinutes: evt.durationMinutes,
    attendees: [{ email: input.guestEmail, displayName: input.guestName }],
    withMeet: evt.location.type === "google_meet",
  });

  const doc: BookingDoc = {
    _id: new ObjectId(),
    eventTypeSlug: evt.slug,
    eventTypeId: evt._id,
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    guestTimezone: input.guestTimezone,
    customAnswers: input.customAnswers,
    startUtc,
    endUtc,
    googleEventId: created.googleEventId,
    meetLink: created.meetLink,
    manageToken,
    status: "confirmed",
    rescheduledToBookingId: null,
    createdAt: new Date(),
    cancelledAt: null,
  };

  try {
    await (await bookings()).insertOne(doc);
  } catch (err) {
    await deleteCalendarEvent(integration.composioUserId, integration.calendarId, created.googleEventId).catch(() => {});
    throw err;
  }

  return doc;
}

export async function cancelBooking(token: string): Promise<BookingDoc> {
  const col = await bookings();
  const booking = await col.findOne({ manageToken: token });
  if (!booking) throw new BookingError("not_found", "Booking not found");
  if (booking.status !== "confirmed") throw new BookingError("not_found", "Booking not active");

  await col.updateOne({ _id: booking._id }, { $set: { status: "cancelled", cancelledAt: new Date() } });

  const integration = await (await integrations()).findOne({ provider: "google_calendar", status: "ACTIVE" });
  if (integration) {
    await deleteCalendarEvent(integration.composioUserId, integration.calendarId, booking.googleEventId).catch(() => {
      /* surfaced to admin via dashboard */
    });
  }

  return { ...booking, status: "cancelled", cancelledAt: new Date() };
}

export async function rescheduleBooking(token: string, newStartUtc: Date): Promise<BookingDoc> {
  const col = await bookings();
  const original = await col.findOne({ manageToken: token });
  if (!original) throw new BookingError("not_found", "Booking not found");
  if (original.status !== "confirmed") throw new BookingError("not_found", "Booking not active");

  const newBooking = await createBooking({
    slug: original.eventTypeSlug,
    startUtc: newStartUtc,
    guestName: original.guestName,
    guestEmail: original.guestEmail,
    guestTimezone: original.guestTimezone,
    customAnswers: original.customAnswers,
  });

  await col.updateOne(
    { _id: original._id },
    { $set: { status: "rescheduled", rescheduledToBookingId: newBooking._id, cancelledAt: new Date() } },
  );

  const integration = await (await integrations()).findOne({ provider: "google_calendar", status: "ACTIVE" });
  if (integration) {
    await deleteCalendarEvent(integration.composioUserId, integration.calendarId, original.googleEventId).catch(() => {});
  }

  return newBooking;
}

function buildEventDescription(
  evt: EventTypeDoc,
  guestName: string,
  answers: Record<string, string>,
  manageToken: string,
): string {
  const lines: string[] = [];
  lines.push(`${evt.title} with ${guestName}`);
  lines.push("");
  if (evt.description) {
    lines.push(evt.description);
    lines.push("");
  }

  if (evt.customQuestions.length > 0) {
    for (const q of evt.customQuestions) {
      const value = answers[q.id];
      if (value) {
        lines.push(`${q.label}: ${value}`);
      }
    }
    lines.push("");
  }

  if (evt.location.type === "phone") {
    lines.push(`Phone: ${evt.location.phoneNumber}`);
    lines.push("");
  } else if (evt.location.type === "custom") {
    lines.push(evt.location.customText);
    lines.push("");
  }

  lines.push("--");
  lines.push("Need to make a change?");
  lines.push(`Reschedule or cancel: ${env().APP_URL}/b/${manageToken}`);
  return lines.join("\n");
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/booking.ts
git commit -m "feat: booking orchestration (create / cancel / reschedule)"
```

---

### Task 18: Admin layout and sidebar

**Files:**
- Create: `app/(admin)/layout.tsx`, `components/admin/Sidebar.tsx`

- [ ] **Step 1: Create `components/admin/Sidebar.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Mark } from "@/components/brand/Mark";
import { LayoutDashboard, Calendar, Clock, ListChecks, Settings, LogOut } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/event-types", label: "Event types", icon: ListChecks },
  { href: "/availability", label: "Availability", icon: Clock },
  { href: "/bookings", label: "Bookings", icon: Calendar },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ name }: { name: string }) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:w-60 md:flex-col border-r border-[--color-border] bg-[--color-surface]">
      <div className="p-6 flex items-center gap-2">
        <Mark size={24} />
        <span className="font-display text-lg">Kalendly</span>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {items.map((it) => {
          const Icon = it.icon;
          const active = pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-[--color-primary-tint] text-[--color-primary]"
                  : "text-[--color-ink-soft] hover:bg-[--color-primary-tint]/60"
              }`}
            >
              <Icon size={16} />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-[--color-border]">
        <div className="px-3 py-2 text-xs text-[--color-ink-muted]">{name}</div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[--color-ink-soft] hover:bg-[--color-primary-tint]/60"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create `app/(admin)/layout.tsx`**

```tsx
import { requireAdmin } from "@/lib/auth-helpers";
import { Sidebar } from "@/components/admin/Sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return (
    <div className="min-h-screen flex">
      <Sidebar name={session.user.name} />
      <div className="flex-1 max-w-5xl mx-auto p-6 md:p-10 animate-fade-up">{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(admin\)/layout.tsx components/admin/Sidebar.tsx
git commit -m "feat: admin layout shell with sidebar navigation"
```

---

### Task 19: Dashboard page

**Files:**
- Create: `app/(admin)/dashboard/page.tsx`, `components/admin/KpiTile.tsx`

- [ ] **Step 1: Create `components/admin/KpiTile.tsx`**

```tsx
export function KpiTile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-[--color-border] bg-[--color-surface] p-5">
      <div className="text-xs uppercase tracking-wide text-[--color-ink-muted]">{label}</div>
      <div className="mt-2 font-mono text-3xl tabular text-[--color-ink]">{value}</div>
      {hint && <div className="mt-1 text-xs text-[--color-ink-muted]">{hint}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Create `app/(admin)/dashboard/page.tsx`**

```tsx
import Link from "next/link";
import { bootstrap } from "@/lib/bootstrap";
import { bookings, integrations } from "@/lib/collections";
import { KpiTile } from "@/components/admin/KpiTile";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  await bootstrap();
  const col = await bookings();
  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenAhead = new Date(now.getTime() + 7 * 24 * 3600_000);

  const [thisWeek, next7, thisMonth, upcoming, integ] = await Promise.all([
    col.countDocuments({ status: "confirmed", startUtc: { $gte: weekStart, $lt: now } }),
    col.countDocuments({ status: "confirmed", startUtc: { $gte: now, $lt: sevenAhead } }),
    col.countDocuments({ status: "confirmed", startUtc: { $gte: monthStart } }),
    col.find({ status: "confirmed", startUtc: { $gte: now } }).sort({ startUtc: 1 }).limit(5).toArray(),
    (await integrations()).findOne({ provider: "google_calendar" }),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-display">Dashboard</h1>
        <p className="text-[--color-ink-muted] text-sm mt-1">An overview of your bookings.</p>
      </header>

      {(!integ || integ.status !== "ACTIVE") && (
        <div className="rounded-xl border border-[--color-warning] bg-[--color-primary-tint] p-4 flex items-center justify-between">
          <p className="text-sm">Connect your Google Calendar to start accepting bookings.</p>
          <Button asChild><Link href="/settings">Connect</Link></Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiTile label="This week" value={thisWeek} />
        <KpiTile label="Next 7 days" value={next7} />
        <KpiTile label="This month" value={thisMonth} />
      </div>

      <section>
        <h2 className="text-lg font-display mb-3">Upcoming</h2>
        <div className="rounded-xl border border-[--color-border] bg-[--color-surface] divide-y divide-[--color-border]">
          {upcoming.length === 0 && <div className="p-5 text-sm text-[--color-ink-muted]">No upcoming bookings.</div>}
          {upcoming.map((b) => (
            <div key={b._id.toString()} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{b.guestName}</div>
                <div className="text-xs text-[--color-ink-muted]">{b.eventTypeSlug}</div>
              </div>
              <div className="font-mono text-sm tabular">
                {b.startUtc.toUTCString().slice(0, 22)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(admin\)/dashboard components/admin/KpiTile.tsx
git commit -m "feat: dashboard with KPI tiles + upcoming list + connect prompt"
```

---

### Task 20: Event types — list page + delete + reorder

**Files:**
- Create: `app/(admin)/event-types/page.tsx`, `components/admin/EventTypeCard.tsx`, `server-actions/event-types.ts`

- [ ] **Step 1: Create `server-actions/event-types.ts`**

```ts
"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eventTypes } from "@/lib/collections";
import { eventTypeFormSchema } from "@/lib/validation";
import { requireAdmin } from "@/lib/auth-helpers";
import type { EventTypeDoc } from "@/lib/types";

export async function createEventType(formData: FormData) {
  await requireAdmin();
  const parsed = eventTypeFormSchema.parse(JSON.parse(String(formData.get("payload"))));
  const col = await eventTypes();
  const last = await col.find().sort({ position: -1 }).limit(1).toArray();
  const position = (last[0]?.position ?? 0) + 1;
  const doc: EventTypeDoc = {
    _id: new ObjectId(),
    ...parsed,
    position,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await col.insertOne(doc);
  revalidatePath("/event-types");
  redirect("/event-types");
}

export async function updateEventType(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = eventTypeFormSchema.parse(JSON.parse(String(formData.get("payload"))));
  const col = await eventTypes();
  await col.updateOne({ _id: new ObjectId(id) }, { $set: { ...parsed, updatedAt: new Date() } });
  revalidatePath("/event-types");
  redirect("/event-types");
}

export async function deleteEventType(id: string) {
  await requireAdmin();
  await (await eventTypes()).deleteOne({ _id: new ObjectId(id) });
  revalidatePath("/event-types");
}

export async function toggleActive(id: string, active: boolean) {
  await requireAdmin();
  await (await eventTypes()).updateOne(
    { _id: new ObjectId(id) },
    { $set: { active, updatedAt: new Date() } },
  );
  revalidatePath("/event-types");
}

export async function reorderEventType(id: string, newPosition: number) {
  await requireAdmin();
  await (await eventTypes()).updateOne(
    { _id: new ObjectId(id) },
    { $set: { position: newPosition, updatedAt: new Date() } },
  );
  revalidatePath("/event-types");
}
```

- [ ] **Step 2: Create `components/admin/EventTypeCard.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toggleActive, deleteEventType } from "@/server-actions/event-types";
import { Copy, Pencil, Trash2 } from "lucide-react";

const colorMap: Record<string, string> = {
  iris: "var(--color-event-iris)",
  rose: "var(--color-event-rose)",
  amber: "var(--color-event-amber)",
  sage: "var(--color-event-sage)",
  slate: "var(--color-event-slate)",
};

interface Props {
  id: string;
  slug: string;
  title: string;
  duration: number;
  color: string;
  active: boolean;
  description: string;
  appUrl: string;
}

export function EventTypeCard({ id, slug, title, duration, color, active, description, appUrl }: Props) {
  const [pending, start] = useTransition();
  const link = `${appUrl}/${slug}`;

  return (
    <div className="rounded-xl border border-[--color-border] bg-[--color-surface] p-5 flex flex-col gap-4">
      <div className="h-1 w-12 rounded-full" style={{ background: colorMap[color] }} />
      <div>
        <h3 className="font-display text-xl">{title}</h3>
        <p className="text-xs font-mono text-[--color-ink-muted] mt-1">{duration} min · /{slug}</p>
      </div>
      <p className="text-sm text-[--color-ink-soft] line-clamp-2">{description}</p>
      <div className="flex items-center justify-between pt-2 border-t border-[--color-border]">
        <div className="flex items-center gap-2">
          <Switch
            checked={active}
            onCheckedChange={(checked) => start(() => toggleActive(id, checked))}
            aria-label="Active"
            disabled={pending}
          />
          <span className="text-xs text-[--color-ink-muted]">{active ? "Active" : "Hidden"}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(link)} title="Copy link">
            <Copy size={16} />
          </Button>
          <Button asChild variant="ghost" size="icon" title="Edit">
            <Link href={`/event-types/${id}/edit`}><Pencil size={16} /></Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Delete"
            onClick={() => {
              if (confirm("Delete this event type?")) start(() => deleteEventType(id));
            }}
            disabled={pending}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `app/(admin)/event-types/page.tsx`**

```tsx
import Link from "next/link";
import { eventTypes } from "@/lib/collections";
import { Button } from "@/components/ui/button";
import { EventTypeCard } from "@/components/admin/EventTypeCard";
import { env } from "@/lib/env";
import { Plus } from "lucide-react";

export default async function EventTypesPage() {
  const list = await (await eventTypes()).find().sort({ position: 1 }).toArray();
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display">Event types</h1>
          <p className="text-[--color-ink-muted] text-sm mt-1">The meetings people can book with you.</p>
        </div>
        <Button asChild>
          <Link href="/event-types/new"><Plus size={16} className="mr-2" /> New event type</Link>
        </Button>
      </header>
      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[--color-border] p-10 text-center">
          <p className="text-[--color-ink-muted] text-sm">No event types yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map((e) => (
            <EventTypeCard
              key={e._id.toString()}
              id={e._id.toString()}
              slug={e.slug}
              title={e.title}
              duration={e.durationMinutes}
              color={e.color}
              active={e.active}
              description={e.description}
              appUrl={env().APP_URL}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(admin\)/event-types/page.tsx components/admin/EventTypeCard.tsx server-actions/event-types.ts
git commit -m "feat: event-types list page + toggle/delete/copy-link actions"
```

---

### Task 21: Event type create + edit form

**Files:**
- Create: `app/(admin)/event-types/new/page.tsx`, `app/(admin)/event-types/[id]/edit/page.tsx`, `components/admin/EventTypeForm.tsx`

- [ ] **Step 1: Create `components/admin/EventTypeForm.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import type { EventTypeDoc, EventColor, CustomQuestion, LocationSpec } from "@/lib/types";
import { createEventType, updateEventType } from "@/server-actions/event-types";

type FormState = {
  slug: string;
  title: string;
  description: string;
  durationMinutes: number;
  color: EventColor;
  location: LocationSpec;
  rules: EventTypeDoc["rules"];
  customQuestions: CustomQuestion[];
  active: boolean;
};

const colors: EventColor[] = ["iris", "rose", "amber", "sage", "slate"];

export function EventTypeForm({ existingId, initial }: { existingId?: string; initial?: FormState }) {
  const [state, setState] = useState<FormState>(initial ?? {
    slug: "",
    title: "",
    description: "",
    durationMinutes: 30,
    color: "iris",
    location: { type: "google_meet" },
    rules: {
      bufferBeforeMin: 0,
      bufferAfterMin: 0,
      minNoticeMinutes: 240,
      maxAdvanceDays: 60,
      maxBookingsPerDay: null,
    },
    customQuestions: [],
    active: true,
  });
  const [pending, start] = useTransition();

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function patchRules<K extends keyof EventTypeDoc["rules"]>(k: K, v: EventTypeDoc["rules"][K]) {
    setState((s) => ({ ...s, rules: { ...s.rules, [k]: v } }));
  }

  function addQuestion() {
    setState((s) => ({
      ...s,
      customQuestions: [
        ...s.customQuestions,
        { id: crypto.randomUUID(), label: "", type: "short_text", required: false },
      ],
    }));
  }

  function removeQuestion(id: string) {
    setState((s) => ({ ...s, customQuestions: s.customQuestions.filter((q) => q.id !== id) }));
  }

  function submit() {
    const fd = new FormData();
    fd.append("payload", JSON.stringify(state));
    start(async () => {
      if (existingId) await updateEventType(existingId, fd);
      else await createEventType(fd);
    });
  }

  return (
    <form action={submit} className="space-y-10">
      {/* Basics */}
      <section className="space-y-5">
        <h2 className="font-display text-xl">Basics</h2>
        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={state.title} onChange={(e) => patch("title", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input id="slug" value={state.slug} onChange={(e) => patch("slug", e.target.value.toLowerCase())} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={3} value={state.description} onChange={(e) => patch("description", e.target.value)} />
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label>Duration (minutes)</Label>
            <div className="flex flex-wrap gap-2">
              {[15, 30, 45, 60, 90].map((m) => (
                <Button
                  key={m}
                  type="button"
                  variant={state.durationMinutes === m ? "default" : "outline"}
                  onClick={() => patch("durationMinutes", m)}
                >
                  {m}
                </Button>
              ))}
              <Input
                type="number"
                value={state.durationMinutes}
                onChange={(e) => patch("durationMinutes", Number(e.target.value))}
                className="w-24"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => patch("color", c)}
                  className={`h-7 w-7 rounded-full border-2 ${state.color === c ? "border-[--color-ink]" : "border-transparent"}`}
                  style={{ background: `var(--color-event-${c})` }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Location */}
      <section className="space-y-5">
        <h2 className="font-display text-xl">Location</h2>
        <div className="space-y-2">
          {(["google_meet", "phone", "custom"] as const).map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="location-type"
                checked={state.location.type === t}
                onChange={() => {
                  if (t === "google_meet") patch("location", { type: "google_meet" });
                  if (t === "phone") patch("location", { type: "phone", phoneNumber: "" });
                  if (t === "custom") patch("location", { type: "custom", customText: "" });
                }}
              />
              {t === "google_meet" ? "Google Meet (auto)" : t === "phone" ? "Phone" : "Custom"}
            </label>
          ))}
        </div>
        {state.location.type === "phone" && (
          <Input
            placeholder="+45 ..."
            value={state.location.phoneNumber}
            onChange={(e) => patch("location", { type: "phone", phoneNumber: e.target.value })}
          />
        )}
        {state.location.type === "custom" && (
          <Textarea
            rows={2}
            placeholder="Zoom link or address"
            value={state.location.customText}
            onChange={(e) => patch("location", { type: "custom", customText: e.target.value })}
          />
        )}
      </section>

      {/* Rules */}
      <section className="space-y-5">
        <h2 className="font-display text-xl">Scheduling rules</h2>
        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label>Buffer before (min)</Label>
            <Input type="number" value={state.rules.bufferBeforeMin} onChange={(e) => patchRules("bufferBeforeMin", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Buffer after (min)</Label>
            <Input type="number" value={state.rules.bufferAfterMin} onChange={(e) => patchRules("bufferAfterMin", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Min notice (min)</Label>
            <Input type="number" value={state.rules.minNoticeMinutes} onChange={(e) => patchRules("minNoticeMinutes", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Max advance (days)</Label>
            <Input type="number" value={state.rules.maxAdvanceDays} onChange={(e) => patchRules("maxAdvanceDays", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Max bookings per day (blank = unlimited)</Label>
            <Input
              type="number"
              value={state.rules.maxBookingsPerDay ?? ""}
              onChange={(e) => patchRules("maxBookingsPerDay", e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
        </div>
      </section>

      {/* Custom questions */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Custom questions</h2>
          <Button type="button" variant="outline" onClick={addQuestion}><Plus size={16} className="mr-2" /> Add question</Button>
        </div>
        <div className="space-y-3">
          {state.customQuestions.map((q, idx) => (
            <div key={q.id} className="rounded-lg border border-[--color-border] p-4 space-y-3">
              <div className="grid md:grid-cols-3 gap-3">
                <Input
                  placeholder="Label"
                  value={q.label}
                  onChange={(e) => {
                    const next = [...state.customQuestions];
                    next[idx] = { ...q, label: e.target.value } as CustomQuestion;
                    setState((s) => ({ ...s, customQuestions: next }));
                  }}
                />
                <select
                  value={q.type}
                  onChange={(e) => {
                    const t = e.target.value as CustomQuestion["type"];
                    const base = { id: q.id, label: q.label, required: q.required };
                    const next = [...state.customQuestions];
                    next[idx] = t === "select" ? { ...base, type: "select", options: ["Option 1"] } : { ...base, type: t };
                    setState((s) => ({ ...s, customQuestions: next }));
                  }}
                  className="h-9 rounded-md border border-[--color-border] bg-[--color-surface] px-2 text-sm"
                >
                  <option value="short_text">Short text</option>
                  <option value="long_text">Long text</option>
                  <option value="select">Dropdown</option>
                </select>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={(e) => {
                      const next = [...state.customQuestions];
                      next[idx] = { ...q, required: e.target.checked };
                      setState((s) => ({ ...s, customQuestions: next }));
                    }}
                  />
                  Required
                </label>
              </div>
              {q.type === "select" && (
                <Textarea
                  rows={2}
                  placeholder="One option per line"
                  value={q.options.join("\n")}
                  onChange={(e) => {
                    const next = [...state.customQuestions];
                    next[idx] = { ...q, options: e.target.value.split(/\n/).map((s) => s.trim()).filter(Boolean) };
                    setState((s) => ({ ...s, customQuestions: next }));
                  }}
                />
              )}
              <div className="flex justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => removeQuestion(q.id)}>
                  <Trash2 size={14} className="mr-1" /> Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Status */}
      <section className="space-y-5">
        <h2 className="font-display text-xl">Status</h2>
        <label className="flex items-center gap-3 text-sm">
          <Switch checked={state.active} onCheckedChange={(v) => patch("active", v)} />
          {state.active ? "Active" : "Hidden"}
        </label>
      </section>

      <div className="flex gap-3 pt-4 border-t border-[--color-border]">
        <Button type="submit" disabled={pending}>{pending ? "Saving..." : existingId ? "Save changes" : "Create"}</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create `app/(admin)/event-types/new/page.tsx`**

```tsx
import { EventTypeForm } from "@/components/admin/EventTypeForm";

export default function NewEventType() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-display">New event type</h1>
      </header>
      <EventTypeForm />
    </div>
  );
}
```

- [ ] **Step 3: Create `app/(admin)/event-types/[id]/edit/page.tsx`**

```tsx
import { ObjectId } from "mongodb";
import { notFound } from "next/navigation";
import { EventTypeForm } from "@/components/admin/EventTypeForm";
import { eventTypes } from "@/lib/collections";

export default async function EditEventType({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const evt = await (await eventTypes()).findOne({ _id: new ObjectId(id) });
  if (!evt) notFound();

  const initial = {
    slug: evt.slug,
    title: evt.title,
    description: evt.description,
    durationMinutes: evt.durationMinutes,
    color: evt.color,
    location: evt.location,
    rules: evt.rules,
    customQuestions: evt.customQuestions,
    active: evt.active,
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-display">Edit event type</h1>
      </header>
      <EventTypeForm existingId={id} initial={initial} />
    </div>
  );
}
```

- [ ] **Step 4: Verify type-check passes**

```bash
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add app/\(admin\)/event-types/new app/\(admin\)/event-types/\[id\] components/admin/EventTypeForm.tsx
git commit -m "feat: event type create/edit form (full sectioned UI)"
```

---

### Task 22: Availability editor

**Files:**
- Create: `app/(admin)/availability/page.tsx`, `components/admin/AvailabilityEditor.tsx`, modify `server-actions/availability.ts`

- [ ] **Step 1: Create `server-actions/availability.ts`**

```ts
"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { availability, users } from "@/lib/collections";
import { availabilityFormSchema } from "@/lib/validation";
import { requireAdmin } from "@/lib/auth-helpers";

export async function saveAvailability(formData: FormData) {
  const session = await requireAdmin();
  const parsed = availabilityFormSchema.parse(JSON.parse(String(formData.get("payload"))));
  const user = await (await users()).findOne({ _id: new ObjectId(session.user.id) });
  if (!user) throw new Error("User missing");
  await (await availability()).updateOne(
    { userId: user._id },
    { $set: { ...parsed, userId: user._id, updatedAt: new Date() } },
    { upsert: true },
  );
  revalidatePath("/availability");
}
```

- [ ] **Step 2: Create `components/admin/AvailabilityEditor.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import type { AvailabilityDoc } from "@/lib/types";
import { saveAvailability } from "@/server-actions/availability";

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Editable = {
  timezone: string;
  weeklyHours: AvailabilityDoc["weeklyHours"];
  dateOverrides: AvailabilityDoc["dateOverrides"];
};

export function AvailabilityEditor({ initial }: { initial: Editable }) {
  const [state, setState] = useState<Editable>(initial);
  const [pending, start] = useTransition();

  function setIntervals(dayOfWeek: number, intervals: { start: string; end: string }[]) {
    const next = state.weeklyHours.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, intervals } : d));
    setState({ ...state, weeklyHours: next });
  }

  function addOverride() {
    const today = new Date().toISOString().slice(0, 10);
    setState({
      ...state,
      dateOverrides: [...state.dateOverrides, { date: today, intervals: [] }],
    });
  }

  function submit() {
    const fd = new FormData();
    fd.append("payload", JSON.stringify(state));
    start(() => saveAvailability(fd));
  }

  return (
    <form action={submit} className="space-y-10">
      <section className="space-y-3">
        <Label>Timezone</Label>
        <Input
          value={state.timezone}
          onChange={(e) => setState({ ...state, timezone: e.target.value })}
          placeholder="Europe/Copenhagen"
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl">Weekly hours</h2>
        <div className="rounded-xl border border-[--color-border] divide-y divide-[--color-border]">
          {state.weeklyHours.map((d) => (
            <div key={d.dayOfWeek} className="p-4 flex flex-col md:flex-row md:items-start gap-4">
              <div className="w-16 font-mono text-sm tabular text-[--color-ink-muted]">{dayNames[d.dayOfWeek]}</div>
              <div className="flex-1 space-y-2">
                {d.intervals.length === 0 && <p className="text-xs text-[--color-ink-muted]">Unavailable</p>}
                {d.intervals.map((iv, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      className="w-28 font-mono"
                      value={iv.start}
                      onChange={(e) => {
                        const next = [...d.intervals];
                        next[idx] = { ...iv, start: e.target.value };
                        setIntervals(d.dayOfWeek, next);
                      }}
                    />
                    <span>—</span>
                    <Input
                      className="w-28 font-mono"
                      value={iv.end}
                      onChange={(e) => {
                        const next = [...d.intervals];
                        next[idx] = { ...iv, end: e.target.value };
                        setIntervals(d.dayOfWeek, next);
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setIntervals(d.dayOfWeek, d.intervals.filter((_, i) => i !== idx))}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIntervals(d.dayOfWeek, [...d.intervals, { start: "09:00", end: "17:00" }])}
                >
                  <Plus size={14} className="mr-1" /> Add interval
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Date overrides</h2>
          <Button type="button" variant="outline" size="sm" onClick={addOverride}>
            <Plus size={14} className="mr-1" /> Add override
          </Button>
        </div>
        <div className="space-y-3">
          {state.dateOverrides.length === 0 && <p className="text-sm text-[--color-ink-muted]">No overrides.</p>}
          {state.dateOverrides.map((o, oi) => (
            <div key={oi} className="rounded-lg border border-[--color-border] p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  className="w-44 font-mono"
                  value={o.date}
                  onChange={(e) => {
                    const next = [...state.dateOverrides];
                    next[oi] = { ...o, date: e.target.value };
                    setState({ ...state, dateOverrides: next });
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setState({ ...state, dateOverrides: state.dateOverrides.filter((_, i) => i !== oi) })}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
              {o.intervals.length === 0 && <p className="text-xs text-[--color-ink-muted]">Blocked entirely</p>}
              {o.intervals.map((iv, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    className="w-28 font-mono"
                    value={iv.start}
                    onChange={(e) => {
                      const next = [...state.dateOverrides];
                      next[oi].intervals[idx] = { ...iv, start: e.target.value };
                      setState({ ...state, dateOverrides: next });
                    }}
                  />
                  <span>—</span>
                  <Input
                    className="w-28 font-mono"
                    value={iv.end}
                    onChange={(e) => {
                      const next = [...state.dateOverrides];
                      next[oi].intervals[idx] = { ...iv, end: e.target.value };
                      setState({ ...state, dateOverrides: next });
                    }}
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const next = [...state.dateOverrides];
                  next[oi].intervals = [...next[oi].intervals, { start: "09:00", end: "17:00" }];
                  setState({ ...state, dateOverrides: next });
                }}
              >
                <Plus size={14} className="mr-1" /> Add interval
              </Button>
            </div>
          ))}
        </div>
      </section>

      <div className="sticky bottom-4 bg-[--color-background] py-4 -mx-2 px-2 border-t border-[--color-border]">
        <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save availability"}</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create `app/(admin)/availability/page.tsx`**

```tsx
import { ObjectId } from "mongodb";
import { availability, users } from "@/lib/collections";
import { requireAdmin } from "@/lib/auth-helpers";
import { AvailabilityEditor } from "@/components/admin/AvailabilityEditor";

export default async function AvailabilityPage() {
  const session = await requireAdmin();
  const user = await (await users()).findOne({ _id: new ObjectId(session.user.id) });
  if (!user) throw new Error("User missing");
  const doc = await (await availability()).findOne({ userId: user._id });
  const initial = doc
    ? { timezone: doc.timezone, weeklyHours: doc.weeklyHours, dateOverrides: doc.dateOverrides }
    : {
        timezone: "UTC",
        weeklyHours: [0, 1, 2, 3, 4, 5, 6].map((d) => ({
          dayOfWeek: d as 0 | 1 | 2 | 3 | 4 | 5 | 6,
          intervals: d === 0 || d === 6 ? [] : [{ start: "09:00", end: "17:00" }],
        })),
        dateOverrides: [],
      };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-display">Availability</h1>
        <p className="text-[--color-ink-muted] text-sm mt-1">When you're available to take meetings.</p>
      </header>
      <AvailabilityEditor initial={initial} />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(admin\)/availability components/admin/AvailabilityEditor.tsx server-actions/availability.ts
git commit -m "feat: availability editor (weekly hours + date overrides)"
```

---

### Task 23: Bookings list page

**Files:**
- Create: `app/(admin)/bookings/page.tsx`, `components/admin/BookingsTable.tsx`

- [ ] **Step 1: Create `components/admin/BookingsTable.tsx`**

```tsx
import type { BookingDoc } from "@/lib/types";

export function BookingsTable({ bookings }: { bookings: BookingDoc[] }) {
  if (bookings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[--color-border] p-10 text-center">
        <p className="text-[--color-ink-muted] text-sm">No bookings.</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-[--color-border] bg-[--color-surface] divide-y divide-[--color-border]">
      {bookings.map((b) => (
        <div key={b._id.toString()} className="p-4 flex items-center justify-between">
          <div>
            <div className="font-medium">{b.guestName}</div>
            <div className="text-xs text-[--color-ink-muted]">{b.guestEmail} · /{b.eventTypeSlug}</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-sm tabular">{b.startUtc.toUTCString().slice(0, 22)}</div>
            <div className="text-xs uppercase tracking-wide text-[--color-ink-muted]">{b.status}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `app/(admin)/bookings/page.tsx`**

```tsx
import { bookings } from "@/lib/collections";
import { BookingsTable } from "@/components/admin/BookingsTable";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab = sp.tab ?? "upcoming";
  const now = new Date();
  const filter =
    tab === "past"
      ? { status: "confirmed" as const, startUtc: { $lt: now } }
      : tab === "cancelled"
        ? { status: { $in: ["cancelled", "rescheduled"] as const } }
        : { status: "confirmed" as const, startUtc: { $gte: now } };
  const list = await (await bookings()).find(filter as any).sort({ startUtc: tab === "past" ? -1 : 1 }).limit(100).toArray();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-display">Bookings</h1>
      </header>
      <nav className="flex gap-2 text-sm border-b border-[--color-border]">
        {[
          { id: "upcoming", label: "Upcoming" },
          { id: "past", label: "Past" },
          { id: "cancelled", label: "Cancelled" },
        ].map((t) => (
          <a
            key={t.id}
            href={`?tab=${t.id}`}
            className={`px-3 py-2 -mb-px ${tab === t.id ? "border-b-2 border-[--color-primary] text-[--color-ink]" : "text-[--color-ink-muted]"}`}
          >
            {t.label}
          </a>
        ))}
      </nav>
      <BookingsTable bookings={list} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(admin\)/bookings components/admin/BookingsTable.tsx
git commit -m "feat: bookings list with upcoming/past/cancelled tabs"
```

---

### Task 24: Settings page

**Files:**
- Create: `app/(admin)/settings/page.tsx`, `components/admin/SettingsSections.tsx`, `server-actions/settings.ts`

- [ ] **Step 1: Create `server-actions/settings.ts`**

```ts
"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { users } from "@/lib/collections";
import { profileFormSchema } from "@/lib/validation";
import { requireAdmin } from "@/lib/auth-helpers";

export async function saveProfile(formData: FormData) {
  const session = await requireAdmin();
  const parsed = profileFormSchema.parse({
    name: String(formData.get("name") ?? ""),
    bio: formData.get("bio") ? String(formData.get("bio")) : null,
    defaultTimezone: String(formData.get("defaultTimezone") ?? "UTC"),
  });
  await (await users()).updateOne(
    { _id: new ObjectId(session.user.id) },
    { $set: { ...parsed, updatedAt: new Date() } },
  );
  revalidatePath("/settings");
}
```

- [ ] **Step 2: Create `components/admin/SettingsSections.tsx`**

```tsx
"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveProfile } from "@/server-actions/settings";
import { startGoogleConnect, setActiveCalendar, disconnectGoogle } from "@/server-actions/integrations";

export function ProfileSection({ name, bio, tz }: { name: string; bio: string | null; tz: string }) {
  const [pending, start] = useTransition();
  return (
    <form action={(fd) => start(() => saveProfile(fd))} className="space-y-4">
      <div className="space-y-2"><Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={name} required />
      </div>
      <div className="space-y-2"><Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" name="bio" defaultValue={bio ?? ""} rows={2} />
      </div>
      <div className="space-y-2"><Label htmlFor="defaultTimezone">Default timezone</Label>
        <Input id="defaultTimezone" name="defaultTimezone" defaultValue={tz} />
      </div>
      <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save profile"}</Button>
    </form>
  );
}

export function GoogleSection({
  status,
  calendars,
  selectedId,
}: {
  status: string | null;
  calendars: Array<{ id: string; summary: string; primary: boolean }>;
  selectedId: string | null;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-xs uppercase tracking-wide rounded-full px-2 py-1 bg-[--color-primary-tint] text-[--color-primary]">
          {status ?? "Not connected"}
        </span>
      </div>
      {status !== "ACTIVE" ? (
        <form action={() => start(() => startGoogleConnect())}>
          <Button type="submit" disabled={pending}>{pending ? "Redirecting..." : "Connect Google Calendar"}</Button>
        </form>
      ) : (
        <>
          <div className="space-y-2">
            <Label>Active calendar</Label>
            <select
              defaultValue={selectedId ?? ""}
              onChange={(e) => {
                const cal = calendars.find((c) => c.id === e.target.value);
                if (cal) start(() => setActiveCalendar(cal.id, cal.summary));
              }}
              className="h-9 w-full rounded-md border border-[--color-border] bg-[--color-surface] px-3 text-sm"
            >
              {calendars.map((c) => (
                <option key={c.id} value={c.id}>{c.summary}{c.primary ? " (primary)" : ""}</option>
              ))}
            </select>
          </div>
          <form action={() => start(() => disconnectGoogle())}>
            <Button type="submit" variant="outline">Disconnect</Button>
          </form>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `app/(admin)/settings/page.tsx`**

```tsx
import { ObjectId } from "mongodb";
import { users, integrations } from "@/lib/collections";
import { requireAdmin } from "@/lib/auth-helpers";
import { listCalendars } from "@/lib/calendar";
import { ProfileSection, GoogleSection } from "@/components/admin/SettingsSections";

export default async function SettingsPage() {
  const session = await requireAdmin();
  const user = await (await users()).findOne({ _id: new ObjectId(session.user.id) });
  if (!user) throw new Error("User missing");
  const integ = await (await integrations()).findOne({ userId: user._id, provider: "google_calendar" });
  let cals: Array<{ id: string; summary: string; primary: boolean }> = [];
  if (integ?.status === "ACTIVE") {
    try {
      cals = await listCalendars(session.user.id);
    } catch {
      cals = [];
    }
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-display">Settings</h1>
      </header>
      <section className="space-y-4">
        <h2 className="font-display text-xl">Profile</h2>
        <ProfileSection name={user.name} bio={user.bio} tz={user.defaultTimezone} />
      </section>
      <section className="space-y-4">
        <h2 className="font-display text-xl">Google Calendar</h2>
        <GoogleSection
          status={integ?.status ?? null}
          calendars={cals}
          selectedId={integ?.calendarId ?? null}
        />
      </section>
      <section className="space-y-2">
        <h2 className="font-display text-xl">Password</h2>
        <p className="text-sm text-[--color-ink-muted]">
          Run <code className="font-mono">npm run set-password</code> in your terminal, then paste the printed
          <code className="font-mono"> ADMIN_PASSWORD_HASH</code> into <code className="font-mono">.env.local</code> and restart.
        </p>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(admin\)/settings components/admin/SettingsSections.tsx server-actions/settings.ts
git commit -m "feat: settings page (profile + google connection + password instructions)"
```

---

### Task 25: Public profile (`/`)

**Files:**
- Modify: `app/page.tsx` → move to `app/(public)/page.tsx`
- Create: `app/(public)/layout.tsx`, `components/public/ProfileCard.tsx`

- [ ] **Step 1: Delete `app/page.tsx`**

```bash
rm app/page.tsx
```

- [ ] **Step 2: Create `app/(public)/layout.tsx`**

```tsx
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen bg-[--color-background]"
      style={{ backgroundImage: "url(/grain.svg)", backgroundRepeat: "repeat" }}
    >
      <div className="min-h-screen bg-[--color-background]/80">{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: Create `app/(public)/page.tsx`**

```tsx
import Link from "next/link";
import { eventTypes, users } from "@/lib/collections";
import { Wordmark } from "@/components/brand/Wordmark";

const colorMap: Record<string, string> = {
  iris: "var(--color-event-iris)",
  rose: "var(--color-event-rose)",
  amber: "var(--color-event-amber)",
  sage: "var(--color-event-sage)",
  slate: "var(--color-event-slate)",
};

export default async function ProfilePage() {
  const [user, list] = await Promise.all([
    (await users()).findOne({}),
    (await eventTypes()).find({ active: true }).sort({ position: 1 }).toArray(),
  ]);

  return (
    <main className="max-w-3xl mx-auto px-6 py-16 md:py-28 animate-fade-up">
      <Wordmark className="h-7 w-auto opacity-70" />
      <header className="mt-12 space-y-3">
        <h1 className="font-display text-5xl md:text-6xl tracking-tight">{user?.name ?? "Kalendly"}</h1>
        {user?.bio && <p className="text-lg text-[--color-ink-soft] max-w-xl">{user.bio}</p>}
      </header>
      <section className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-4">
        {list.map((e) => (
          <Link
            href={`/${e.slug}`}
            key={e._id.toString()}
            className="rounded-xl border border-[--color-border] bg-[--color-surface] p-5 hover:shadow-[0_8px_24px_-12px_rgba(26,22,37,0.10)] transition-shadow"
          >
            <div className="h-1 w-12 rounded-full mb-4" style={{ background: colorMap[e.color] }} />
            <h3 className="font-display text-2xl">{e.title}</h3>
            <p className="font-mono text-xs text-[--color-ink-muted] mt-1">{e.durationMinutes} min</p>
            {e.description && <p className="text-sm text-[--color-ink-soft] mt-3 line-clamp-2">{e.description}</p>}
          </Link>
        ))}
      </section>
      <footer className="mt-24 text-xs text-[--color-ink-muted]">Powered by Kalendly</footer>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(public\)/layout.tsx app/\(public\)/page.tsx
git commit -m "feat: public profile page with event-type grid + grain overlay"
```

---

### Task 26: Booking page `/[slug]` and availability API

**Files:**
- Create: `app/(public)/[slug]/page.tsx`, `app/api/availability/[slug]/route.ts`, `components/public/BookingCalendar.tsx`, `components/public/SlotPicker.tsx`

- [ ] **Step 1: Create the availability API**

`app/api/availability/[slug]/route.ts`:
```ts
import { NextResponse } from "next/server";
import { eventTypes, availability, integrations, bookings } from "@/lib/collections";
import { computeSlots } from "@/lib/availability";
import { ymdInTz } from "@/lib/timezone";
import { getBusyTimes } from "@/lib/calendar";

export const revalidate = 30;

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const evt = await (await eventTypes()).findOne({ slug, active: true });
  if (!evt) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const integ = await (await integrations()).findOne({ provider: "google_calendar", status: "ACTIVE" });
  if (!integ) return NextResponse.json({ error: "calendar_not_connected" }, { status: 503 });

  const avail = await (await availability()).findOne({ userId: integ.userId });
  if (!avail) return NextResponse.json({ error: "no_availability" }, { status: 503 });

  const now = new Date();
  const horizon = new Date(now.getTime() + evt.rules.maxAdvanceDays * 24 * 3600_000);

  let busy: Array<{ start: Date; end: Date }>;
  try {
    busy = await getBusyTimes(integ.composioUserId, integ.calendarId, now, horizon, avail.timezone);
  } catch {
    return NextResponse.json({ error: "calendar_unavailable" }, { status: 503 });
  }

  const counts: Record<string, number> = {};
  if (evt.rules.maxBookingsPerDay !== null) {
    const list = await (await bookings()).find({
      eventTypeSlug: slug,
      status: "confirmed",
      startUtc: { $gte: now, $lt: horizon },
    }).toArray();
    for (const b of list) {
      const k = ymdInTz(b.startUtc, avail.timezone);
      counts[k] = (counts[k] ?? 0) + 1;
    }
  }

  const slots = computeSlots({ eventType: evt, availability: avail, busy, now, bookingsPerDay: counts });
  return NextResponse.json({
    timezone: avail.timezone,
    slots: slots.map((s) => ({ startUtc: s.startUtc.toISOString(), endUtc: s.endUtc.toISOString() })),
  });
}
```

- [ ] **Step 2: Create `components/public/SlotPicker.tsx`**

```tsx
"use client";

import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { Button } from "@/components/ui/button";

interface Props {
  slots: { startUtc: string; endUtc: string }[];
  selectedDate: string;
  guestTimezone: string;
  onSelect: (slot: { startUtc: string; endUtc: string }) => void;
  selected?: string;
}

export function SlotPicker({ slots, selectedDate, guestTimezone, onSelect, selected }: Props) {
  const dayStart = new Date(`${selectedDate}T00:00:00Z`);
  const dayEnd = new Date(`${selectedDate}T23:59:59Z`);
  const filtered = slots.filter((s) => {
    const z = toZonedTime(new Date(s.startUtc), guestTimezone);
    return z >= toZonedTime(dayStart, guestTimezone) && z <= toZonedTime(dayEnd, guestTimezone);
  });

  if (filtered.length === 0) {
    return <p className="text-sm text-[--color-ink-muted]">No times available.</p>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {filtered.map((s) => {
        const label = formatInTimeZone(new Date(s.startUtc), guestTimezone, "h:mm a");
        const sel = selected === s.startUtc;
        return (
          <button
            key={s.startUtc}
            type="button"
            onClick={() => onSelect(s)}
            className={`font-mono text-sm tabular rounded-md border px-3 py-2 transition-colors ${
              sel ? "bg-[--color-primary] text-[--color-primary-ink] border-[--color-primary]" : "bg-[--color-surface] border-[--color-border] hover:bg-[--color-primary-tint]"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Create `components/public/BookingCalendar.tsx`**

```tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { SlotPicker } from "./SlotPicker";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

interface Slot { startUtc: string; endUtc: string }

export function BookingCalendar({ slug, slots, ownerTimezone }: { slug: string; slots: Slot[]; ownerTimezone: string }) {
  const [guestTz, setGuestTz] = useState<string>("UTC");
  useEffect(() => { setGuestTz(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"); }, []);

  const days = useMemo(() => {
    const set = new Set<string>();
    for (const s of slots) {
      const z = toZonedTime(new Date(s.startUtc), guestTz);
      const ymd = `${z.getFullYear()}-${String(z.getMonth()+1).padStart(2,"0")}-${String(z.getDate()).padStart(2,"0")}`;
      set.add(ymd);
    }
    return set;
  }, [slots, guestTz]);

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [selected, setSelected] = useState<Slot | undefined>(undefined);
  const router = useRouter();

  const selectedYmd = date
    ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`
    : "";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => { setDate(d); setSelected(undefined); }}
          modifiers={{
            available: (d) => {
              const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
              return days.has(ymd);
            },
          }}
          modifiersClassNames={{ available: "font-medium text-[--color-primary]" }}
          disabled={(d) => {
            const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
            return !days.has(ymd);
          }}
        />
        <p className="text-xs text-[--color-ink-muted] mt-3">
          Detected timezone: <span className="font-mono">{guestTz}</span>
        </p>
      </div>
      <div className="space-y-4">
        {!date && <p className="text-sm text-[--color-ink-muted]">Select a date to see available times.</p>}
        {date && (
          <>
            <h3 className="font-display text-xl">{formatInTimeZone(date, guestTz, "EEEE, MMMM d")}</h3>
            <SlotPicker
              slots={slots}
              selectedDate={selectedYmd}
              guestTimezone={guestTz}
              selected={selected?.startUtc}
              onSelect={setSelected}
            />
            {selected && (
              <Button
                onClick={() => router.push(`/${slug}/confirm?start=${encodeURIComponent(selected.startUtc)}&tz=${encodeURIComponent(guestTz)}`)}
                className="w-full"
              >
                Confirm {formatInTimeZone(new Date(selected.startUtc), guestTz, "h:mm a")}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `app/(public)/[slug]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { eventTypes, integrations, availability, bookings } from "@/lib/collections";
import { computeSlots } from "@/lib/availability";
import { getBusyTimes } from "@/lib/calendar";
import { ymdInTz } from "@/lib/timezone";
import { BookingCalendar } from "@/components/public/BookingCalendar";

export const revalidate = 30;

export default async function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const evt = await (await eventTypes()).findOne({ slug, active: true });
  if (!evt) notFound();

  const integ = await (await integrations()).findOne({ provider: "google_calendar", status: "ACTIVE" });
  const avail = integ ? await (await availability()).findOne({ userId: integ.userId }) : null;

  let slots: { startUtc: string; endUtc: string }[] = [];
  let unavailable = false;
  if (integ && avail) {
    try {
      const now = new Date();
      const horizon = new Date(now.getTime() + evt.rules.maxAdvanceDays * 24 * 3600_000);
      const busy = await getBusyTimes(integ.composioUserId, integ.calendarId, now, horizon, avail.timezone);
      const counts: Record<string, number> = {};
      if (evt.rules.maxBookingsPerDay !== null) {
        const list = await (await bookings()).find({
          eventTypeSlug: slug,
          status: "confirmed",
          startUtc: { $gte: now, $lt: horizon },
        }).toArray();
        for (const b of list) {
          const k = ymdInTz(b.startUtc, avail.timezone);
          counts[k] = (counts[k] ?? 0) + 1;
        }
      }
      slots = computeSlots({ eventType: evt, availability: avail, busy, now, bookingsPerDay: counts })
        .map((s) => ({ startUtc: s.startUtc.toISOString(), endUtc: s.endUtc.toISOString() }));
    } catch {
      unavailable = true;
    }
  } else {
    unavailable = true;
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-12 md:py-16 animate-fade-up">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
        <aside className="md:col-span-2 space-y-3">
          <div className="h-1 w-12 rounded-full" style={{ background: `var(--color-event-${evt.color})` }} />
          <h1 className="font-display text-4xl">{evt.title}</h1>
          <p className="font-mono text-xs text-[--color-ink-muted]">
            {evt.durationMinutes} min · {evt.location.type === "google_meet" ? "Google Meet" : evt.location.type === "phone" ? "Phone" : "In-person"}
          </p>
          {evt.description && <p className="text-sm text-[--color-ink-soft] mt-3 whitespace-pre-wrap">{evt.description}</p>}
        </aside>
        <section className="md:col-span-3">
          {unavailable ? (
            <p className="text-sm text-[--color-ink-muted]">Booking is temporarily unavailable. Please try again later.</p>
          ) : (
            <BookingCalendar slug={slug} slots={slots} ownerTimezone={avail!.timezone} />
          )}
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/availability app/\(public\)/\[slug\]/page.tsx components/public/BookingCalendar.tsx components/public/SlotPicker.tsx
git commit -m "feat: public booking page with calendar + slot picker + availability API"
```

---

### Task 27: Booking confirm form + POST /api/bookings

**Files:**
- Create: `app/(public)/[slug]/confirm/page.tsx`, `app/api/bookings/route.ts`, `components/public/BookingForm.tsx`

- [ ] **Step 1: Create `components/public/BookingForm.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { CustomQuestion } from "@/lib/types";

interface Props {
  slug: string;
  startUtc: string;
  guestTimezone: string;
  customQuestions: CustomQuestion[];
}

export function BookingForm({ slug, startUtc, guestTimezone, customQuestions }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  function setAnswer(id: string, value: string) {
    setAnswers((a) => ({ ...a, [id]: value }));
  }

  async function submit(form: FormData) {
    setError(null);
    start(async () => {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          startUtc,
          guestTimezone,
          guestName: String(form.get("guestName") ?? ""),
          guestEmail: String(form.get("guestEmail") ?? ""),
          customAnswers: answers,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error === "slot_taken" ? "That slot was just taken. Please pick another." : "Could not complete booking.");
        return;
      }
      const { token } = await res.json();
      router.push(`/${slug}/booked?token=${token}`);
    });
  }

  return (
    <form action={submit} className="space-y-5 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="guestName">Name</Label>
        <Input id="guestName" name="guestName" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="guestEmail">Email</Label>
        <Input id="guestEmail" name="guestEmail" type="email" required />
      </div>
      {customQuestions.map((q) => (
        <div key={q.id} className="space-y-2">
          <Label htmlFor={q.id}>{q.label}{q.required && " *"}</Label>
          {q.type === "long_text" ? (
            <Textarea id={q.id} required={q.required} value={answers[q.id] ?? ""} onChange={(e) => setAnswer(q.id, e.target.value)} />
          ) : q.type === "select" ? (
            <select
              id={q.id}
              required={q.required}
              value={answers[q.id] ?? ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              className="h-9 w-full rounded-md border border-[--color-border] bg-[--color-surface] px-3 text-sm"
            >
              <option value="">Choose...</option>
              {q.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <Input id={q.id} required={q.required} value={answers[q.id] ?? ""} onChange={(e) => setAnswer(q.id, e.target.value)} />
          )}
        </div>
      ))}
      {error && <p className="text-sm text-[--color-danger]">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? "Scheduling..." : "Schedule event"}</Button>
    </form>
  );
}
```

- [ ] **Step 2: Create `app/(public)/[slug]/confirm/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { eventTypes } from "@/lib/collections";
import { BookingForm } from "@/components/public/BookingForm";

export default async function ConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ start?: string; tz?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const startIso = sp.start;
  const tz = sp.tz ?? "UTC";
  if (!startIso) notFound();

  const evt = await (await eventTypes()).findOne({ slug, active: true });
  if (!evt) notFound();

  const dt = new Date(startIso);
  const labelDate = formatInTimeZone(dt, tz, "EEEE, MMMM d");
  const labelTime = formatInTimeZone(dt, tz, "h:mm a");

  return (
    <main className="max-w-3xl mx-auto px-6 py-12 md:py-16 animate-fade-up">
      <a href={`/${slug}`} className="text-sm text-[--color-ink-muted] hover:text-[--color-ink]">← back</a>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-10">
        <aside className="md:col-span-2 space-y-3">
          <div className="h-1 w-12 rounded-full" style={{ background: `var(--color-event-${evt.color})` }} />
          <h1 className="font-display text-3xl">{evt.title}</h1>
          <p className="font-mono text-xs text-[--color-ink-muted]">{evt.durationMinutes} min</p>
          <p className="text-sm font-mono">{labelDate} · {labelTime}</p>
        </aside>
        <section className="md:col-span-3">
          <BookingForm slug={slug} startUtc={startIso} guestTimezone={tz} customQuestions={evt.customQuestions} />
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Create `app/api/bookings/route.ts`**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { bookingRequestSchema } from "@/lib/validation";
import { createBooking, BookingError } from "@/lib/booking";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const limit = checkRateLimit(`book:${ip}`, 10, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = bookingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const booking = await createBooking({
      slug: parsed.data.slug,
      startUtc: new Date(parsed.data.startUtc),
      guestName: parsed.data.guestName,
      guestEmail: parsed.data.guestEmail,
      guestTimezone: parsed.data.guestTimezone,
      customAnswers: parsed.data.customAnswers,
    });
    return NextResponse.json({ token: booking.manageToken });
  } catch (err) {
    if (err instanceof BookingError) {
      const status = err.code === "slot_taken" ? 409 : err.code === "not_found" ? 404 : err.code === "calendar" ? 503 : 400;
      return NextResponse.json({ error: err.code, message: err.message }, { status });
    }
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(public\)/\[slug\]/confirm app/api/bookings/route.ts components/public/BookingForm.tsx
git commit -m "feat: booking confirm form + POST /api/bookings (race-protected)"
```

---

### Task 28: Booked confirmation page

**Files:**
- Create: `app/(public)/[slug]/booked/page.tsx`

- [ ] **Step 1: Create `app/(public)/[slug]/booked/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { Check } from "lucide-react";
import { bookings, eventTypes } from "@/lib/collections";
import { isValidTokenShape } from "@/lib/tokens";

export default async function BookedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const token = sp.token;
  if (!token || !isValidTokenShape(token)) notFound();

  const booking = await (await bookings()).findOne({ manageToken: token, eventTypeSlug: slug });
  if (!booking) notFound();
  const evt = await (await eventTypes()).findOne({ _id: booking.eventTypeId });
  if (!evt) notFound();

  const dt = new Date(booking.startUtc);
  const labelDate = formatInTimeZone(dt, booking.guestTimezone, "EEEE, MMMM d");
  const labelTime = formatInTimeZone(dt, booking.guestTimezone, "h:mm a");

  return (
    <main className="max-w-xl mx-auto px-6 py-20 text-center animate-fade-up">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[--color-primary-tint] text-[--color-primary]">
        <Check size={24} />
      </div>
      <h1 className="font-display text-4xl mt-6">You're booked.</h1>
      <p className="font-mono mt-3">{labelDate} · {labelTime}</p>
      <p className="text-sm text-[--color-ink-muted] mt-2">An invite has been sent to {booking.guestEmail}.</p>
      {booking.meetLink && (
        <p className="mt-4 text-sm">
          <a href={booking.meetLink} className="text-[--color-primary] underline">Join Google Meet</a>
        </p>
      )}
      <p className="mt-10 text-sm">
        Need to make a change?{" "}
        <a href={`/b/${booking.manageToken}`} className="text-[--color-primary] underline">Manage booking</a>
      </p>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(public\)/\[slug\]/booked
git commit -m "feat: booking confirmation page"
```

---

### Task 29: Manage page (`/b/[token]`) + cancel/reschedule API

**Files:**
- Create: `app/(public)/b/[token]/page.tsx`, `app/(public)/b/[token]/manage-panel.tsx`, `app/api/bookings/[token]/route.ts`

- [ ] **Step 1: Create `app/api/bookings/[token]/route.ts`**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isValidTokenShape } from "@/lib/tokens";
import { cancelBooking, rescheduleBooking, BookingError } from "@/lib/booking";

const patchSchema = z.object({ newStartUtc: z.string().datetime() });

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isValidTokenShape(token)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try {
    await cancelBooking(token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof BookingError) return NextResponse.json({ error: err.code }, { status: 404 });
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isValidTokenShape(token)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation" }, { status: 400 });

  try {
    const updated = await rescheduleBooking(token, new Date(parsed.data.newStartUtc));
    return NextResponse.json({ token: updated.manageToken });
  } catch (err) {
    if (err instanceof BookingError) {
      const status = err.code === "slot_taken" ? 409 : err.code === "not_found" ? 404 : err.code === "calendar" ? 503 : 400;
      return NextResponse.json({ error: err.code }, { status });
    }
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create `app/(public)/b/[token]/manage-panel.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function ManagePanel({ token, slug }: { token: string; slug: string }) {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (done) {
    return <p className="text-sm">This booking has been cancelled.</p>;
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => router.push(`/${slug}?reschedule=${token}`)}>Reschedule</Button>
      <Button
        variant="outline"
        onClick={() => {
          if (!confirming) { setConfirming(true); return; }
          start(async () => {
            const res = await fetch(`/api/bookings/${token}`, { method: "DELETE" });
            if (res.ok) setDone(true);
          });
        }}
        disabled={pending}
      >
        {pending ? "Cancelling..." : confirming ? "Click again to confirm cancel" : "Cancel"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Create `app/(public)/b/[token]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { bookings } from "@/lib/collections";
import { isValidTokenShape } from "@/lib/tokens";
import { ManagePanel } from "./manage-panel";

export default async function ManagePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isValidTokenShape(token)) notFound();
  const booking = await (await bookings()).findOne({ manageToken: token });
  if (!booking || booking.status !== "confirmed" || booking.endUtc < new Date()) notFound();

  const labelDate = formatInTimeZone(booking.startUtc, booking.guestTimezone, "EEEE, MMMM d");
  const labelTime = formatInTimeZone(booking.startUtc, booking.guestTimezone, "h:mm a");

  return (
    <main className="max-w-xl mx-auto px-6 py-20 animate-fade-up">
      <h1 className="font-display text-3xl">Manage booking</h1>
      <p className="text-sm text-[--color-ink-muted] mt-2">{booking.guestName} · {booking.guestEmail}</p>
      <p className="font-mono mt-4">{labelDate} · {labelTime}</p>
      <div className="mt-8">
        <ManagePanel token={token} slug={booking.eventTypeSlug} />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Add the reschedule path support in `BookingCalendar`**

Already supported via the `?reschedule=<token>` query — but the booking page doesn't yet handle the PATCH. Update the calendar's "Confirm" button to detect the `reschedule` query and call PATCH instead. Open `components/public/BookingCalendar.tsx` and replace the `onClick` of the confirm button with this version:

```tsx
onClick={async () => {
  const params = new URLSearchParams(window.location.search);
  const reschedule = params.get("reschedule");
  if (reschedule) {
    const res = await fetch(`/api/bookings/${reschedule}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStartUtc: selected!.startUtc }),
    });
    if (res.ok) {
      const { token } = await res.json();
      router.push(`/${slug}/booked?token=${token}`);
    } else {
      alert("Could not reschedule.");
    }
  } else {
    router.push(`/${slug}/confirm?start=${encodeURIComponent(selected!.startUtc)}&tz=${encodeURIComponent(guestTz)}`);
  }
}}
```
Replace only that single onClick handler. The rest of `BookingCalendar.tsx` is unchanged.

- [ ] **Step 5: Show a small banner on `/[slug]` when `?reschedule=` is present**

In `app/(public)/[slug]/page.tsx`, immediately above the `<BookingCalendar />` call, add:
```tsx
const reschedule = (await searchParams).reschedule;
```
Update the page signature to accept `searchParams: Promise<{ reschedule?: string }>` and render:
```tsx
{reschedule && (
  <div className="mb-6 rounded-md border border-[--color-warning] bg-[--color-primary-tint] px-4 py-2 text-sm">
    Pick a new time below to reschedule your booking.
  </div>
)}
```
The full updated file body should look like:
```tsx
export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ reschedule?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  // ... existing code that loads evt, integ, avail, slots, unavailable
  return (
    <main className="max-w-5xl mx-auto px-6 py-12 md:py-16 animate-fade-up">
      {sp.reschedule && (
        <div className="mb-6 rounded-md border border-[--color-warning] bg-[--color-primary-tint] px-4 py-2 text-sm">
          Pick a new time below to reschedule your booking.
        </div>
      )}
      {/* rest unchanged */}
    </main>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add app/\(public\)/b app/api/bookings/\[token\] components/public/BookingCalendar.tsx app/\(public\)/\[slug\]/page.tsx
git commit -m "feat: manage page + cancel/reschedule API + reschedule banner"
```

---

### Task 30: Security headers + manifest

**Files:**
- Modify: `next.config.ts`
- Create: `public/manifest.json`, `app/(public)/[slug]/booked/route-meta.tsx` (skipped — built-in)

- [ ] **Step 1: Replace `next.config.ts`**

```ts
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const config: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default config;
```

- [ ] **Step 2: Create `public/manifest.json`**

```json
{
  "name": "Kalendly",
  "short_name": "Kalendly",
  "icons": [
    { "src": "/icon.svg", "sizes": "any", "type": "image/svg+xml" }
  ],
  "theme_color": "#5B2AB8",
  "background_color": "#FAFAF7",
  "display": "standalone"
}
```

- [ ] **Step 3: Reference manifest in `app/layout.tsx` metadata**

Open `app/layout.tsx` and update the `metadata` constant to:
```ts
export const metadata: Metadata = {
  title: "Kalendly",
  description: "Schedule a meeting.",
  icons: { icon: "/icon.svg" },
  manifest: "/manifest.json",
  themeColor: "#5B2AB8",
};
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```
Expected: clean build, no type errors. If TypeScript flags any unused imports, remove them.

- [ ] **Step 5: Commit**

```bash
git add next.config.ts public/manifest.json app/layout.tsx
git commit -m "feat: security headers + CSP + PWA manifest"
```

---

### Task 31: End-to-end smoke test (manual)

**Files:** none — verification only.

- [ ] **Step 1: Provision MongoDB Atlas**

Create a free cluster at https://www.mongodb.com/cloud/atlas. Allow your IP. Create a DB user. Copy the SRV connection string into `.env.local` as `MONGODB_URI`.

- [ ] **Step 2: Get Composio credentials**

Sign up at https://composio.dev. Settings → API Keys → copy → paste into `.env.local` as `COMPOSIO_API_KEY`.

In Composio dashboard: create an Auth Config for Google Calendar (managed auth). Copy the auth-config ID → paste as `COMPOSIO_GOOGLE_AUTH_CONFIG_ID`.

- [ ] **Step 3: Generate password hash**

```bash
npm run set-password
```
Type a strong password. Paste the printed hash into `.env.local` as `ADMIN_PASSWORD_HASH`.

- [ ] **Step 4: Start the app**

```bash
npm run dev
```

- [ ] **Step 5: Sign in and connect Google**

Open http://localhost:3000/login. Sign in with `ADMIN_EMAIL` + your password.
Navigate to `/settings`. Click "Connect Google Calendar". Complete OAuth. Confirm you're redirected back with the connection showing ACTIVE and a calendar selected.

- [ ] **Step 6: Configure availability and an event type**

Go to `/availability`. Confirm the default Mon–Fri 9–5 weekly hours are set; adjust as needed. Save.
Go to `/event-types`. Create one event type called "Coffee chat" — slug `coffee`, 30 min, color iris, location Google Meet, default rules, no custom questions. Save.

- [ ] **Step 7: Test booking as a guest**

Open an incognito window. Visit http://localhost:3000/. Confirm the public profile lists "Coffee chat".
Click into it. Pick a date and time slot. Confirm the slot picker shows times in your local timezone.
Click confirm. Fill name + a different test email you can check. Click Schedule event.

- [ ] **Step 8: Verify the booking**

In the admin window, go to `/bookings`. Confirm the booking appears under Upcoming.
In Google Calendar (the calendar you connected), confirm the event appears with the guest as attendee, a Meet link (if Workspace), and the description includes the manage URL.
Check the test email — the Google Calendar invite should arrive automatically.

- [ ] **Step 9: Test reschedule and cancel**

In the test inbox, open the calendar invite. Find the manage URL in the description. Visit it.
Click Reschedule. Pick a new slot. Confirm. The Google Calendar event for the original time is removed; a new event appears at the new time. The test inbox receives both a cancel and a new invite.
Visit the new manage URL. Click Cancel twice (confirm). Confirm the Google event disappears and the test inbox receives a cancellation.

- [ ] **Step 10: Verify slot races**

Open two incognito windows side-by-side on the same booking page. Pick the same slot in both. Submit one — it succeeds. Submit the other — it returns "That slot was just taken."

- [ ] **Step 11: Run the test suite**

```bash
npm test
```
Expected: all unit tests pass.

- [ ] **Step 12: Commit any final adjustments**

If steps revealed issues, fix them and commit. Otherwise mark this plan complete.

---

## Self-Review

A pass through the spec showed every requirement maps to a task:

- §3 Tech stack → Task 1
- §4 Architecture / module boundaries → Tasks 5, 8, 11–14, 17
- §5 Data model + indexes → Tasks 5, 6
- §6 Auth (login, password script, middleware, rate limit, headers) → Tasks 7, 8, 9, 10, 30
- §7 Composio integration (read/write/OAuth/failure) → Tasks 11, 12, 13, 24
- §8 Availability computation (with DST + edge tests) → Task 14
- §9 Public booking flow → Tasks 25, 26, 27, 28
- §10 Reschedule/cancel flow → Tasks 17, 29
- §11 Admin UI surface → Tasks 18, 19, 20, 21, 22, 23, 24
- §12–13 Design system + logo → Tasks 2, 3, 4
- §14 Env vars → Tasks 1, 5
- §15 Setup checklist → Task 31
- §17 Risks (race protection, Composio failure, personal Gmail Meet fallback) → Tasks 17, 26, 12
- §18 Acceptance criteria → covered by Task 31 manual smoke test

No placeholders or TBDs remain in any task. Type signatures are consistent across tasks (e.g. `BookingDoc`, `EventTypeDoc`, `computeSlots` input/output match throughout). Function names referenced in later tasks (`createBooking`, `cancelBooking`, `rescheduleBooking`, `getBusyTimes`, `createCalendarEvent`, `deleteCalendarEvent`, `listCalendars`, `initiateGoogleConnection`, `getConnection`) all match their definitions in `lib/calendar.ts` and `lib/booking.ts`.
