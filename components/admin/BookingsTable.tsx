import { formatInTimeZone } from "date-fns-tz";
import { CalendarX } from "lucide-react";
import type { BookingDoc } from "@/lib/types";

const statusStyle: Record<string, string> = {
  confirmed: "bg-success/15 text-success",
  cancelled: "bg-surface-hover text-ink-muted",
  rescheduled: "bg-warning/15 text-warning",
};

export function BookingsTable({ bookings }: { bookings: BookingDoc[] }) {
  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-bg-elevated px-6 py-16 text-center">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-ink-muted">
          <CalendarX size={16} />
        </span>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
            Empty
          </p>
          <p className="mt-1 text-[13px] text-ink-soft">No bookings in this view.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <ul className="divide-y divide-border">
        {bookings.map((b) => {
          const dt = new Date(b.startUtc);
          const tz = b.guestTimezone || "UTC";
          return (
            <li
              key={b._id.toString()}
              className="group flex items-center justify-between gap-4 px-4 py-3 transition-colors duration-150 hover:bg-surface-hover"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-md border border-border bg-bg-elevated">
                  <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-muted">
                    {formatInTimeZone(dt, tz, "MMM")}
                  </span>
                  <span className="font-mono text-[13px] font-medium leading-none tabular text-ink">
                    {formatInTimeZone(dt, tz, "d")}
                  </span>
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-ink">{b.guestName}</div>
                  <div className="truncate font-mono text-[11px] text-ink-muted">
                    {b.guestEmail} · /{b.eventTypeSlug}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-right">
                <div>
                  <div className="font-mono text-[12px] tabular text-ink-soft">
                    {formatInTimeZone(dt, tz, "h:mm a")}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                    {formatInTimeZone(dt, tz, "EEE")}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] ${
                    statusStyle[b.status] ?? "bg-surface-hover text-ink-muted"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {b.status}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
