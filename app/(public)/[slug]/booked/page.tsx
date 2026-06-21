export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { Check, Video, Mail } from "lucide-react";
import { bookings, eventTypes } from "@/lib/collections";
import { isValidTokenShape } from "@/lib/tokens";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

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
    <main className="relative mx-auto flex min-h-screen max-w-md flex-col px-6 pt-6 md:pt-10 animate-fade-in">
      <div className="mb-12 flex items-center justify-end">
        <ThemeToggle />
      </div>

      <div className="text-center">
        <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary/30" />
          <Check size={26} strokeWidth={2.5} />
        </span>
        <p className="mt-7 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          Confirmed
        </p>
        <h1 className="mt-2 text-[34px] leading-tight tracking-[-0.025em]">
          You&apos;re booked.
        </h1>
        <p className="mt-3 font-mono text-[13px] tabular text-ink-soft">
          {labelDate} · {labelTime}
        </p>
      </div>

      <div className="mt-10 space-y-3">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3.5 py-3">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-bg-elevated text-ink-muted">
            <Mail size={13} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
              Invite sent
            </p>
            <p className="mt-0.5 truncate text-[13px] text-ink">{booking.guestEmail}</p>
          </div>
        </div>

        {booking.meetLink && (
          <a
            href={booking.meetLink}
            className="group flex items-center gap-3 rounded-lg border border-border bg-surface px-3.5 py-3 transition-colors duration-150 hover:border-border-strong"
          >
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-tint text-primary">
              <Video size={13} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                Google Meet
              </p>
              <p className="mt-0.5 truncate text-[13px] text-ink group-hover:text-primary">
                Join meeting
              </p>
            </div>
          </a>
        )}
      </div>

      <div className="mt-auto pt-12 pb-8 text-center">
        <a
          href={`/b/${booking.manageToken}`}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted transition-colors duration-150 hover:text-ink"
        >
          Manage booking
        </a>
      </div>
    </main>
  );
}
