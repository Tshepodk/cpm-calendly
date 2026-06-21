import type { ObjectId } from "mongodb";

export type EventColor = "iris" | "rose" | "amber" | "sage" | "slate";

export type CustomQuestion =
  | { id: string; label: string; type: "short_text" | "long_text"; required: boolean }
  | { id: string; label: string; type: "select"; required: boolean; options: string[] };

export type LocationSpec =
  | { type: "google_meet" }
  | { type: "phone"; phoneNumber: string }
  | { type: "custom"; customText: string };

export interface UserDoc {
  _id: ObjectId;
  email: string;
  name: string;
  bio: string | null;
  defaultTimezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ConnectionStatus = "ACTIVE" | "EXPIRED" | "FAILED" | "INACTIVE" | "INITIATED";

export interface IntegrationDoc {
  _id: ObjectId;
  userId: ObjectId;
  provider: "google_calendar";
  composioConnectionId: string;
  composioUserId: string;
  status: ConnectionStatus;
  calendarId: string;
  calendarSummary: string;
  connectedAt: Date;
  lastCheckedAt: Date;
}

export interface EventTypeDoc {
  _id: ObjectId;
  slug: string;
  title: string;
  description: string;
  durationMinutes: number;
  color: EventColor;
  location: LocationSpec;
  rules: {
    bufferBeforeMin: number;
    bufferAfterMin: number;
    minNoticeMinutes: number;
    maxAdvanceDays: number;
    maxBookingsPerDay: number | null;
  };
  customQuestions: CustomQuestion[];
  active: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AvailabilityDoc {
  _id: ObjectId;
  userId: ObjectId;
  timezone: string;
  weeklyHours: Array<{
    dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    intervals: Array<{ start: string; end: string }>;
  }>;
  dateOverrides: Array<{
    date: string;
    intervals: Array<{ start: string; end: string }>;
  }>;
  updatedAt: Date;
}

export type BookingStatus = "confirmed" | "cancelled" | "rescheduled";

export interface BookingDoc {
  _id: ObjectId;
  eventTypeSlug: string;
  eventTypeId: ObjectId;
  guestName: string;
  guestEmail: string;
  guestTimezone: string;
  customAnswers: Record<string, string>;
  startUtc: Date;
  endUtc: Date;
  googleEventId: string;
  meetLink: string | null;
  manageToken: string;
  status: BookingStatus;
  rescheduledToBookingId: ObjectId | null;
  createdAt: Date;
  cancelledAt: Date | null;
}
