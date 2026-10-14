import { dismissPeriodInvitation } from "@/app/(app)/mes-periodes/actions";

/// Collègues nommés à la déclaration alors qu'ils n'avaient pas de compte, et
/// dont l'invitation est restée ouverte : leur participation n'existe pas
/// encore (cf. lib/peer-referral-reconcile.ts).
///
/// Rendre cette attente visible est tout l'enjeu. Jusqu'ici la période
/// s'affichait « validée » et son auteur n'avait aucun moyen de savoir que la
/// collègue qu'il avait pourtant nommée n'y figurait pas — ni elle, de savoir
/// qu'on l'attendait.
export type InvitationEnAttente = {
  id: string;
  invitedName: string | null;
  invitedEmail: string | null;
  expiresAt: Date;
};

/// Une invitation PÉRIMÉE ne retient plus rien : son lien ne fonctionne plus,
/// la plateforme n'attend plus personne par ce chemin. Elle reste affichée —
/// l'auteur·rice doit savoir que quelqu'un n'est jamais venu — mais elle ne
/// doit pas retenir le statut de la période, sans quoi une période dont tous
/// les participants ont confirmé resterait « en attente » pour toujours.
export function invitationsBloquantes(invitations: InvitationEnAttente[]): number {
  const maintenant = Date.now();
  return invitations.filter((i) => i.expiresAt.getTime() >= maintenant).length;
}

export function PendingInviteChips({
  invitations,
  /// Réservé à l'auteur·rice de la période : elle seule sait si la personne
  /// attendue est arrivée autrement, ou ne viendra plus.
  dismissible = false,
}: {
  invitations: InvitationEnAttente[];
  dismissible?: boolean;
}) {
  if (invitations.length === 0) return null;

  const maintenant = Date.now();

  return (
    <ul className="mt-1.5 flex flex-wrap gap-1.5">
      {invitations.map((invitation) => {
        const expiree = invitation.expiresAt.getTime() < maintenant;
        return (
          <li
            key={invitation.id}
            className="flex items-center gap-1.5 rounded-full border border-dashed border-amber-400 bg-amber-50 px-2.5 py-1 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
          >
            <span>
              {/* Le nom n'est qu'un mémo facultatif : l'adresse prend le relais
                  quand il manque, et à défaut une mention neutre — jamais une
                  puce vide, qui ne dirait pas qui l'on attend. */}
              {invitation.invitedName ?? invitation.invitedEmail ?? "Collègue invité·e"} —{" "}
              {expiree ? "invitation expirée" : "invitation envoyée, compte pas encore créé"}
            </span>

            {/* Seule issue pour les invitations émises avant que la plateforme
                ne conserve l'adresse de destination : rien ne permet de les
                rapprocher de la personne qui a fini par s'inscrire, et elles
                resteraient donc affichées indéfiniment (cf. la migration
                20261013090000). Un <form> plutôt qu'un bouton client : cette
                carte est rendue côté serveur, autant y rester. */}
            {dismissible && (
              <form action={dismissPeriodInvitation}>
                <input type="hidden" name="referralId" value={invitation.id} />
                <button
                  type="submit"
                  title="Retirer cette invitation — le lien envoyé cessera de fonctionner."
                  aria-label={`Retirer l'invitation de ${invitation.invitedName ?? invitation.invitedEmail ?? "ce·tte collègue"}`}
                  className="rounded-full px-1 font-semibold leading-none text-amber-700 transition hover:bg-amber-200 hover:text-amber-900 dark:text-amber-400 dark:hover:bg-amber-900 dark:hover:text-amber-100"
                >
                  ×
                </button>
              </form>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/// Même information, sans les identités : pour les écrans de supervision
/// (direction, plateforme), qui ont besoin de savoir qu'une période attend
/// encore quelqu'un, pas de connaître l'adresse d'une personne qui n'a pas
/// de compte sur la plateforme.
export function PendingInviteSummary({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400">
      {count === 1
        ? "1 collègue invité·e dont le compte n'est pas encore créé"
        : `${count} collègues invité·es dont le compte n'est pas encore créé`}
    </p>
  );
}
