import Link from "next/link";
import { LoginEspaceCard } from "@/components/login-espace-card";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo-mode";

export default async function LoginDirectionPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  // Arrivée depuis le bouton « Démo direction » de l'accueil : les
  // identifiants du compte partagé sont pré-remplis, la direction n'a plus
  // qu'à cliquer. Ce compte ne peut rien écrire (cf. lib/demo-mode.ts), les
  // afficher est donc sans conséquence.
  const { demo } = await searchParams;
  const enDemo = demo === "1";

  return (
    <LoginEspaceCard
      title={enDemo ? "Démonstration — Espace Direction" : "Espace Direction"}
      subtitle={
        enDemo
          ? "Identifiants pré-remplis : cliquez simplement sur « Se connecter »."
          : "Super Admin, Admin — connectez-vous à votre espace."
      }
      espace="direction"
      defaultEmail={enDemo ? DEMO_EMAIL : undefined}
      defaultPassword={enDemo ? DEMO_PASSWORD : undefined}
      footer={
        enDemo ? (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-center text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
            Vous entrez dans une école fictive. Explorez librement : rien n&apos;y est enregistré.
          </div>
        ) : (
          <p className="mt-5 text-center text-sm text-stone-500">
            Votre école n&apos;est pas encore inscrite ?{" "}
            <Link href="/creer-ecole" className="font-medium text-brand-700 hover:underline">
              Créer son espace
            </Link>
          </p>
        )
      }
    />
  );
}
