export default function Loading() {
  return (
    <div className="space-y-10">
      <header className="space-y-2 border-b border-border pb-6">
        <div className="h-3 w-20 animate-pulse rounded bg-surface-hover" />
        <div className="h-8 w-44 animate-pulse rounded-md bg-surface-hover" />
      </header>
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-surface p-4"
          >
            <div className="h-3 w-24 animate-pulse rounded bg-surface-hover" />
            <div className="mt-3 h-8 w-16 animate-pulse rounded bg-surface-hover" />
            <div className="mt-2 h-3 w-28 animate-pulse rounded bg-surface-hover" />
          </div>
        ))}
      </section>
      <section>
        <div className="mb-3 h-4 w-28 animate-pulse rounded bg-surface-hover" />
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-b-0"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 animate-pulse rounded-md bg-surface-hover" />
                <div className="space-y-1.5">
                  <div className="h-3 w-32 animate-pulse rounded bg-surface-hover" />
                  <div className="h-2.5 w-20 animate-pulse rounded bg-surface-hover" />
                </div>
              </div>
              <div className="space-y-1.5 text-right">
                <div className="h-3 w-16 animate-pulse rounded bg-surface-hover" />
                <div className="h-2.5 w-10 animate-pulse rounded bg-surface-hover" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
