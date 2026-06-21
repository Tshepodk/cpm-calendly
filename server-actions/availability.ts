"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { availability, users } from "@/lib/collections";
import { availabilityFormSchema } from "@/lib/validation";
import { requireAdmin } from "@/lib/auth-helpers";
import type { AvailabilityDoc } from "@/lib/types";

export async function saveAvailability(formData: FormData) {
  const session = await requireAdmin();
  const parsed = availabilityFormSchema.parse(JSON.parse(String(formData.get("payload"))));
  const user = await (await users()).findOne({ _id: new ObjectId(session.user.id) });
  if (!user) throw new Error("User missing");
  await (await availability()).updateOne(
    { userId: user._id },
    { $set: { ...parsed, weeklyHours: parsed.weeklyHours as AvailabilityDoc["weeklyHours"], userId: user._id, updatedAt: new Date() } },
    { upsert: true },
  );
  revalidatePath("/availability");
}
