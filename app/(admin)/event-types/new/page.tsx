import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EventTypeForm } from "@/components/admin/EventTypeForm";

export default function NewEventType() {
  return (
    <div className="space-y-8">
      <Link
        href="/event-types"
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 -ml-1.5 text-[12px] text-ink-muted transition-colors duration-150 hover:bg-surface-hover hover:text-ink"
      >
        <ArrowLeft size={13} /> All event types
      </Link>
      <header className="space-y-2 border-b border-border pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
          New event type
        </p>
        <h1 className="text-[28px] leading-tight tracking-[-0.02em]">Create event type</h1>
      </header>
      <EventTypeForm />
    </div>
  );
}
