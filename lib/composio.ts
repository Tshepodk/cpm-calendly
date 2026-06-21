import { Composio } from "@composio/core";
import { env } from "./env";

let client: Composio | null = null;

export function composio(): Composio {
  if (!client) client = new Composio({ apiKey: env().COMPOSIO_API_KEY });
  return client;
}

export class CalendarConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalendarConnectionError";
  }
}
