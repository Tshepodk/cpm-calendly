"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Calendar, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ManagePanel({ token, slug }: { token: string; slug: string }) {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (done) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3.5 py-3">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-success/15 text-success">
          <Check size={14} strokeWidth={2.5} />
        </span>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
            Cancelled
          </p>
          <p className="mt-0.5 text-[13px] text-ink">This booking has been cancelled.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="lg"
        className="w-full gap-2"
        onClick={() => router.push(`/${slug}?reschedule=${token}`)}
      >
        <Calendar />
        <span>Reschedule</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className={`w-full gap-2 ${confirming ? "border-danger text-danger hover:bg-danger/10" : ""}`}
        onClick={() => {
          if (!confirming) {
            setConfirming(true);
            return;
          }
          start(async () => {
            const res = await fetch(`/api/bookings/${token}`, { method: "DELETE" });
            if (res.ok) setDone(true);
          });
        }}
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className="animate-spin" />
            <span>Cancelling…</span>
          </>
        ) : confirming ? (
          <>
            <Trash2 />
            <span>Click again to confirm cancel</span>
          </>
        ) : (
          <>
            <Trash2 />
            <span>Cancel booking</span>
          </>
        )}
      </Button>
      {confirming && !pending && (
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="mx-auto block font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted hover:text-ink"
        >
          Keep booking
        </button>
      )}
    </div>
  );
}
