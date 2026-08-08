import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";

/// Logo cliquable ramenant à l'accueil, partagé par les écrans publics
/// (connexion, création d'école, rattachement par code) — même cible et même
/// affordance partout, une seule implémentation à maintenir.
export function LogoHomeLink({ size = 40 }: { size?: number }) {
  return (
    <Link
      href="/login"
      aria-label="Retour à l'accueil"
      className="rounded-lg transition hover:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500"
    >
      <LogoMark size={size} />
    </Link>
  );
}
