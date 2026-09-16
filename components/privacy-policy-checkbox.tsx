import Link from "next/link";
import { PRIVACY_FIELD } from "@/lib/privacy-policy";

/// Prise de connaissance de la politique de confidentialité, placée en tête
/// de chaque formulaire d'inscription : avant la moindre donnée saisie, pas
/// au moment d'envoyer. `required` bloque côté navigateur ; la vérification
/// qui fait foi est côté serveur (cf. hasAcceptedPrivacyPolicy).
///
/// Le lien s'ouvre dans un nouvel onglet pour ne pas faire perdre ce qui a
/// déjà été saisi.
export function PrivacyPolicyCheckbox() {
  return (
    <label className="flex items-start gap-2.5 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700 dark:border-stone-800 dark:bg-stone-950/40 dark:text-stone-300">
      <input
        type="checkbox"
        name={PRIVACY_FIELD}
        required
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 dark:border-stone-700"
      />
      <span>
        J&apos;ai pris connaissance de la{" "}
        <Link
          href="/confidentialite"
          target="_blank"
          rel="noopener"
          className="font-medium text-brand-700 underline hover:no-underline dark:text-brand-400"
        >
          politique de confidentialité
        </Link>
        , notamment de l&apos;usage fait de mon sexe, de ma date de naissance et des 4 derniers
        chiffres de mon matricule.
      </span>
    </label>
  );
}
