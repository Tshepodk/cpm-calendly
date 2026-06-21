export const dynamic = "force-dynamic";

import { ObjectId } from "mongodb";
import { availability, users } from "@/lib/collections";
import { requireAdmin } from "@/lib/auth-helpers";
import { AvailabilityEditor } from "@/components/admin/AvailabilityEditor";

export default async function AvailabilityPage() {
  const session = await requireAdmin();
  const user = await (await users()).findOne({ _id: new ObjectId(session.user.id) });
  if (!user) throw new Error("User missing");
  const doc = await (await availability()).findOne({ userId: user._id });
  const initial = doc
    ? { timezone: doc.timezone, weeklyHours: doc.weeklyHours, dateOverrides: doc.dateOverrides }
    : {
        timezone: "UTC",
        weeklyHours: [0, 1, 2, 3, 4, 5, 6].map((d) => ({
          dayOfWeek: d as 0 | 1 | 2 | 3 | 4 | 5 | 6,
          intervals: d === 0 || d === 6 ? [] : [{ start: "09:00", end: "17:00" }],
        })),
        dateOverrides: [],
      };

  return (
    <div className="space-y-8">
      <header className="space-y-2 border-b border-border pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
          Working hours
        </p>
        <h1 className="text-[28px] leading-tight tracking-[-0.02em]">Availability</h1>
        <p className="max-w-2xl text-[13px] text-ink-soft">
          Set the windows when you can take meetings. Date overrides let you block off
          specific days or open up extra hours.
        </p>
      </header>
      <AvailabilityEditor initial={initial} />
    </div>
  );
}
