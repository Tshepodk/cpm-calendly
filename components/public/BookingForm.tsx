"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { CustomQuestion } from "@/lib/types";

interface Props {
  slug: string;
  startUtc: string;
  guestTimezone: string;
  customQuestions: CustomQuestion[];
}

export function BookingForm({ slug, startUtc, guestTimezone, customQuestions }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  function setAnswer(id: string, value: string) {
    setAnswers((a) => ({ ...a, [id]: value }));
  }

  async function submit(form: FormData) {
    setError(null);
    start(async () => {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          startUtc,
          guestTimezone,
          guestName: String(form.get("guestName") ?? ""),
          guestEmail: String(form.get("guestEmail") ?? ""),
          customAnswers: answers,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data.error === "slot_taken"
            ? "That slot was just taken. Please pick another."
            : "Could not complete booking.",
        );
        return;
      }
      const { token } = await res.json();
      router.push(`/${slug}/booked?token=${token}`);
    });
  }

  return (
    <form action={submit} className="max-w-md space-y-5">
      <div className="space-y-2">
        <Label htmlFor="guestName">Name</Label>
        <Input id="guestName" name="guestName" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="guestEmail">Email</Label>
        <Input id="guestEmail" name="guestEmail" type="email" required />
      </div>
      {customQuestions.map((q) => (
        <div key={q.id} className="space-y-2">
          <Label htmlFor={q.id}>
            {q.label}
            {q.required && <span className="ml-0.5 text-danger">*</span>}
          </Label>
          {q.type === "long_text" ? (
            <Textarea
              id={q.id}
              required={q.required}
              value={answers[q.id] ?? ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
            />
          ) : q.type === "select" ? (
            <select
              id={q.id}
              required={q.required}
              value={answers[q.id] ?? ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink outline-none transition-colors duration-150 hover:border-border-strong focus:border-primary focus:ring-2 focus:ring-ring"
            >
              <option value="">Choose…</option>
              {q.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : (
            <Input
              id={q.id}
              required={q.required}
              value={answers[q.id] ?? ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
            />
          )}
        </div>
      ))}
      {error && (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[12.5px] text-danger">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="w-full gap-2">
        {pending ? (
          <>
            <Loader2 className="animate-spin" />
            <span>Scheduling…</span>
          </>
        ) : (
          <>
            <span>Schedule event</span>
            <ArrowRight />
          </>
        )}
      </Button>
    </form>
  );
}
