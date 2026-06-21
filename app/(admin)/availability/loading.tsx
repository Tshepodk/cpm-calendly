export default function Loading() {
  return (
    <div className="space-y-8">
      <header className="space-y-2 border-b border-border pb-6">
        <div className="h-3 w-28 animate-pulse rounded bg-surface-hover" />
        <div className="h-8 w-44 animate-pulse rounded-md bg-surface-hover" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-surface-hover" />
      </header>
      <section className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr] md:gap-10">
        <div className="space-y-2">
          <div className="h-4 w-20 animate-pulse rounded bg-surface-hover" />
          <div className="h-3 w-32 animate-pulse rounded bg-surface-hover" />
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-border p-4 last:border-b-0"
            >
              <div className="h-5 w-9 animate-pulse rounded-full bg-surface-hover" />
              <div className="h-3 w-12 animate-pulse rounded bg-surface-hover" />
              <div className="ml-auto flex gap-2">
                <div className="h-9 w-24 animate-pulse rounded-md bg-surface-hover" />
                <div className="h-9 w-24 animate-pulse rounded-md bg-surface-hover" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
