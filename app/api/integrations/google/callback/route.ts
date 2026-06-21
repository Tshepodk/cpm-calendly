import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { integrations } from "@/lib/collections";
import { getConnection, listCalendars } from "@/lib/calendar";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const userId = session.user.id;
  const integ = await (await integrations()).findOne({
    userId: new ObjectId(userId),
    provider: "google_calendar",
  });
  if (!integ) {
    return NextResponse.redirect(new URL("/settings?error=no_connection", req.url));
  }

  const { status } = await getConnection(integ.composioConnectionId);
  if (status !== "ACTIVE") {
    await (await integrations()).updateOne(
      { _id: integ._id },
      { $set: { status: status as any, lastCheckedAt: new Date() } },
    );
    return NextResponse.redirect(new URL("/settings?error=connection_failed", req.url));
  }

  const cals = await listCalendars(userId);
  const primary = cals.find((c) => c.primary) ?? cals[0];

  await (await integrations()).updateOne(
    { _id: integ._id },
    {
      $set: {
        status: "ACTIVE",
        calendarId: primary?.id ?? "primary",
        calendarSummary: primary?.summary ?? "Primary",
        connectedAt: new Date(),
        lastCheckedAt: new Date(),
      },
    },
  );

  return NextResponse.redirect(new URL("/settings?connected=1", req.url));
}
