export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight, CalendarPlus } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { bootstrap } from "@/lib/bootstrap";
import { bookings, integrations } from "@/lib/collections";
import { KpiTile } from "@/components/admin/KpiTile";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  await bootstrap();
  const col = await bookings();
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenAhead = new Date(now.getTime() + 7 * 24 * 3600_000);

  const [thisWeek, next7, thisMonth, upcoming, integ] = await Promise.all([
    col.countDocuments({ status: "confirmed", startUtc: { $gte: weekStart, $lt: now } }),
    col.countDocuments({ status: "confirmed", startUtc: { $gte: now, $lt: sevenAhead } }),
    col.countDocuments({ status: "confirmed", startUtc: { $gte: monthStart } }),
    col.find({ status: "confirmed", startUtc: { $gte: now } }).sort({ startUtc: 1 }).limit(6).toArray(),
    (await integrations()).findOne({ provider: "google_calendar" }),
  ]);

  return (
    <div className="space-y-10">
      <header className="space-y-2 border-b border-border pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">Overview</p>
        <h1 className="text-[28px] leading-tight tracking-[-0.02em]">Dashboard</h1>
      </header>

      {(!integ || integ.status !== "ACTIVE") && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-lg border border-border bg-primary-tint px-4 py-3.5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
              <CalendarPlus size={14} />
            </span>
            <div>
              <p className="text-[13px] font-medium text-ink">Connect Google Calendar</p>
              <p className="mt-0.5 text-[12px] text-ink-soft">
                Bookings can&apos;t be accepted until your calendar is connected.
              </p>
            </div>
          </div>
          <Button nativeButton={false} size="sm" render={<Link href="/settings" />} className="gap-1.5">
            Connect
            <ArrowRight />
          </Button>
        </div>
      )}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <KpiTile label="This week" value={thisWeek} hint="Confirmed bookings" />
        <KpiTile label="Next 7 days" value={next7} hint="Coming up" accent />
        <KpiTile label="This month" value={thisMonth} hint="To date" />
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-[15px] font-medium tracking-[-0.01em]">Upcoming</h2>
            <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">
              {upcoming.length === 0 ? "Nothing scheduled" : `${upcoming.length} scheduled`}
            </p>
          </div>
          <Link
            href="/bookings"
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 -mr-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted transition-colors duration-150 hover:bg-surface-hover hover:text-ink"
          >
            View all
            <ArrowRight size={12} />
          </Link>
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1 px-6 py-14 text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                Inbox zero
              </p>
              <p className="text-[13px] text-ink-soft">No upcoming bookings yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((b) => {
                const dt = new Date(b.startUtc);
                return (
                  <li
                    key={b._id.toString()}
                    className="group flex items-center justify-between gap-4 px-4 py-3 transition-colors duration-150 hover:bg-surface-hover"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-md border border-border bg-bg-elevated">
                        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-muted">
                          {formatInTimeZone(dt, b.guestTimezone || "UTC", "MMM")}
                        </span>
                        <span className="font-mono text-[13px] font-medium leading-none tabular text-ink">
                          {formatInTimeZone(dt, b.guestTimezone || "UTC", "d")}
                        </span>
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-medium text-ink">{b.guestName}</div>
                        <div className="truncate font-mono text-[11px] text-ink-muted">/{b.eventTypeSlug}</div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-[12px] tabular text-ink-soft">
                        {formatInTimeZone(dt, b.guestTimezone || "UTC", "h:mm a")}
                      </div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                        {formatInTimeZone(dt, b.guestTimezone || "UTC", "zzz")}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
