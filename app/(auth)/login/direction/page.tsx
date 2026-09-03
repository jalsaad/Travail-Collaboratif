import Link from "next/link";
import { LoginEspaceCard } from "@/components/login-espace-card";

export default function LoginDirectionPage() {
  return (
    <LoginEspaceCard
      title="Espace Direction"
      subtitle="Super Admin, Admin — connectez-vous à votre espace."
      espace="direction"
      footer={
        <>
          <p className="mt-5 text-center text-sm text-stone-500">
            Votre école n&apos;est pas encore inscrite ?{" "}
            <Link href="/creer-ecole" className="font-medium text-brand-700 hover:underline">
              Créer son espace
            </Link>
          </p>
          {/* Voir avant de s'engager : l'espace de démonstration se visite
              avec un compte partagé, sur une école fictive où rien n'est
              enregistré (cf. lib/demo-mode.ts). */}
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-center text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
            <p className="font-semibold">Découvrir sans s&apos;inscrire</p>
            <p className="mt-1 text-amber-800 dark:text-amber-300/90">
              Connectez-vous avec <span className="font-mono">demo@travail-collaboratif.be</span> /{" "}
              <span className="font-mono">demo2026</span> pour visiter un espace direction fictif.
              Rien n&apos;y est enregistré.
            </p>
          </div>
        </>
      }
    />
  );
}
