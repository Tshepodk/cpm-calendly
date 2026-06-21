"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const next = () => {
    const current = theme ?? "system";
    setTheme(current === "light" ? "dark" : current === "dark" ? "system" : "light");
  };

  const Icon = !mounted
    ? Monitor
    : theme === "light"
      ? Sun
      : theme === "dark"
        ? Moon
        : Monitor;

  return (
    <button
      type="button"
      onClick={next}
      title={mounted ? `Theme: ${theme}` : "Theme"}
      aria-label="Toggle theme"
      className={
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-surface-hover hover:text-ink " +
        (className ?? "")
      }
    >
      <Icon size={15} />
    </button>
  );
}
