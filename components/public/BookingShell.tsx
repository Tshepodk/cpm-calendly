"use client";

import { useEffect, useState } from "react";
import { Clock, MapPin, Globe2 } from "lucide-react";
import { TimezoneCombobox } from "@/components/ui/timezone-combobox";
import { BookingCalendar } from "./BookingCalendar";

const colorMap: Record<string, string> = {
  iris: "var(--event-iris)",
  rose: "var(--event-rose)",
  amber: "var(--event-amber)",
  sage: "var(--event-sage)",
  slate: "var(--event-slate)",
};

interface Slot {
  startUtc: string;
  endUtc: string;
}

interface Props {
  slug: string;
  title: string;
  description: string;
  durationMinutes: number;
  color: string;
  locationLabel: string;
  slots: Slot[];
  unavailable: boolean;
}

export function BookingShell({
  slug,
  title,
  description,
  durationMinutes,
  color,
  locationLabel,
  slots,
  unavailable,
}: Props) {
  const [guestTz, setGuestTz] = useState<string>("UTC");
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    try {
      setGuestTz(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    } catch {
      /* fall through with UTC */
    }
    setMounted(true);
  }, []);

  const accent = colorMap[color];

  return (
    <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-14">
      <aside className="md:col-span-5">
        <div className="md:sticky md:top-8">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: accent }}
            />
            <span>Event</span>
            <span className="text-ink-faint">·</span>
            <span>{durationMinutes} min</span>
          </div>

          <h1 className="mt-4 text-[34px] leading-[1.1] tracking-[-0.025em] text-ink md:text-[40px]">
            {title}
          </h1>

          {description && (
            <p className="mt-4 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-soft">
              {description}
            </p>
          )}

          <dl className="mt-8 divide-y divide-border border-y border-border">
            <Row icon={<Clock size={13} />} label="Duration">
              <span className="font-mono tabular text-[13px] text-ink">
                {durationMinutes} minutes
              </span>
            </Row>
            <Row icon={<MapPin size={13} />} label="Location">
              <span className="font-mono tabular text-[13px] text-ink">{locationLabel}</span>
            </Row>
            <li className="flex flex-col gap-2 py-3">
              <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                <span className="text-ink-faint">
                  <Globe2 size={13} />
                </span>
                Your timezone
              </span>
              {mounted ? (
                <TimezoneCombobox value={guestTz} onChange={setGuestTz} />
              ) : (
                <div className="h-9 w-full animate-pulse rounded-md border border-border bg-bg-elevated" />
              )}
            </li>
          </dl>
        </div>
      </aside>

      <section className="md:col-span-7">
        {unavailable ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface px-6 text-center">
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
              Status
            </span>
            <p className="mt-3 text-[15px] text-ink">Booking is temporarily unavailable.</p>
            <p className="mt-1.5 text-[13px] text-ink-muted">
              Please try again in a few minutes.
            </p>
          </div>
        ) : (
          <BookingCalendar slug={slug} slots={slots} guestTz={guestTz} />
        )}
      </section>
    </div>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
        <span className="text-ink-faint">{icon}</span>
        {label}
      </span>
      <span className="text-right">{children}</span>
    </li>
  );
}
