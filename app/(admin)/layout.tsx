import { requireAdmin } from "@/lib/auth-helpers";
import { Sidebar } from "@/components/admin/Sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return (
    <div className="flex min-h-screen bg-bg text-ink">
      <Sidebar name={session.user.name} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-5xl px-6 py-8 md:px-10 md:py-10 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
