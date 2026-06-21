"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toggleActive, deleteEventType } from "@/server-actions/event-types";
import { Copy, Pencil, Trash2, Check } from "lucide-react";

const colorMap: Record<string, string> = {
  iris: "var(--event-iris)",
  rose: "var(--event-rose)",
  amber: "var(--event-amber)",
  sage: "var(--event-sage)",
  slate: "var(--event-slate)",
};

interface Props {
  id: string;
  slug: string;
  title: string;
  duration: number;
  color: string;
  active: boolean;
  description: string;
  appUrl: string;
}

export function EventTypeCard({
  id,
  slug,
  title,
  duration,
  color,
  active,
  description,
  appUrl,
}: Props) {
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const link = `${appUrl}/${slug}`;

  function copy() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  }

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-surface transition-colors duration-150 hover:border-border-strong">
      <span
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: colorMap[color] }}
      />
      <div className="space-y-3 p-4 pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[14px] font-semibold tracking-[-0.005em] text-ink">{title}</h3>
            <p className="mt-0.5 font-mono text-[11px] tabular text-ink-muted">
              {duration}m · /{slug}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Switch
              checked={active}
              onCheckedChange={(checked) => start(() => toggleActive(id, checked))}
              aria-label="Active"
              disabled={pending}
            />
          </div>
        </div>
        {description && (
          <p className="line-clamp-2 text-[12.5px] leading-relaxed text-ink-soft">
            {description}
          </p>
        )}
        <div className="flex items-center justify-between border-t border-border pt-2.5">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${active ? "bg-success" : "bg-ink-faint"}`}
            />
            {active ? "Live" : "Hidden"}
          </span>
          <div className="flex items-center gap-0.5 opacity-60 transition-opacity duration-150 group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={copy}
              title={copied ? "Copied" : "Copy link"}
              aria-label="Copy link"
            >
              {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
            </Button>
            <Button
              nativeButton={false}
              variant="ghost"
              size="icon-sm"
              title="Edit"
              aria-label="Edit"
              render={<Link href={`/event-types/${id}/edit`} />}
            >
              <Pencil size={13} />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              title="Delete"
              aria-label="Delete"
              onClick={() => {
                if (confirm("Delete this event type?")) start(() => deleteEventType(id));
              }}
              disabled={pending}
            >
              <Trash2 size={13} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
