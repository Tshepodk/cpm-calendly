"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Globe2, Check, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const FALLBACK = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Copenhagen",
  "Europe/Stockholm",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

function loadTimezones(): string[] {
  try {
    const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] })
      .supportedValuesOf;
    if (typeof fn === "function") {
      const list = fn("timeZone");
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch {
    /* fall through */
  }
  return FALLBACK;
}

function offsetFor(tz: string, now: Date): string {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    }).formatToParts(now);
    const v = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    return v.replace("GMT", "UTC");
  } catch {
    return "";
  }
}

export function TimezoneCombobox({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const zones = useMemo(() => loadTimezones(), []);
  const offsets = useMemo(() => {
    const now = new Date();
    const m = new Map<string, string>();
    for (const tz of zones) m.set(tz, offsetFor(tz, now));
    if (!m.has(value)) m.set(value, offsetFor(value, now));
    return m;
  }, [zones, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return zones;
    return zones.filter(
      (tz) =>
        tz.toLowerCase().includes(q) ||
        (offsets.get(tz) ?? "").toLowerCase().includes(q) ||
        tz.replaceAll("_", " ").toLowerCase().includes(q),
    );
  }, [query, zones, offsets]);

  // Reset search and scroll to selected when re-opened
  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={
          "group/tz inline-flex h-9 w-full items-center gap-2 rounded-md border border-border bg-surface pl-3 pr-2 text-left text-sm text-ink transition-colors duration-150 outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring data-[popup-open]:border-primary data-[popup-open]:ring-2 data-[popup-open]:ring-ring " +
          (className ?? "")
        }
      >
        <Globe2 size={14} className="shrink-0 text-ink-muted" />
        <span className="flex-1 truncate font-mono text-[13px]">{value || "Choose timezone"}</span>
        <span className="ml-2 shrink-0 rounded-sm border border-border bg-bg-elevated px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.04em] text-ink-muted">
          {offsets.get(value) || "—"}
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(380px,calc(100vw-32px))] gap-0 p-0"
        align="start"
        sideOffset={6}
      >
        <div className="relative border-b border-border">
          <Search
            size={13}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="text"
            autoFocus
            placeholder="Search timezones or offsets…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-full bg-transparent pl-8 pr-3 text-[13px] text-ink outline-none placeholder:text-ink-faint"
          />
        </div>
        <div ref={listRef} className="max-h-[300px] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">
              No matches
            </p>
          ) : (
            filtered.map((tz) => {
              const selected = tz === value;
              return (
                <button
                  type="button"
                  key={tz}
                  onClick={() => {
                    onChange(tz);
                    setOpen(false);
                  }}
                  className={`group flex w-full items-center justify-between gap-3 px-2.5 py-1.5 text-left transition-colors duration-100 ${
                    selected
                      ? "bg-primary-tint text-ink"
                      : "text-ink-soft hover:bg-surface-hover hover:text-ink"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="inline-flex h-3 w-3 shrink-0 items-center justify-center">
                      {selected ? <Check size={12} className="text-primary" /> : null}
                    </span>
                    <span className="truncate font-mono text-[12.5px] tabular">
                      {tz.replaceAll("_", " ")}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.04em] text-ink-muted">
                    {offsets.get(tz) || "—"}
                  </span>
                </button>
              );
            })
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border px-3 py-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
            {filtered.length} of {zones.length}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
            IANA
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
