import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink transition-colors duration-150 outline-none placeholder:text-ink-faint hover:border-border-strong focus:border-primary focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/30",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
