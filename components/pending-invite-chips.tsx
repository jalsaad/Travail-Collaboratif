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

export function PendingInviteChips({ invitations }: { invitations: InvitationEnAttente[] }) {
  if (invitations.length === 0) return null;

  const maintenant = Date.now();

  return (
    <ul className="mt-1.5 flex flex-wrap gap-1.5">
      {invitations.map((invitation) => {
        const expiree = invitation.expiresAt.getTime() < maintenant;
        return (
          <li
            key={invitation.id}
            className="rounded-full border border-dashed border-amber-400 bg-amber-50 px-2.5 py-1 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
          >
            {/* Le nom n'est qu'un mémo facultatif : l'adresse prend le relais
                quand il manque, et à défaut une mention neutre — jamais une
                puce vide, qui ne dirait pas qui l'on attend. */}
            {invitation.invitedName ?? invitation.invitedEmail ?? "Collègue invité·e"} —{" "}
            {expiree ? "invitation expirée" : "invitation envoyée, compte pas encore créé"}
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
