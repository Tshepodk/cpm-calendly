export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { ArrowLeft, Clock, Calendar as CalIcon, Globe2 } from "lucide-react";
import { eventTypes } from "@/lib/collections";
import { BookingForm } from "@/components/public/BookingForm";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const colorMap: Record<string, string> = {
  iris: "var(--event-iris)",
  rose: "var(--event-rose)",
  amber: "var(--event-amber)",
  sage: "var(--event-sage)",
  slate: "var(--event-slate)",
};

export default async function ConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ start?: string; tz?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const startIso = sp.start;
  const tz = sp.tz ?? "UTC";
  if (!startIso) notFound();

  const evt = await (await eventTypes()).findOne({ slug, active: true });
  if (!evt) notFound();

  const dt = new Date(startIso);
  const labelDate = formatInTimeZone(dt, tz, "EEEE, MMMM d");
  const labelTime = formatInTimeZone(dt, tz, "h:mm a");
  const accent = colorMap[evt.color];

  return (
    <main className="relative mx-auto max-w-5xl px-6 pb-16 pt-6 md:pt-10 animate-fade-in">
      <div className="mb-10 flex items-center justify-between">
        <Link
          href={`/${slug}`}
          className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 -ml-1.5 text-[12px] text-ink-muted transition-colors duration-150 hover:bg-surface-hover hover:text-ink"
        >
          <ArrowLeft size={13} strokeWidth={2} />
          <span>Back to times</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-14">
        <aside className="md:col-span-5">
          <div className="md:sticky md:top-8">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: accent }}
              />
              <span>Confirming</span>
              <span className="text-ink-faint">·</span>
              <span>{evt.durationMinutes} min</span>
            </div>

            <h1 className="mt-4 text-[34px] leading-[1.1] tracking-[-0.025em] text-ink md:text-[40px]">
              {evt.title}
            </h1>

            <dl className="mt-8 divide-y divide-border border-y border-border">
              <div className="flex items-center justify-between gap-4 py-3">
                <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                  <CalIcon size={13} className="text-ink-faint" />
                  Date
                </span>
                <span className="font-mono tabular text-[13px] text-ink">{labelDate}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                  <Clock size={13} className="text-ink-faint" />
                  Time
                </span>
                <span className="font-mono tabular text-[13px] text-ink">{labelTime}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                  <Globe2 size={13} className="text-ink-faint" />
                  Timezone
                </span>
                <span className="font-mono tabular text-[13px] text-ink">{tz}</span>
              </div>
            </dl>
          </div>
        </aside>

        <section className="md:col-span-7">
          <h2 className="text-[15px] font-medium tracking-[-0.01em] text-ink">Your details</h2>
          <p className="mt-0.5 mb-5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">
            One step away
          </p>
          <BookingForm
            slug={slug}
            startUtc={startIso}
            guestTimezone={tz}
            customQuestions={evt.customQuestions}
          />
        </section>
      </div>
    </main>
  );
}
