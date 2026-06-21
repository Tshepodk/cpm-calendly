"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eventTypes } from "@/lib/collections";
import { eventTypeFormSchema } from "@/lib/validation";
import { requireAdmin } from "@/lib/auth-helpers";
import type { EventTypeDoc } from "@/lib/types";

export async function createEventType(formData: FormData) {
  await requireAdmin();
  const parsed = eventTypeFormSchema.parse(JSON.parse(String(formData.get("payload"))));
  const col = await eventTypes();
  const last = await col.find().sort({ position: -1 }).limit(1).toArray();
  const position = (last[0]?.position ?? 0) + 1;
  const doc: EventTypeDoc = {
    _id: new ObjectId(),
    ...parsed,
    position,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await col.insertOne(doc);
  revalidatePath("/event-types");
  redirect("/event-types");
}

export async function updateEventType(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = eventTypeFormSchema.parse(JSON.parse(String(formData.get("payload"))));
  const col = await eventTypes();
  await col.updateOne({ _id: new ObjectId(id) }, { $set: { ...parsed, updatedAt: new Date() } });
  revalidatePath("/event-types");
  redirect("/event-types");
}

export async function deleteEventType(id: string) {
  await requireAdmin();
  await (await eventTypes()).deleteOne({ _id: new ObjectId(id) });
  revalidatePath("/event-types");
}

export async function toggleActive(id: string, active: boolean) {
  await requireAdmin();
  await (await eventTypes()).updateOne(
    { _id: new ObjectId(id) },
    { $set: { active, updatedAt: new Date() } },
  );
  revalidatePath("/event-types");
}

export async function reorderEventType(id: string, newPosition: number) {
  await requireAdmin();
  await (await eventTypes()).updateOne(
    { _id: new ObjectId(id) },
    { $set: { position: newPosition, updatedAt: new Date() } },
  );
  revalidatePath("/event-types");
}
