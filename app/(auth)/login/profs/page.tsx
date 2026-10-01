import Link from "next/link";
import { LoginEspaceCard } from "@/components/login-espace-card";
import { DEMO_PASSWORD, DEMO_TEACHER_EMAIL } from "@/lib/demo-mode";

export default async function LoginProfsPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  // Arrivée depuis le bouton « Démo enseignant·e » de l'accueil : les
  // identifiants du compte partagé sont pré-remplis, il n'y a plus qu'à
  // cliquer. Ce compte ne peut rien écrire (cf. lib/demo-mode.ts), les
  // afficher est donc sans conséquence — même parti pris que pour la
  // démonstration direction.
  const { demo } = await searchParams;
  const enDemo = demo === "1";

  return (
    <LoginEspaceCard
      title={enDemo ? "Démonstration — Espace Profs" : "Espace Profs"}
      subtitle={
        enDemo
          ? "Identifiants pré-remplis : cliquez simplement sur « Se connecter »."
          : "Enseignant·es — connectez-vous à votre espace."
      }
      espace="profs"
      defaultEmail={enDemo ? DEMO_TEACHER_EMAIL : undefined}
      defaultPassword={enDemo ? DEMO_PASSWORD : undefined}
      footer={
        enDemo ? (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-center text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
            Vous entrez dans le compte d&apos;une enseignante fictive. Explorez librement : rien
            n&apos;y est enregistré.
          </div>
        ) : (
          <p className="mt-5 text-center text-sm text-stone-500">
            Pas encore de compte ?{" "}
            <Link href="/rejoindre" className="font-medium text-brand-700 hover:underline">
              Rejoindre votre école avec un code
            </Link>
          </p>
        )
      }
    />
  );
}
