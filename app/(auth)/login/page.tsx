import { Suspense } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in · Kalendly" };

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm animate-fade-up">
      <div className="mb-10 flex flex-col items-center gap-3">
        <Wordmark size={22} className="text-ink" />
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          Admin sign-in
        </p>
      </div>
      <div className="rounded-xl border border-border bg-surface p-7 shadow-[0_1px_2px_rgba(15,15,20,0.04)]">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
      <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">
        Authorized access only
      </p>
    </div>
  );
}
