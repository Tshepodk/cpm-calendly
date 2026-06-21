import { composio, CalendarConnectionError } from "./composio";

export interface BusyInterval {
  start: Date;
  end: Date;
}

export interface CalendarSummary {
  id: string;
  summary: string;
  primary: boolean;
}

const GOOGLE_TOOLKIT = "googlecalendar";
const AUTH_CONFIG_NAME = "Kalendly Google Calendar";

let cachedAuthConfigId: string | null = null;

export async function ensureGoogleAuthConfig(): Promise<string> {
  if (cachedAuthConfigId) return cachedAuthConfigId;

  const existing = await composio().authConfigs.list({
    toolkit: GOOGLE_TOOLKIT,
    isComposioManaged: true,
  });
  const found = existing.items?.[0];
  if (found?.id) {
    cachedAuthConfigId = found.id;
    return cachedAuthConfigId;
  }

  const created = await composio().authConfigs.create(GOOGLE_TOOLKIT, {
    type: "use_composio_managed_auth",
    name: AUTH_CONFIG_NAME,
  });
  cachedAuthConfigId = created.id;
  return cachedAuthConfigId;
}

export async function initiateGoogleConnection(userId: string, callbackUrl: string) {
  const authConfigId = await ensureGoogleAuthConfig();
  const req = await composio().connectedAccounts.initiate(userId, authConfigId, { callbackUrl });
  // req.redirectUrl is string | null per SDK types; cast to string for redirect flow
  return { redirectUrl: req.redirectUrl as string, connectionId: req.id };
}

export async function getConnection(connectionId: string) {
  const acc = await composio().connectedAccounts.get(connectionId);
  return { id: acc.id, status: acc.status as string };
}

export async function listCalendars(userId: string): Promise<CalendarSummary[]> {
  const res = await composio().tools.execute("GOOGLECALENDAR_LIST_CALENDARS", {
    userId,
    arguments: {},
    dangerouslySkipVersionCheck: true,
  });
  if (!res.successful) throw new CalendarConnectionError(res.error ?? "list_calendars failed");

  const raw = res.data as Record<string, unknown> | null | undefined;
  if (process.env.NODE_ENV !== "production") {
    console.log("[calendar] LIST_CALENDARS response keys:", raw ? Object.keys(raw) : "(none)");
  }

  // Composio wraps Google API responses inconsistently: items may be at the top level
  // (data.items), nested under data/response_data/calendar_list/calendars, or the
  // result itself may be the array.
  const candidates: unknown[] = [
    raw,
    raw?.data,
    raw?.response_data,
    raw?.calendar_list,
    raw?.calendars,
    raw?.calendarList,
    raw?.items,
  ];

  let items: Array<Record<string, unknown>> = [];
  for (const c of candidates) {
    if (Array.isArray(c)) {
      items = c as Array<Record<string, unknown>>;
      break;
    }
    if (c && typeof c === "object" && Array.isArray((c as { items?: unknown }).items)) {
      items = (c as { items: Array<Record<string, unknown>> }).items;
      break;
    }
  }

  if (items.length === 0) {
    console.error(
      "[calendar] LIST_CALENDARS returned no calendars; raw response:",
      JSON.stringify(raw, null, 2),
    );
    return [];
  }

  return items.map((c) => ({
    id: String(c.id ?? c.calendar_id ?? c.calendarId ?? ""),
    summary: String(c.summary ?? c.name ?? c.summary_override ?? c.id ?? ""),
    primary: Boolean(c.primary ?? false),
  }));
}

export async function getBusyTimes(
  userId: string,
  calendarId: string,
  start: Date,
  end: Date,
  timezone: string,
): Promise<BusyInterval[]> {
  const res = await composio().tools.execute("GOOGLECALENDAR_FIND_FREE_SLOTS", {
    userId,
    arguments: {
      time_min: start.toISOString(),
      time_max: end.toISOString(),
      items: [{ id: calendarId }],
      timezone,
    },
    dangerouslySkipVersionCheck: true,
  });
  if (!res.successful) throw new CalendarConnectionError(res.error ?? "find_free_slots failed");
  const calendars = (
    res.data as {
      calendars?: Record<string, { busy?: Array<{ start: string; end: string }> }>;
    }
  ).calendars ?? {};
  const cal = calendars[calendarId];
  const busy = cal?.busy ?? [];
  return busy.map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
}

// ---------------------------------------------------------------------------
// Write API
// ---------------------------------------------------------------------------

export interface CreateEventInput {
  summary: string;
  description: string;
  startUtc: Date;
  durationMinutes: number;
  attendees: Array<{ email: string; displayName?: string }>;
  withMeet: boolean;
}

export interface CreatedEvent {
  googleEventId: string;
  meetLink: string | null;
}

export async function createCalendarEvent(
  userId: string,
  calendarId: string,
  input: CreateEventInput,
): Promise<CreatedEvent> {
  const hours = Math.floor(input.durationMinutes / 60);
  const minutes = input.durationMinutes % 60;
  const res = await composio().tools.execute("GOOGLECALENDAR_CREATE_EVENT", {
    userId,
    arguments: {
      calendar_id: calendarId,
      summary: input.summary,
      description: input.description,
      start_datetime: input.startUtc.toISOString(),
      timezone: "UTC",
      event_duration_hour: hours,
      event_duration_minutes: minutes,
      attendees: input.attendees.map((a) => a.email),
      create_meeting_room: input.withMeet,
      send_updates: "all",
    },
    dangerouslySkipVersionCheck: true,
  });
  if (!res.successful) throw new CalendarConnectionError(res.error ?? "create_event failed");
  const raw = res.data as Record<string, unknown>;
  if (process.env.NODE_ENV !== "production") {
    console.log("[calendar] CREATE_EVENT response keys:", Object.keys(raw));
  }
  // Composio sometimes wraps the API response under .response_data / .event / .data
  const event = (raw.response_data ?? raw.event ?? raw.data ?? raw) as Record<string, unknown>;

  const id =
    (event.id as string | undefined) ??
    (event.event_id as string | undefined) ??
    (event.eventId as string | undefined);

  const hangoutLink = event.hangoutLink as string | undefined;
  const conferenceData = event.conferenceData as
    | { entryPoints?: Array<{ entryPointType: string; uri: string }> }
    | undefined;
  const meetEntry = conferenceData?.entryPoints?.find((e) => e.entryPointType === "video");
  const meetLink = hangoutLink ?? meetEntry?.uri ?? null;

  if (!id) {
    console.error("[calendar] CREATE_EVENT response (no id found):", JSON.stringify(raw, null, 2));
    throw new CalendarConnectionError("create_event: missing event id");
  }
  return { googleEventId: id, meetLink };
}

export async function deleteCalendarEvent(userId: string, calendarId: string, eventId: string) {
  const res = await composio().tools.execute("GOOGLECALENDAR_DELETE_EVENT", {
    userId,
    arguments: { calendar_id: calendarId, event_id: eventId, send_updates: "all" },
    dangerouslySkipVersionCheck: true,
  });
  if (!res.successful) throw new CalendarConnectionError(res.error ?? "delete_event failed");
}
