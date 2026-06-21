import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isValidTokenShape } from "@/lib/tokens";
import { cancelBooking, rescheduleBooking, BookingError } from "@/lib/booking";

const patchSchema = z.object({ newStartUtc: z.iso.datetime() });

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isValidTokenShape(token)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try {
    await cancelBooking(token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof BookingError) return NextResponse.json({ error: err.code }, { status: 404 });
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isValidTokenShape(token)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation" }, { status: 400 });

  try {
    const updated = await rescheduleBooking(token, new Date(parsed.data.newStartUtc));
    return NextResponse.json({ token: updated.manageToken });
  } catch (err) {
    if (err instanceof BookingError) {
      const status = err.code === "slot_taken" ? 409 : err.code === "not_found" ? 404 : err.code === "calendar" ? 503 : 400;
      return NextResponse.json({ error: err.code }, { status });
    }
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
