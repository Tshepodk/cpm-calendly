export default function Loading() {
  return (
    <div className="space-y-10">
      <header className="space-y-2 border-b border-border pb-6">
        <div className="h-3 w-20 animate-pulse rounded bg-surface-hover" />
        <div className="h-8 w-32 animate-pulse rounded-md bg-surface-hover" />
      </header>
      {[0, 1, 2, 3].map((i) => (
        <section
          key={i}
          className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr] md:gap-10"
        >
          <div className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-surface-hover" />
            <div className="h-3 w-32 animate-pulse rounded bg-surface-hover" />
          </div>
          <div className="space-y-3">
            <div className="h-9 w-full max-w-sm animate-pulse rounded-md bg-surface-hover" />
            <div className="h-16 w-full max-w-sm animate-pulse rounded-md bg-surface-hover" />
            <div className="h-8 w-24 animate-pulse rounded-md bg-surface-hover" />
          </div>
        </section>
      ))}
    </div>
  );
}
