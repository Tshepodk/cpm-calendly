"use client";

import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  slots: { startUtc: string; endUtc: string }[];
  selectedDate: string;
  guestTimezone: string;
  onSelect: (slot: { startUtc: string; endUtc: string }) => void;
  onClear?: () => void;
  selected?: string;
}

export function SlotPicker({
  slots,
  selectedDate,
  guestTimezone,
  onSelect,
  onClear,
  selected,
}: Props) {
  const dayStart = new Date(`${selectedDate}T00:00:00Z`);
  const dayEnd = new Date(`${selectedDate}T23:59:59Z`);
  const filtered = slots.filter((s) => {
    const z = toZonedTime(new Date(s.startUtc), guestTimezone);
    return z >= toZonedTime(dayStart, guestTimezone) && z <= toZonedTime(dayEnd, guestTimezone);
  });

  if (filtered.length === 0) {
    return (
      <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-bg-elevated px-4 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
          No times on this day
        </p>
        {onClear && (
          <Button type="button" variant="outline" size="sm" onClick={onClear} className="gap-1.5">
            <ArrowLeft />
            Pick another day
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      role="listbox"
      aria-label="Available times"
      className="grid max-h-[440px] grid-cols-2 gap-1.5 overflow-y-auto pr-1 animate-fade-in"
    >
      {filtered.map((s, i) => {
        const label = formatInTimeZone(new Date(s.startUtc), guestTimezone, "h:mm a");
        const isSelected = selected === s.startUtc;
        return (
          <button
            key={s.startUtc}
            type="button"
            role="option"
            aria-selected={isSelected}
            onClick={() => onSelect(s)}
            style={{ animationDelay: `${Math.min(i * 18, 240)}ms` }}
            className={[
              "group/slot inline-flex h-10 items-center justify-center rounded-md border px-2 font-mono text-[13px] tabular transition-all duration-150 outline-none animate-fade-up",
              "focus-visible:ring-2 focus-visible:ring-ring",
              isSelected
                ? "border-primary bg-primary text-primary-foreground shadow-[0_0_0_3px_var(--primary-tint)]"
                : "border-border bg-surface text-ink hover:border-ink-faint hover:bg-surface-hover hover:-translate-y-px",
            ].join(" ")}
          >
            <span className="tracking-tight">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
