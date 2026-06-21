"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TimezoneCombobox } from "@/components/ui/timezone-combobox";
import type { AvailabilityDoc } from "@/lib/types";
import { saveAvailability } from "@/server-actions/availability";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dayShort = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

type Editable = {
  timezone: string;
  weeklyHours: AvailabilityDoc["weeklyHours"];
  dateOverrides: AvailabilityDoc["dateOverrides"];
};

export function AvailabilityEditor({ initial }: { initial: Editable }) {
  const [state, setState] = useState<Editable>(initial);
  const [pending, start] = useTransition();

  function setIntervals(dayOfWeek: number, intervals: { start: string; end: string }[]) {
    const next = state.weeklyHours.map((d) =>
      d.dayOfWeek === dayOfWeek ? { ...d, intervals } : d,
    );
    setState({ ...state, weeklyHours: next });
  }

  function toggleDay(dayOfWeek: number, enabled: boolean) {
    setIntervals(dayOfWeek, enabled ? [{ start: "09:00", end: "17:00" }] : []);
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
      <section className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr] md:gap-10">
        <div>
          <h2 className="text-[14px] font-medium tracking-[-0.005em] text-ink">Timezone</h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">
            All times below are interpreted in this zone.
          </p>
        </div>
        <div className="space-y-2 max-w-sm">
          <Label htmlFor="timezone">IANA timezone</Label>
          <TimezoneCombobox
            value={state.timezone}
            onChange={(tz) => setState({ ...state, timezone: tz })}
          />
        </div>
      </section>

      <div className="border-t border-border" />

      <section className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr] md:gap-10">
        <div>
          <h2 className="text-[14px] font-medium tracking-[-0.005em] text-ink">Weekly hours</h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">
            The default windows for each day of the week.
          </p>
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <ul className="divide-y divide-border">
            {state.weeklyHours.map((d) => {
              const enabled = d.intervals.length > 0;
              return (
                <li key={d.dayOfWeek} className="flex flex-col gap-3 p-4 md:flex-row md:items-start">
                  <div className="flex w-32 shrink-0 items-center gap-2.5">
                    <Switch
                      checked={enabled}
                      onCheckedChange={(v) => toggleDay(d.dayOfWeek, v)}
                      aria-label={`Toggle ${dayNames[d.dayOfWeek]}`}
                    />
                    <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink">
                      {dayShort[d.dayOfWeek]}
                    </span>
                  </div>
                  <div className="flex-1 space-y-2">
                    {!enabled && (
                      <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">
                        Unavailable
                      </p>
                    )}
                    {d.intervals.map((iv, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <Input
                          className="w-24 font-mono tabular text-[13px]"
                          value={iv.start}
                          onChange={(e) => {
                            const next = [...d.intervals];
                            next[idx] = { ...iv, start: e.target.value };
                            setIntervals(d.dayOfWeek, next);
                          }}
                        />
                        <span className="font-mono text-[11px] text-ink-faint">—</span>
                        <Input
                          className="w-24 font-mono tabular text-[13px]"
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
                          size="icon-sm"
                          aria-label="Remove interval"
                          onClick={() =>
                            setIntervals(
                              d.dayOfWeek,
                              d.intervals.filter((_, i) => i !== idx),
                            )
                          }
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ))}
                    {enabled && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setIntervals(d.dayOfWeek, [
                            ...d.intervals,
                            { start: "09:00", end: "17:00" },
                          ])
                        }
                        className="gap-1 -ml-2 text-ink-muted hover:text-ink"
                      >
                        <Plus />
                        Add interval
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <div className="border-t border-border" />

      <section className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr] md:gap-10">
        <div>
          <h2 className="text-[14px] font-medium tracking-[-0.005em] text-ink">Date overrides</h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">
            One-off changes to your weekly hours.
          </p>
        </div>
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={addOverride} className="gap-1.5">
              <Plus />
              Add override
            </Button>
          </div>
          {state.dateOverrides.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-bg-elevated px-4 py-6 text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">
                No overrides
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {state.dateOverrides.map((o, oi) => (
                <div key={oi} className="space-y-2 rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-center gap-2">
                    <Input
                      className="w-44 font-mono tabular text-[13px]"
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
                      size="icon-sm"
                      aria-label="Remove override"
                      onClick={() =>
                        setState({
                          ...state,
                          dateOverrides: state.dateOverrides.filter((_, i) => i !== oi),
                        })
                      }
                      className="ml-auto"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  {o.intervals.length === 0 && (
                    <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">
                      Blocked entirely
                    </p>
                  )}
                  {o.intervals.map((iv, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <Input
                        className="w-24 font-mono tabular text-[13px]"
                        value={iv.start}
                        onChange={(e) => {
                          const next = [...state.dateOverrides];
                          next[oi]!.intervals[idx] = { ...iv, start: e.target.value };
                          setState({ ...state, dateOverrides: next });
                        }}
                      />
                      <span className="font-mono text-[11px] text-ink-faint">—</span>
                      <Input
                        className="w-24 font-mono tabular text-[13px]"
                        value={iv.end}
                        onChange={(e) => {
                          const next = [...state.dateOverrides];
                          next[oi]!.intervals[idx] = { ...iv, end: e.target.value };
                          setState({ ...state, dateOverrides: next });
                        }}
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const next = [...state.dateOverrides];
                      next[oi]!.intervals = [
                        ...next[oi]!.intervals,
                        { start: "09:00", end: "17:00" },
                      ];
                      setState({ ...state, dateOverrides: next });
                    }}
                    className="gap-1 -ml-2 text-ink-muted hover:text-ink"
                  >
                    <Plus />
                    Add interval
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="sticky bottom-4 z-10 flex justify-end border-t border-border bg-bg/85 -mx-2 px-2 pt-4 backdrop-blur">
        <Button type="submit" disabled={pending} className="gap-2">
          {pending ? (
            <>
              <Loader2 className="animate-spin" />
              <span>Saving…</span>
            </>
          ) : (
            <span>Save availability</span>
          )}
        </Button>
      </div>
    </form>
  );
}
