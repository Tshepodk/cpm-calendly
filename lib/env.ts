import { z } from "zod";

const schema = z.object({
  MONGODB_URI: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.url(),
  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD: z.string().min(1),
  APP_URL: z.url(),
  COMPOSIO_API_KEY: z.string().min(1),
});

type Env = z.infer<typeof schema>;

let parsed: Env | null = null;

export function env(): Env {
  if (parsed) return parsed;
  const result = schema.safeParse(process.env);
  if (!result.success) {
    // During `next build`, modules are evaluated to collect page data.
    // If env vars aren't set yet (e.g. first Vercel deploy), don't fail
    // the build — return placeholders so module evaluation completes.
    // Runtime requests re-evaluate and validate strictly.
    if (process.env.NEXT_PHASE === "phase-production-build") {
      return new Proxy({} as Env, {
        get: (_, key: string) => process.env[key] ?? "build-placeholder",
      });
    }
    const missing = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Missing/invalid env vars: ${missing}`);
  }
  parsed = result.data;
  return parsed;
}
