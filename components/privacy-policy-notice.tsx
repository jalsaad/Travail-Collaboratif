"use client";

import Link from "next/link";
import { useTransition } from "react";
import { acknowledgePrivacyPolicy } from "@/app/(app)/actions";

/// Avis aux comptes qui n'ont pas pris connaissance de la version en vigueur
/// de la politique de confidentialité — inscrits avant son introduction, ou
/// avant sa dernière mise à jour (cf. mustAcknowledgePrivacyPolicy).
///
/// Informe sans bloquer : le traitement repose sur l'exécution du service
/// (art. 6.1.b), pas sur un consentement, et interdire l'accès à ses propres
/// périodes faute de clic serait disproportionné. Seul le bouton fait
/// disparaître l'avis, puisque c'est lui qui laisse la trace de l'information.
export function PrivacyPolicyNotice({ miseAJour }: { miseAJour: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4">
      <div
        role="region"
        aria-label="Politique de confidentialité"
        className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 dark:border-brand-800 dark:bg-brand-950/40"
      >
        <p className="text-sm font-medium text-brand-800 dark:text-brand-300">
          {miseAJour
            ? "Notre politique de confidentialité a été mise à jour"
            : "Notre politique de confidentialité"}
        </p>
        <p className="mt-0.5 text-sm text-brand-700/90 dark:text-brand-400">
          Elle explique quelles données nous traitons, pourquoi, et quels sont vos droits —
          notamment l&apos;usage de votre sexe, de votre date de naissance et des 4 derniers chiffres
          de votre matricule, qui composent le numéro figurant sur les relevés remis à votre
          direction.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => acknowledgePrivacyPolicy())}
            className="btn-primary px-4 py-1.5 text-sm"
          >
            {pending ? "Enregistrement..." : "J'ai pris connaissance"}
          </button>
          <Link
            href="/confidentialite"
            target="_blank"
            rel="noopener"
            className="text-sm font-medium text-brand-700 underline hover:no-underline dark:text-brand-400"
          >
            Lire la politique de confidentialité
          </Link>
        </div>
      </div>
    </div>
  );
}
