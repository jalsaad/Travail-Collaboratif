import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { assertIsSuperAdmin } from "@/lib/admin-authorization";
import { ForbiddenError } from "@/lib/school-authorization";
import { LogoMark } from "@/components/logo-mark";

const tabs = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/ecoles", label: "Écoles" },
  { href: "/admin/utilisateurs", label: "Utilisateurs" },
  { href: "/admin/annonces", label: "Annonces" },
  { href: "/admin/dons", label: "Dons" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  try {
    // Re-vérification fraîche en DB, jamais session.isSuperAdmin (snapshot JWT).
    await assertIsSuperAdmin(session.userId);
  } catch (error) {
    if (error instanceof ForbiddenError) redirect("/mes-periodes");
    throw error;
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <header className="sticky top-0 z-10 border-b border-stone-200/80 bg-white/80 backdrop-blur-sm dark:border-stone-800 dark:bg-stone-950/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <LogoMark size={26} />
              <span className="font-semibold tracking-tight text-stone-900 dark:text-stone-100">Administration plateforme</span>
            </div>
            <nav className="flex items-center gap-1 text-sm">
              {tabs.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className="rounded-full px-3 py-1.5 text-stone-600 transition hover:bg-stone-100 hover:text-brand-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-brand-500"
                >
                  {tab.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-stone-600 dark:text-stone-400">
            <Link href="/mes-periodes" className="rounded-full px-3 py-1.5 transition hover:bg-stone-100 hover:text-brand-700 dark:hover:bg-stone-800 dark:hover:text-brand-500">
              Mon espace
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="rounded-full px-3 py-1.5 text-stone-500 transition hover:bg-red-50 hover:text-red-700 dark:text-stone-400 dark:hover:bg-red-950 dark:hover:text-red-400"
              >
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
