"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TimezoneCombobox } from "@/components/ui/timezone-combobox";
import { saveProfile } from "@/server-actions/settings";
import {
  startGoogleConnect,
  setActiveCalendar,
  disconnectGoogle,
} from "@/server-actions/integrations";

export function ProfileSection({
  name,
  bio,
  tz,
}: {
  name: string;
  bio: string | null;
  tz: string;
}) {
  const [pending, start] = useTransition();
  const [timezone, setTimezone] = useState(tz);
  return (
    <form action={(fd) => start(() => saveProfile(fd))} className="space-y-5 max-w-xl">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" name="bio" defaultValue={bio ?? ""} rows={2} />
      </div>
      <div className="space-y-2 max-w-sm">
        <Label htmlFor="defaultTimezone">Default timezone</Label>
        <TimezoneCombobox value={timezone} onChange={setTimezone} />
        <input type="hidden" name="defaultTimezone" value={timezone} />
      </div>
      <Button type="submit" disabled={pending} className="gap-2">
        {pending ? (
          <>
            <Loader2 className="animate-spin" />
            <span>Saving…</span>
          </>
        ) : (
          <span>Save profile</span>
        )}
      </Button>
    </form>
  );
}

export function GoogleSection({
  status,
  calendars,
  selectedId,
  error,
}: {
  status: string | null;
  calendars: Array<{ id: string; summary: string; primary: boolean }>;
  selectedId: string | null;
  error?: string | null;
}) {
  const [pending, start] = useTransition();
  const statusColor =
    status === "ACTIVE"
      ? "bg-success/15 text-success"
      : status === "EXPIRED" || status === "FAILED"
        ? "bg-danger/15 text-danger"
        : "bg-surface-hover text-ink-muted";
  const statusLabel = status ?? "Not connected";
  return (
    <div className="space-y-5 max-w-xl">
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] ${statusColor}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {statusLabel}
        </span>
      </div>
      {status !== "ACTIVE" ? (
        <form action={() => start(() => startGoogleConnect())}>
          <Button type="submit" disabled={pending} className="gap-2">
            {pending ? (
              <>
                <Loader2 className="animate-spin" />
                <span>Redirecting…</span>
              </>
            ) : (
              <span>Connect Google Calendar</span>
            )}
          </Button>
        </form>
      ) : (
        <>
          <div className="space-y-2">
            <Label>Active calendar</Label>
            {calendars.length === 0 ? (
              <div className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-[12.5px] text-ink-muted">
                {error ?? "No calendars returned by Google."}
              </div>
            ) : (
              <select
                defaultValue={selectedId ?? ""}
                onChange={(e) => {
                  const cal = calendars.find((c) => c.id === e.target.value);
                  if (cal) start(() => setActiveCalendar(cal.id, cal.summary));
                }}
                className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink outline-none transition-colors duration-150 hover:border-border-strong focus:border-primary focus:ring-2 focus:ring-ring"
              >
                {!selectedId || !calendars.some((c) => c.id === selectedId) ? (
                  <option value="" disabled>
                    Choose a calendar…
                  </option>
                ) : null}
                {calendars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.summary}
                    {c.primary ? " (primary)" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
          <form action={() => start(() => disconnectGoogle())}>
            <Button type="submit" variant="outline" size="sm" disabled={pending}>
              Disconnect
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
