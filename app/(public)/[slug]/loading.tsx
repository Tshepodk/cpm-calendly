export default function Loading() {
  return (
    <main className="relative mx-auto max-w-5xl px-6 pb-20 pt-8 md:pt-12">
      <div className="mb-10 flex items-center justify-between">
        <div className="h-6 w-24 animate-pulse rounded-md bg-surface-hover" />
        <div className="h-8 w-8 animate-pulse rounded-md bg-surface-hover" />
      </div>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-14">
        <aside className="space-y-5 md:col-span-5">
          <div className="h-4 w-20 animate-pulse rounded-full bg-surface-hover" />
          <div className="h-9 w-3/4 animate-pulse rounded-md bg-surface-hover" />
          <div className="space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-surface-hover" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-surface-hover" />
          </div>
          <div className="mt-8 space-y-3 border-t border-border pt-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-3 w-16 animate-pulse rounded bg-surface-hover" />
                <div className="h-3 w-24 animate-pulse rounded bg-surface-hover" />
              </div>
            ))}
          </div>
        </aside>

        <section className="md:col-span-7">
          <div className="rounded-lg border border-border bg-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="h-4 w-28 animate-pulse rounded bg-surface-hover" />
              <div className="flex gap-1">
                <div className="h-7 w-7 animate-pulse rounded-md bg-surface-hover" />
                <div className="h-7 w-7 animate-pulse rounded-md bg-surface-hover" />
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square animate-pulse rounded-md bg-surface-hover"
                  style={{ animationDelay: `${i * 12}ms` }}
                />
              ))}
            </div>
          </div>
          <div className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            Loading times
          </div>
        </section>
      </div>
    </main>
  );
}
