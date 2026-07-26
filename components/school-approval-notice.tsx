import type { SchoolStatus } from "@prisma/client";

export function SchoolApprovalNotice({
  status,
  schoolName,
}: {
  status: SchoolStatus;
  schoolName: string;
}) {
  if (status === "REJECTED") {
    return (
      <div className="card space-y-2 border-red-200 bg-red-50/50 p-6 text-sm text-red-800">
        <p className="font-medium">Demande de création refusée</p>
        <p>
          La création de l&apos;espace <strong>{schoolName}</strong> n&apos;a pas été validée par la
          plateforme. Contactez le support si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.
        </p>
      </div>
    );
  }

  return (
    <div className="card space-y-2 border-amber-200 bg-amber-50/50 p-6 text-sm text-amber-800">
      <p className="font-medium">En attente de validation</p>
      <p>
        L&apos;espace <strong>{schoolName}</strong> a été créé et attend la validation de la
        plateforme avant de devenir accessible à vos collègues. Vous serez notifié·e dès que
        l&apos;approbation aura lieu.
      </p>
    </div>
  );
}
