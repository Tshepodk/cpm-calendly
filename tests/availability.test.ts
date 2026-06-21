import { describe, it, expect } from "vitest";
import { computeSlots } from "@/lib/availability";
import type { AvailabilityDoc, EventTypeDoc } from "@/lib/types";

const baseEventType = {
  durationMinutes: 30,
  rules: {
    bufferBeforeMin: 0,
    bufferAfterMin: 0,
    minNoticeMinutes: 0,
    maxAdvanceDays: 7,
    maxBookingsPerDay: null,
  },
} as unknown as EventTypeDoc;

const baseAvailability: AvailabilityDoc = {
  _id: undefined as never,
  userId: undefined as never,
  timezone: "UTC",
  weeklyHours: [
    { dayOfWeek: 0, intervals: [] },
    { dayOfWeek: 1, intervals: [{ start: "09:00", end: "10:00" }] },
    { dayOfWeek: 2, intervals: [{ start: "09:00", end: "10:00" }] },
    { dayOfWeek: 3, intervals: [{ start: "09:00", end: "10:00" }] },
    { dayOfWeek: 4, intervals: [{ start: "09:00", end: "10:00" }] },
    { dayOfWeek: 5, intervals: [{ start: "09:00", end: "10:00" }] },
    { dayOfWeek: 6, intervals: [] },
  ],
  dateOverrides: [],
  updatedAt: new Date(),
};

describe("computeSlots", () => {
  it("emits 30-minute slots inside the working interval", () => {
    const now = new Date("2026-05-04T00:00:00Z");
    const slots = computeSlots({
      eventType: baseEventType,
      availability: baseAvailability,
      busy: [],
      now,
      bookingsPerDay: {},
    });
    const monday = slots.filter((s) => s.startUtc.toISOString().startsWith("2026-05-04"));
    expect(monday.map((s) => s.startUtc.toISOString())).toEqual([
      "2026-05-04T09:00:00.000Z",
      "2026-05-04T09:30:00.000Z",
    ]);
  });

  it("respects min notice", () => {
    const now = new Date("2026-05-04T09:10:00Z");
    const eventType = {
      ...baseEventType,
      rules: { ...baseEventType.rules, minNoticeMinutes: 60 },
    } as EventTypeDoc;
    const slots = computeSlots({
      eventType,
      availability: baseAvailability,
      busy: [],
      now,
      bookingsPerDay: {},
    });
    const monday = slots.filter((s) => s.startUtc.toISOString().startsWith("2026-05-04"));
    expect(monday).toHaveLength(0);
  });

  it("subtracts busy intervals (with buffers)", () => {
    const now = new Date("2026-05-04T00:00:00Z");
    const eventType = {
      ...baseEventType,
      rules: { ...baseEventType.rules, bufferAfterMin: 15 },
    } as EventTypeDoc;
    const slots = computeSlots({
      eventType,
      availability: baseAvailability,
      busy: [{ start: new Date("2026-05-04T09:30:00Z"), end: new Date("2026-05-04T09:45:00Z") }],
      now,
      bookingsPerDay: {},
    });
    const monday = slots.filter((s) => s.startUtc.toISOString().startsWith("2026-05-04"));
    expect(monday).toHaveLength(0);
  });

  it("applies maxBookingsPerDay cap", () => {
    const now = new Date("2026-05-04T00:00:00Z");
    const eventType = {
      ...baseEventType,
      rules: { ...baseEventType.rules, maxBookingsPerDay: 1 },
    } as EventTypeDoc;
    const slots = computeSlots({
      eventType,
      availability: baseAvailability,
      busy: [],
      now,
      bookingsPerDay: { "2026-05-04": 1 },
    });
    expect(slots.filter((s) => s.startUtc.toISOString().startsWith("2026-05-04"))).toHaveLength(0);
  });

  it("honors date overrides (block)", () => {
    const now = new Date("2026-05-04T00:00:00Z");
    const avail: AvailabilityDoc = {
      ...baseAvailability,
      dateOverrides: [{ date: "2026-05-04", intervals: [] }],
    };
    const slots = computeSlots({
      eventType: baseEventType,
      availability: avail,
      busy: [],
      now,
      bookingsPerDay: {},
    });
    expect(slots.filter((s) => s.startUtc.toISOString().startsWith("2026-05-04"))).toHaveLength(0);
  });

  it("honors date overrides (extend)", () => {
    const now = new Date("2026-05-04T00:00:00Z");
    const avail: AvailabilityDoc = {
      ...baseAvailability,
      dateOverrides: [{ date: "2026-05-04", intervals: [{ start: "14:00", end: "15:00" }] }],
    };
    const slots = computeSlots({
      eventType: baseEventType,
      availability: avail,
      busy: [],
      now,
      bookingsPerDay: {},
    });
    const monday = slots
      .filter((s) => s.startUtc.toISOString().startsWith("2026-05-04"))
      .map((s) => s.startUtc.toISOString());
    expect(monday).toEqual([
      "2026-05-04T14:00:00.000Z",
      "2026-05-04T14:30:00.000Z",
    ]);
  });

  it("respects maxAdvanceDays window", () => {
    const now = new Date("2026-05-04T00:00:00Z");
    const eventType = {
      ...baseEventType,
      rules: { ...baseEventType.rules, maxAdvanceDays: 1 },
    } as EventTypeDoc;
    const slots = computeSlots({
      eventType,
      availability: baseAvailability,
      busy: [],
      now,
      bookingsPerDay: {},
    });
    expect(slots.every((s) => s.startUtc < new Date("2026-05-06T00:00:00Z"))).toBe(true);
  });
});
