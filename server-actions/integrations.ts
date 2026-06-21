"use server";

import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/auth-helpers";
import { initiateGoogleConnection, getConnection, listCalendars } from "@/lib/calendar";
import { integrations } from "@/lib/collections";
import { env } from "@/lib/env";

export async function startGoogleConnect() {
  const session = await requireAdmin();
  const userId = session.user.id;
  const callbackUrl = `${env().APP_URL}/api/integrations/google/callback`;
  const { redirectUrl, connectionId } = await initiateGoogleConnection(userId, callbackUrl);

  await (await integrations()).updateOne(
    { userId: new ObjectId(userId), provider: "google_calendar" },
    {
      $setOnInsert: {
        _id: new ObjectId(),
        userId: new ObjectId(userId),
        provider: "google_calendar",
        composioUserId: userId,
        connectedAt: new Date(),
        calendarSummary: "",
      },
      $set: {
        composioConnectionId: connectionId,
        status: "INITIATED" as const,
        calendarId: "primary",
        lastCheckedAt: new Date(),
      },
    },
    { upsert: true },
  );

  redirect(redirectUrl);
}

export async function setActiveCalendar(calendarId: string, calendarSummary: string) {
  const session = await requireAdmin();
  await (await integrations()).updateOne(
    { userId: new ObjectId(session.user.id), provider: "google_calendar" },
    { $set: { calendarId, calendarSummary, lastCheckedAt: new Date() } },
  );
}

export async function disconnectGoogle() {
  const session = await requireAdmin();
  await (await integrations()).deleteOne({
    userId: new ObjectId(session.user.id),
    provider: "google_calendar",
  });
}
