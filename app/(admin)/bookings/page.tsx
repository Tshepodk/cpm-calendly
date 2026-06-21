export const dynamic = "force-dynamic";

import { bookings } from "@/lib/collections";
import { BookingsTable } from "@/components/admin/BookingsTable";

const tabs = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "cancelled", label: "Cancelled" },
] as const;

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab = (sp.tab ?? "upcoming") as (typeof tabs)[number]["id"];
  const now = new Date();
  const filter =
    tab === "past"
      ? { status: "confirmed" as const, startUtc: { $lt: now } }
      : tab === "cancelled"
        ? { status: { $in: ["cancelled", "rescheduled"] as const } }
        : { status: "confirmed" as const, startUtc: { $gte: now } };
  const list = await (await bookings())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .find(filter as any)
    .sort({ startUtc: tab === "past" ? -1 : 1 })
    .limit(100)
    .toArray();

  return (
    <div className="space-y-7">
      <header className="space-y-2 border-b border-border pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
          Inbox · {list.length}
        </p>
        <h1 className="text-[28px] leading-tight tracking-[-0.02em]">Bookings</h1>
      </header>

      <nav
        aria-label="Booking filters"
        className="inline-flex items-center gap-1 rounded-md border border-border bg-bg-elevated p-1"
      >
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <a
              key={t.id}
              href={`?tab=${t.id}`}
              aria-current={active ? "page" : undefined}
              className={`inline-flex h-7 items-center rounded-[5px] px-3 text-[12.5px] transition-colors duration-150 ${
                active
                  ? "bg-surface font-medium text-ink shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {t.label}
            </a>
          );
        })}
      </nav>

      <BookingsTable bookings={list} />
    </div>
  );
}
