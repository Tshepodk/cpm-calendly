import type { Collection } from "mongodb";
import { getDb } from "./db";
import type {
  UserDoc,
  IntegrationDoc,
  EventTypeDoc,
  AvailabilityDoc,
  BookingDoc,
} from "./types";

export async function users(): Promise<Collection<UserDoc>> {
  return (await getDb()).collection<UserDoc>("users");
}
export async function integrations(): Promise<Collection<IntegrationDoc>> {
  return (await getDb()).collection<IntegrationDoc>("integrations");
}
export async function eventTypes(): Promise<Collection<EventTypeDoc>> {
  return (await getDb()).collection<EventTypeDoc>("eventTypes");
}
export async function availability(): Promise<Collection<AvailabilityDoc>> {
  return (await getDb()).collection<AvailabilityDoc>("availability");
}
export async function bookings(): Promise<Collection<BookingDoc>> {
  return (await getDb()).collection<BookingDoc>("bookings");
}

let indexesEnsured = false;

export async function ensureIndexes() {
  if (indexesEnsured) return;
  const [et, bk] = [await eventTypes(), await bookings()];
  await et.createIndex({ slug: 1 }, { unique: true });
  await et.createIndex({ active: 1, position: 1 });
  await bk.createIndex({ manageToken: 1 }, { unique: true });
  await bk.createIndex({ startUtc: 1 });
  await bk.createIndex({ status: 1, startUtc: 1 });
  await bk.createIndex({ endUtc: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });
  indexesEnsured = true;
}
