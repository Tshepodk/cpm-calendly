"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { users } from "@/lib/collections";
import { profileFormSchema } from "@/lib/validation";
import { requireAdmin } from "@/lib/auth-helpers";

export async function saveProfile(formData: FormData) {
  const session = await requireAdmin();
  const parsed = profileFormSchema.parse({
    name: String(formData.get("name") ?? ""),
    bio: formData.get("bio") ? String(formData.get("bio")) : null,
    defaultTimezone: String(formData.get("defaultTimezone") ?? "UTC"),
  });
  await (await users()).updateOne(
    { _id: new ObjectId(session.user.id) },
    { $set: { ...parsed, updatedAt: new Date() } },
  );
  revalidatePath("/settings");
}
