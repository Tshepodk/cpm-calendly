"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { EventTypeDoc, EventColor, CustomQuestion, LocationSpec } from "@/lib/types";
import { createEventType, updateEventType } from "@/server-actions/event-types";

type FormState = {
  slug: string;
  title: string;
  description: string;
  durationMinutes: number;
  color: EventColor;
  location: LocationSpec;
  rules: EventTypeDoc["rules"];
  customQuestions: CustomQuestion[];
  active: boolean;
};

const colors: EventColor[] = ["iris", "rose", "amber", "sage", "slate"];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr] md:gap-10">
      <div>
        <h2 className="text-[14px] font-medium tracking-[-0.005em] text-ink">{title}</h2>
        {description && (
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">{description}</p>
        )}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export function EventTypeForm({
  existingId,
  initial,
}: {
  existingId?: string;
  initial?: FormState;
}) {
  const [state, setState] = useState<FormState>(
    initial ?? {
      slug: "",
      title: "",
      description: "",
      durationMinutes: 30,
      color: "iris",
      location: { type: "google_meet" },
      rules: {
        bufferBeforeMin: 0,
        bufferAfterMin: 0,
        minNoticeMinutes: 240,
        maxAdvanceDays: 60,
        maxBookingsPerDay: null,
      },
      customQuestions: [],
      active: true,
    },
  );
  const [pending, start] = useTransition();

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function patchRules<K extends keyof EventTypeDoc["rules"]>(
    k: K,
    v: EventTypeDoc["rules"][K],
  ) {
    setState((s) => ({ ...s, rules: { ...s.rules, [k]: v } }));
  }

  function addQuestion() {
    setState((s) => ({
      ...s,
      customQuestions: [
        ...s.customQuestions,
        { id: crypto.randomUUID(), label: "", type: "short_text", required: false },
      ],
    }));
  }

  function removeQuestion(id: string) {
    setState((s) => ({ ...s, customQuestions: s.customQuestions.filter((q) => q.id !== id) }));
  }

  function submit() {
    const fd = new FormData();
    fd.append("payload", JSON.stringify(state));
    start(async () => {
      if (existingId) await updateEventType(existingId, fd);
      else await createEventType(fd);
    });
  }

  return (
    <form action={submit} className="space-y-12">
      <Section title="Basics" description="The headline and identity for this event type.">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={state.title}
              onChange={(e) => patch("title", e.target.value)}
              placeholder="30 min discovery"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">URL slug</Label>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[12px] text-ink-muted">/</span>
              <Input
                id="slug"
                value={state.slug}
                onChange={(e) => patch("slug", e.target.value.toLowerCase())}
                placeholder="discovery"
                className="font-mono"
              />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={3}
            value={state.description}
            onChange={(e) => patch("description", e.target.value)}
            placeholder="What guests should expect from this meeting."
          />
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Duration</Label>
            <div className="flex flex-wrap items-center gap-1.5">
              {[15, 30, 45, 60, 90].map((m) => (
                <Button
                  key={m}
                  type="button"
                  variant={state.durationMinutes === m ? "default" : "outline"}
                  size="sm"
                  onClick={() => patch("durationMinutes", m)}
                  className="font-mono tabular"
                >
                  {m}m
                </Button>
              ))}
              <Input
                type="number"
                value={state.durationMinutes}
                onChange={(e) => patch("durationMinutes", Number(e.target.value))}
                className="h-7 w-20 font-mono text-[12px]"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Accent color</Label>
            <div className="flex items-center gap-2">
              {colors.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => patch("color", c)}
                  className={`relative h-8 w-8 rounded-full transition-transform duration-150 hover:scale-110 ${
                    state.color === c ? "ring-2 ring-offset-2 ring-offset-bg ring-ink" : ""
                  }`}
                  style={{ background: `var(--color-event-${c})` }}
                  aria-label={c}
                  aria-pressed={state.color === c}
                >
                  {state.color === c && (
                    <Check
                      size={13}
                      className="absolute inset-0 m-auto text-white"
                      strokeWidth={3}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <div className="border-t border-border" />

      <Section title="Location" description="Where the meeting will take place.">
        <div className="space-y-1">
          {(
            [
              { v: "google_meet", label: "Google Meet", hint: "Auto-generated link" },
              { v: "phone", label: "Phone call", hint: "Use a phone number" },
              { v: "custom", label: "Custom", hint: "Zoom, address, or anything else" },
            ] as const
          ).map((opt) => {
            const selected = state.location.type === opt.v;
            return (
              <button
                key={opt.v}
                type="button"
                onClick={() => {
                  if (opt.v === "google_meet") patch("location", { type: "google_meet" });
                  if (opt.v === "phone") patch("location", { type: "phone", phoneNumber: "" });
                  if (opt.v === "custom") patch("location", { type: "custom", customText: "" });
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-md border px-3.5 py-2.5 text-left transition-colors duration-150 ${
                  selected
                    ? "border-primary bg-primary-tint"
                    : "border-border bg-surface hover:border-border-strong"
                }`}
                aria-pressed={selected}
              >
                <div>
                  <div className="text-[13px] font-medium text-ink">{opt.label}</div>
                  <div className="mt-0.5 text-[11.5px] text-ink-muted">{opt.hint}</div>
                </div>
                <span
                  className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    selected ? "border-primary bg-primary" : "border-border-strong bg-surface"
                  }`}
                >
                  {selected && (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
        {state.location.type === "phone" && (
          <Input
            placeholder="+1 555 0100"
            value={state.location.phoneNumber}
            onChange={(e) => patch("location", { type: "phone", phoneNumber: e.target.value })}
            className="font-mono"
          />
        )}
        {state.location.type === "custom" && (
          <Textarea
            rows={2}
            placeholder="Zoom link, address, or instructions"
            value={state.location.customText}
            onChange={(e) => patch("location", { type: "custom", customText: e.target.value })}
          />
        )}
      </Section>

      <div className="border-t border-border" />

      <Section
        title="Scheduling rules"
        description="Buffers, lead time and per-day limits."
      >
        <div className="grid gap-5 md:grid-cols-2">
          {[
            { k: "bufferBeforeMin", label: "Buffer before", suffix: "min" },
            { k: "bufferAfterMin", label: "Buffer after", suffix: "min" },
            { k: "minNoticeMinutes", label: "Min notice", suffix: "min" },
            { k: "maxAdvanceDays", label: "Max advance", suffix: "days" },
          ].map((row) => (
            <div key={row.k} className="space-y-2">
              <Label>{row.label}</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={state.rules[row.k as keyof EventTypeDoc["rules"]] as number}
                  onChange={(e) =>
                    patchRules(
                      row.k as keyof EventTypeDoc["rules"],
                      Number(e.target.value) as never,
                    )
                  }
                  className="pr-12 font-mono tabular"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center font-mono text-[11px] text-ink-muted">
                  {row.suffix}
                </span>
              </div>
            </div>
          ))}
          <div className="space-y-2 md:col-span-2">
            <Label>Max bookings per day</Label>
            <Input
              type="number"
              placeholder="Unlimited"
              value={state.rules.maxBookingsPerDay ?? ""}
              onChange={(e) =>
                patchRules(
                  "maxBookingsPerDay",
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
              className="font-mono tabular md:max-w-xs"
            />
            <p className="text-[11.5px] text-ink-muted">Leave empty for no daily limit.</p>
          </div>
        </div>
      </Section>

      <div className="border-t border-border" />

      <Section
        title="Custom questions"
        description="Ask guests for extra context when they book."
      >
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={addQuestion} className="gap-1.5">
            <Plus />
            Add question
          </Button>
        </div>
        {state.customQuestions.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-bg-elevated px-4 py-6 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">
              No questions yet
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {state.customQuestions.map((q, idx) => (
              <div key={q.id} className="space-y-3 rounded-lg border border-border bg-surface p-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <Input
                    placeholder="Label"
                    value={q.label}
                    onChange={(e) => {
                      const next = [...state.customQuestions];
                      next[idx] = { ...q, label: e.target.value } as CustomQuestion;
                      setState((s) => ({ ...s, customQuestions: next }));
                    }}
                  />
                  <select
                    value={q.type}
                    onChange={(e) => {
                      const t = e.target.value as CustomQuestion["type"];
                      const base = { id: q.id, label: q.label, required: q.required };
                      const next = [...state.customQuestions];
                      next[idx] =
                        t === "select"
                          ? { ...base, type: "select", options: ["Option 1"] }
                          : { ...base, type: t };
                      setState((s) => ({ ...s, customQuestions: next }));
                    }}
                    className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-ink outline-none transition-colors duration-150 hover:border-border-strong focus:border-primary focus:ring-2 focus:ring-ring"
                  >
                    <option value="short_text">Short text</option>
                    <option value="long_text">Long text</option>
                    <option value="select">Dropdown</option>
                  </select>
                  <label className="inline-flex items-center gap-2 text-[13px]">
                    <Switch
                      checked={q.required}
                      onCheckedChange={(checked) => {
                        const next = [...state.customQuestions];
                        next[idx] = { ...q, required: checked };
                        setState((s) => ({ ...s, customQuestions: next }));
                      }}
                    />
                    <span className="text-ink-soft">Required</span>
                  </label>
                </div>
                {q.type === "select" && (
                  <Textarea
                    rows={2}
                    placeholder="One option per line"
                    value={q.options.join("\n")}
                    onChange={(e) => {
                      const next = [...state.customQuestions];
                      next[idx] = {
                        ...q,
                        options: e.target.value
                          .split(/\n/)
                          .map((s) => s.trim())
                          .filter(Boolean),
                      };
                      setState((s) => ({ ...s, customQuestions: next }));
                    }}
                    className="font-mono text-[13px]"
                  />
                )}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuestion(q.id)}
                    className="gap-1 text-danger hover:text-danger"
                  >
                    <Trash2 />
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="border-t border-border" />

      <Section title="Status" description="Hidden event types are accessible only by direct link.">
        <label className="inline-flex items-center gap-3 text-[13px]">
          <Switch checked={state.active} onCheckedChange={(v) => patch("active", v)} />
          <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">
            {state.active ? "Active · listed publicly" : "Hidden · direct link only"}
          </span>
        </label>
      </Section>

      <div className="sticky bottom-4 z-10 flex justify-end border-t border-border bg-bg/85 -mx-2 px-2 pt-4 backdrop-blur">
        <Button type="submit" disabled={pending} className="gap-2">
          {pending ? (
            <>
              <Loader2 className="animate-spin" />
              <span>Saving…</span>
            </>
          ) : (
            <span>{existingId ? "Save changes" : "Create event type"}</span>
          )}
        </Button>
      </div>
    </form>
  );
}
