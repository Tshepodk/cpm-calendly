export default function Loading() {
  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-2">
          <div className="h-3 w-32 animate-pulse rounded bg-surface-hover" />
          <div className="h-8 w-48 animate-pulse rounded-md bg-surface-hover" />
        </div>
        <div className="h-7 w-32 animate-pulse rounded-md bg-surface-hover" />
      </header>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="space-y-3 rounded-lg border border-border bg-surface p-4 pl-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                <div className="h-4 w-32 animate-pulse rounded bg-surface-hover" />
                <div className="h-3 w-20 animate-pulse rounded bg-surface-hover" />
              </div>
              <div className="h-5 w-9 animate-pulse rounded-full bg-surface-hover" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-full animate-pulse rounded bg-surface-hover" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-surface-hover" />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2.5">
              <div className="h-3 w-12 animate-pulse rounded bg-surface-hover" />
              <div className="flex gap-1">
                <div className="h-7 w-7 animate-pulse rounded-md bg-surface-hover" />
                <div className="h-7 w-7 animate-pulse rounded-md bg-surface-hover" />
                <div className="h-7 w-7 animate-pulse rounded-md bg-surface-hover" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
