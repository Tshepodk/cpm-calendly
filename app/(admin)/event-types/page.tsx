export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus, ListChecks } from "lucide-react";
import { eventTypes } from "@/lib/collections";
import { Button } from "@/components/ui/button";
import { EventTypeCard } from "@/components/admin/EventTypeCard";
import { env } from "@/lib/env";

export default async function EventTypesPage() {
  const list = await (await eventTypes()).find().sort({ position: 1 }).toArray();
  const activeCount = list.filter((e) => e.active).length;

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
            Event types · {activeCount} active
          </p>
          <h1 className="text-[28px] leading-tight tracking-[-0.02em]">Event types</h1>
        </div>
        <Button nativeButton={false} size="sm" render={<Link href="/event-types/new" />} className="gap-1.5">
          <Plus />
          New event type
        </Button>
      </header>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-bg-elevated px-6 py-16 text-center">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-ink-muted">
            <ListChecks size={16} />
          </span>
          <div className="space-y-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
              Empty
            </p>
            <p className="text-[13px] text-ink">No event types yet.</p>
          </div>
          <Button
            nativeButton={false}
            variant="outline"
            size="sm"
            className="mt-2 gap-1.5"
            render={<Link href="/event-types/new" />}
          >
            <Plus />
            Create your first
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {list.map((e) => (
            <EventTypeCard
              key={e._id.toString()}
              id={e._id.toString()}
              slug={e.slug}
              title={e.title}
              duration={e.durationMinutes}
              color={e.color}
              active={e.active}
              description={e.description}
              appUrl={env().APP_URL}
            />
          ))}
        </div>
      )}
    </div>
  );
}
