import { ObjectId } from "mongodb";
import { users, availability, ensureIndexes } from "./collections";
import { env } from "./env";

let bootstrapped = false;

export async function bootstrap() {
  if (bootstrapped) return;
  await ensureIndexes();

  const userCol = await users();
  const existing = await userCol.findOne({ email: env().ADMIN_EMAIL });
  if (!existing) {
    const userId = new ObjectId();
    await userCol.insertOne({
      _id: userId,
      email: env().ADMIN_EMAIL,
      name: "Admin",
      bio: null,
      defaultTimezone: "UTC",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const availCol = await availability();
    await availCol.insertOne({
      _id: new ObjectId(),
      userId,
      timezone: "UTC",
      weeklyHours: [
        { dayOfWeek: 0, intervals: [] },
        { dayOfWeek: 1, intervals: [{ start: "09:00", end: "17:00" }] },
        { dayOfWeek: 2, intervals: [{ start: "09:00", end: "17:00" }] },
        { dayOfWeek: 3, intervals: [{ start: "09:00", end: "17:00" }] },
        { dayOfWeek: 4, intervals: [{ start: "09:00", end: "17:00" }] },
        { dayOfWeek: 5, intervals: [{ start: "09:00", end: "17:00" }] },
        { dayOfWeek: 6, intervals: [] },
      ],
      dateOverrides: [],
      updatedAt: new Date(),
    });
  }

  bootstrapped = true;
}
