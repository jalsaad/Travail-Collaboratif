"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/ecole", label: "Tableau de bord" },
  { href: "/ecole/membres", label: "Membres" },
  { href: "/ecole/statistiques", label: "Statistiques" },
  { href: "/ecole/parametres", label: "Paramètres" },
  { href: "/ecole/audit", label: "Journal" },
];

export function EcoleTabs() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex flex-wrap gap-1 rounded-xl bg-brand-600 p-1.5 text-sm shadow-sm shadow-brand-600/20">
      {tabs.map((tab) => {
        const isActive = tab.href === "/ecole" ? pathname === "/ecole" : pathname?.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-lg px-3.5 py-1.5 font-medium transition ${
              isActive ? "bg-white text-brand-700 shadow-sm" : "text-white/90 hover:bg-white/10 hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
