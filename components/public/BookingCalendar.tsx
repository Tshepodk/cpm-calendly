"use client";

import { useState, useMemo, useTransition } from "react";
import { ChevronLeft, ChevronRight, Loader2, ArrowRight } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { SlotPicker } from "./SlotPicker";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

interface Slot {
  startUtc: string;
  endUtc: string;
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function BookingCalendar({
  slug,
  slots,
  guestTz,
}: {
  slug: string;
  slots: Slot[];
  guestTz: string;
}) {

  const days = useMemo(() => {
    const set = new Set<string>();
    for (const s of slots) {
      const z = toZonedTime(new Date(s.startUtc), guestTz);
      set.add(ymd(z));
    }
    return set;
  }, [slots, guestTz]);

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [month, setMonth] = useState<Date>(new Date());
  const [selected, setSelected] = useState<Slot | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const selectedYmd = date ? ymd(date) : "";

  const availableInMonth = useMemo(() => {
    const yPrefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-`;
    let count = 0;
    for (const d of days) if (d.startsWith(yPrefix)) count++;
    return count;
  }, [days, month]);

  function onConfirm() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const params = new URLSearchParams(window.location.search);
      const reschedule = params.get("reschedule");
      if (reschedule) {
        const res = await fetch(`/api/bookings/${reschedule}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newStartUtc: selected.startUtc }),
        });
        if (res.ok) {
          const { token } = await res.json();
          router.push(`/${slug}/booked?token=${token}`);
        } else {
          setError("Could not reschedule. Please try another time.");
        }
        return;
      }
      router.push(
        `/${slug}/confirm?start=${encodeURIComponent(selected.startUtc)}&tz=${encodeURIComponent(guestTz)}`,
      );
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
      {/* Calendar surface */}
      <div>
        <div className="flex items-end justify-between pb-3">
          <div>
            <h2 className="text-[15px] font-medium tracking-[-0.01em] text-ink">Pick a date</h2>
            <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">
              {availableInMonth > 0
                ? `${availableInMonth} ${availableInMonth === 1 ? "day" : "days"} open · ${formatInTimeZone(month, guestTz, "MMMM yyyy")}`
                : `No availability · ${formatInTimeZone(month, guestTz, "MMMM yyyy")}`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Previous month"
              onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            >
              <ChevronLeft />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Next month"
              onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-3 shadow-[var(--shadow-card-hover)]">
          <Calendar
            mode="single"
            month={month}
            onMonthChange={setMonth}
            selected={date}
            onSelect={(d) => {
              setDate(d);
              setSelected(undefined);
              setError(null);
            }}
            modifiers={{
              available: (d) => days.has(ymd(d)),
            }}
            modifiersClassNames={{
              available:
                "relative font-medium text-ink after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary",
            }}
            disabled={(d) => !days.has(ymd(d))}
            className="w-full [--cell-size:2.25rem]"
            classNames={{
              nav: "hidden",
              month_caption: "hidden",
              root: "w-full",
              months: "relative flex w-full flex-col gap-4",
              month: "flex w-full flex-col gap-4",
            }}
          />
        </div>
      </div>

      {/* Slots column */}
      <div className="flex min-h-[360px] flex-col">
        <div className="pb-3">
          <h2 className="text-[15px] font-medium tracking-[-0.01em] text-ink">
            {date ? "Available times" : "Select a date"}
          </h2>
          <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">
            {date ? formatInTimeZone(date, guestTz, "EEE, MMM d") : "Times appear here"}
          </p>
        </div>

        <div className="flex-1">
          {!date ? (
            <div className="flex h-full min-h-[260px] items-center justify-center rounded-lg border border-dashed border-border bg-bg-elevated px-4 text-center">
              <p className="text-[12px] text-ink-muted leading-relaxed">
                Pick a highlighted day on the<br /> calendar to see open times.
              </p>
            </div>
          ) : (
            <SlotPicker
              slots={slots}
              selectedDate={selectedYmd}
              guestTimezone={guestTz}
              selected={selected?.startUtc}
              onSelect={(s) => {
                setSelected(s);
                setError(null);
              }}
              onClear={() => {
                setDate(undefined);
                setSelected(undefined);
              }}
            />
          )}
        </div>

        {/* Confirm strip — appears when a slot is chosen, the one delight moment. */}
        {selected && (
          <div className="mt-4 animate-fade-up">
            {error && (
              <p className="mb-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[12px] text-danger">
                {error}
              </p>
            )}
            <div className="overflow-hidden rounded-lg border border-border-strong bg-surface shadow-[var(--shadow-card-hover)]">
              <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                    Selected
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[13px] tabular text-ink">
                    {formatInTimeZone(new Date(selected.startUtc), guestTz, "EEE, MMM d · h:mm a")}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                onClick={onConfirm}
                disabled={pending}
                size="lg"
                className="w-full rounded-none border-0 border-t border-border gap-2"
              >
                {pending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    <span>One moment…</span>
                  </>
                ) : (
                  <>
                    <span>Confirm booking</span>
                    <ArrowRight className="transition-transform duration-150 group-hover/button:translate-x-0.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
