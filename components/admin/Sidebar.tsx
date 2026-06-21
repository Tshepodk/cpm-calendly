"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Wordmark } from "@/components/brand/Wordmark";
import {
  LayoutDashboard,
  Calendar,
  Clock,
  ListChecks,
  Settings,
  LogOut,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/event-types", label: "Event types", icon: ListChecks },
  { href: "/availability", label: "Availability", icon: Clock },
  { href: "/bookings", label: "Bookings", icon: Calendar },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ name }: { name: string }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen border-r border-border bg-bg md:flex md:w-60 md:flex-col">
      <div className="border-b border-border px-5 py-6">
        <Link
          href="/dashboard"
          aria-label="Kalendly home"
          className="inline-flex items-center text-ink"
        >
          <Wordmark size={24} />
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {items.map((it) => {
          const Icon = it.icon;
          const active = pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`group relative flex h-9 items-center gap-3 rounded-md px-3 text-[14px] transition-colors duration-150 ${
                active
                  ? "bg-surface-hover font-medium text-ink"
                  : "text-ink-soft hover:bg-surface-hover hover:text-ink"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <Icon
                size={16}
                className={active ? "text-primary" : "text-ink-muted group-hover:text-ink-soft"}
              />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-3">
        <div className="min-w-0 flex-1 truncate font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
          {name}
        </div>
        <div className="flex items-center gap-0.5">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            aria-label="Sign out"
            title="Sign out"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-surface-hover hover:text-ink"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
