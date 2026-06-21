export default function Loading() {
  return (
    <div className="space-y-7">
      <header className="space-y-2 border-b border-border pb-6">
        <div className="h-3 w-20 animate-pulse rounded bg-surface-hover" />
        <div className="h-8 w-36 animate-pulse rounded-md bg-surface-hover" />
      </header>
      <div className="h-9 w-72 animate-pulse rounded-md bg-surface-hover" />
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 animate-pulse rounded-md bg-surface-hover" />
              <div className="space-y-1.5">
                <div className="h-3 w-32 animate-pulse rounded bg-surface-hover" />
                <div className="h-2.5 w-40 animate-pulse rounded bg-surface-hover" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="space-y-1.5 text-right">
                <div className="h-3 w-16 animate-pulse rounded bg-surface-hover" />
                <div className="h-2.5 w-10 animate-pulse rounded bg-surface-hover" />
              </div>
              <div className="h-5 w-20 animate-pulse rounded-full bg-surface-hover" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
