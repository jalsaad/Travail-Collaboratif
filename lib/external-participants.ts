import type { ExternalParticipantStatus } from "@prisma/client";

// Personnes présentes à une période sans relever de l'obligation de travail
// collaboratif enseignant. Le vade-mecum annexé à la circulaire 7167 demande de
// consigner « avec qui » s'est tenue l'activité : un·e éducateur·rice ou un
// intervenant extérieur y a sa place, sans compter dans le quota de qui que ce
// soit — ces personnes n'ont ni compte ni Membership, donc rien à valider.

export const EXTERNAL_PARTICIPANT_STATUSES: { value: ExternalParticipantStatus; label: string }[] = [
  { value: "EDUCATEUR", label: "Éducateur·rice" },
  { value: "DIRECTION", label: "Personnel de direction" },
  { value: "PERSONNEL_ADMINISTRATIF", label: "Personnel administratif" },
  { value: "PERSONNEL_OUVRIER", label: "Personnel ouvrier" },
  { value: "CPMS", label: "Centre PMS" },
  { value: "INTERVENANT_EXTERNE", label: "Intervenant·e externe" },
  { value: "AUTRE", label: "Autre" },
];

const LABELS = new Map(EXTERNAL_PARTICIPANT_STATUSES.map((s) => [s.value, s.label]));

export function externalParticipantStatusLabel(status: ExternalParticipantStatus): string {
  return LABELS.get(status) ?? status;
}

export function isExternalParticipantStatus(value: string): value is ExternalParticipantStatus {
  return LABELS.has(value as ExternalParticipantStatus);
}

/// Plafond volontairement bas : au-delà, on n'est plus dans le travail
/// collaboratif d'une petite équipe mais dans la réunion plénière, que la
/// circulaire ne demande pas de détailler nom par nom.
export const MAX_EXTERNAL_PARTICIPANTS = 10;

/// Rendu commun aux listes et aux relevés PDF : « Claire Vermeulen
/// (éducatrice) ». Le nom porte déjà la précision quand le statut est AUTRE.
export function formatExternalParticipant(p: {
  fullName: string;
  status: ExternalParticipantStatus;
}): string {
  return `${p.fullName} (${externalParticipantStatusLabel(p.status).toLowerCase()})`;
}

/// Les deux champs du formulaire arrivent en listes parallèles, appariées par
/// leur rang (cf. components/external-participants-field.tsx). Une ligne dont
/// le nom est vide est simplement oubliée : c'est une ligne ajoutée puis
/// abandonnée, pas une erreur de saisie à signaler.
export function zipExternalParticipants(
  names: FormDataEntryValue[],
  statuses: FormDataEntryValue[]
): { fullName: string; status: string }[] {
  return names
    .map((name, i) => ({
      fullName: String(name).trim(),
      status: String(statuses[i] ?? ""),
    }))
    .filter((p) => p.fullName !== "");
}
