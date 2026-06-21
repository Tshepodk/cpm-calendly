"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";

const options = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = mounted ? (theme ?? "system") : null;

  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-border bg-bg-elevated p-1">
      {options.map(({ value, label, Icon }) => {
        const active = current === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active}
            className={`inline-flex h-8 items-center gap-1.5 rounded-[5px] px-3 text-[12.5px] transition-colors duration-150 ${
              active
                ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <Icon size={14} className={active ? "text-primary" : ""} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
