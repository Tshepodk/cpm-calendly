import { NextResponse } from "next/server";
import { eventTypes, availability, integrations, bookings } from "@/lib/collections";
import { computeSlots } from "@/lib/availability";
import { ymdInTz } from "@/lib/timezone";
import { getBusyTimes } from "@/lib/calendar";

export const revalidate = 30;

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const evt = await (await eventTypes()).findOne({ slug, active: true });
  if (!evt) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const integ = await (await integrations()).findOne({ provider: "google_calendar", status: "ACTIVE" });
  if (!integ) return NextResponse.json({ error: "calendar_not_connected" }, { status: 503 });

  const avail = await (await availability()).findOne({ userId: integ.userId });
  if (!avail) return NextResponse.json({ error: "no_availability" }, { status: 503 });

  const now = new Date();
  const horizon = new Date(now.getTime() + evt.rules.maxAdvanceDays * 24 * 3600_000);

  let busy: Array<{ start: Date; end: Date }>;
  try {
    busy = await getBusyTimes(integ.composioUserId, integ.calendarId, now, horizon, avail.timezone);
  } catch {
    return NextResponse.json({ error: "calendar_unavailable" }, { status: 503 });
  }

  const counts: Record<string, number> = {};
  if (evt.rules.maxBookingsPerDay !== null) {
    const list = await (await bookings()).find({
      eventTypeSlug: slug,
      status: "confirmed",
      startUtc: { $gte: now, $lt: horizon },
    }).toArray();
    for (const b of list) {
      const k = ymdInTz(b.startUtc, avail.timezone);
      counts[k] = (counts[k] ?? 0) + 1;
    }
  }

  const slots = computeSlots({ eventType: evt, availability: avail, busy, now, bookingsPerDay: counts });
  return NextResponse.json({
    timezone: avail.timezone,
    slots: slots.map((s) => ({ startUtc: s.startUtc.toISOString(), endUtc: s.endUtc.toISOString() })),
  });
}
