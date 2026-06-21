export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { Calendar as CalIcon, Clock, User } from "lucide-react";
import { bookings } from "@/lib/collections";
import { isValidTokenShape } from "@/lib/tokens";
import { ManagePanel } from "./manage-panel";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default async function ManagePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isValidTokenShape(token)) notFound();
  const booking = await (await bookings()).findOne({ manageToken: token });
  if (!booking || booking.status !== "confirmed" || booking.endUtc < new Date()) notFound();

  const labelDate = formatInTimeZone(booking.startUtc, booking.guestTimezone, "EEEE, MMMM d");
  const labelTime = formatInTimeZone(booking.startUtc, booking.guestTimezone, "h:mm a");

  return (
    <main className="relative mx-auto max-w-md px-6 pt-6 pb-20 md:pt-10 animate-fade-in">
      <div className="mb-10 flex items-center justify-end">
        <ThemeToggle />
      </div>

      <div className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          Manage booking
        </p>
        <h1 className="text-[28px] leading-tight tracking-[-0.02em]">{booking.guestName}</h1>
      </div>

      <dl className="mt-8 divide-y divide-border border-y border-border">
        <div className="flex items-center justify-between gap-4 py-3">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
            <User size={13} className="text-ink-faint" />
            Guest
          </span>
          <span className="truncate text-[13px] text-ink">{booking.guestEmail}</span>
        </div>
        <div className="flex items-center justify-between gap-4 py-3">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
            <CalIcon size={13} className="text-ink-faint" />
            Date
          </span>
          <span className="font-mono tabular text-[13px] text-ink">{labelDate}</span>
        </div>
        <div className="flex items-center justify-between gap-4 py-3">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
            <Clock size={13} className="text-ink-faint" />
            Time
          </span>
          <span className="font-mono tabular text-[13px] text-ink">{labelTime}</span>
        </div>
      </dl>

      <div className="mt-8">
        <ManagePanel token={token} slug={booking.eventTypeSlug} />
      </div>
    </main>
  );
}
