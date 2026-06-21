export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ObjectId } from "mongodb";
import { notFound } from "next/navigation";
import { EventTypeForm } from "@/components/admin/EventTypeForm";
import { eventTypes } from "@/lib/collections";

export default async function EditEventType({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const evt = await (await eventTypes()).findOne({ _id: new ObjectId(id) });
  if (!evt) notFound();

  const initial = {
    slug: evt.slug,
    title: evt.title,
    description: evt.description,
    durationMinutes: evt.durationMinutes,
    color: evt.color,
    location: evt.location,
    rules: evt.rules,
    customQuestions: evt.customQuestions,
    active: evt.active,
  };

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
          /{evt.slug}
        </p>
        <h1 className="text-[28px] leading-tight tracking-[-0.02em]">{evt.title}</h1>
      </header>
      <EventTypeForm existingId={id} initial={initial} />
    </div>
  );
}
