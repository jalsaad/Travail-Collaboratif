import type { ZodError } from "zod";
import { prisma } from "@/lib/prisma";

// Relevé des formulaires publics refusés, et de qui n'a pas pu aller au bout.
//
// Une inscription abandonnée ne laisse aucune trace ailleurs : le serveur
// renvoie le formulaire avec un message, et l'affaire s'arrête là. Le journal
// du serveur web, lui, ne voit qu'un code 200 — impossible d'y distinguer une
// direction bloquée par une validation d'une direction qui a renoncé.
//
// CE QUI A CHANGÉ : on consignait d'abord le seul motif, sans rien de
// nominatif. Un refus restait alors une statistique, impossible à rattraper —
// la personne, elle, était partie. On conserve désormais ce que le formulaire
// portait déjà pour permettre de la rappeler : son email, son nom, le nom de
// son école. Jamais le mot de passe, jamais le matricule, jamais l'adresse IP.
//
// RGPD : finalité d'assistance, intérêt légitime (art. 6.1.f) — aider qui a
// tenté de s'inscrire et n'y est pas arrivé. La politique de confidentialité
// l'annonce, et ces lignes s'effacent d'elles-mêmes au bout de six mois (cf.
// RETENTION_JOURS) : passé ce délai, rappeler quelqu'un n'a plus de sens, et
// garder son adresse non plus.

export const FORM_CREATE_SCHOOL = "creer-ecole";
export const FORM_JOIN_SCHOOL = "rejoindre-ecole";

/// Six mois : au-delà, une tentative d'inscription est de l'histoire ancienne.
export const RETENTION_JOURS = 180;

/// Coordonnées lisibles dans le formulaire au moment du refus. Toutes
/// facultatives : un refus peut survenir avant que ces champs ne soient
/// remplis, et mieux vaut une ligne incomplète que pas de ligne du tout.
export type ContactRefus = {
  email?: string | null;
  fullName?: string | null;
  schoolName?: string | null;
};

function texte(valeur: unknown, max: number): string | null {
  if (typeof valeur !== "string") return null;
  const propre = valeur.trim();
  return propre ? propre.slice(0, max) : null;
}

/// Lit les coordonnées directement dans le FormData soumis — les appelants
/// n'ont ainsi rien à extraire ni à tenir à jour de leur côté. Les noms de
/// champs sont ceux des formulaires d'inscription (cf.
/// components/create-school-form.tsx et components/join-school-form.tsx).
export function contactDepuisFormData(formData: FormData): ContactRefus {
  const prenom = texte(formData.get("firstName"), 80);
  const nom = texte(formData.get("lastName"), 80);
  return {
    email: texte(formData.get("email"), 160)?.toLowerCase() ?? null,
    fullName: [prenom, nom].filter(Boolean).join(" ") || null,
    schoolName: texte(formData.get("name"), 160),
  };
}

/// Supprime les refus trop anciens. Lancé à l'occasion d'un nouveau refus
/// plutôt que par une tâche planifiée : ces écritures sont rares (quelques
/// unités par semaine), et une purge adossée à l'événement ne peut pas être
/// oubliée au prochain déménagement de serveur.
async function purgerAnciens(): Promise<void> {
  const limite = new Date(Date.now() - RETENTION_JOURS * 24 * 60 * 60 * 1000);
  await prisma.formRejection.deleteMany({ where: { createdAt: { lt: limite } } });
}

/// Enregistre un refus. Ne lève jamais : une écriture ratée ici ne doit pas
/// transformer un simple refus de validation en erreur serveur pour la
/// personne qui remplit le formulaire.
export async function logFormRejection(
  form: string,
  reason: string,
  field?: string | null,
  contact?: ContactRefus
): Promise<void> {
  try {
    await prisma.formRejection.create({
      data: {
        form,
        reason: reason.slice(0, 300),
        field: field?.slice(0, 60) ?? null,
        email: contact?.email ?? null,
        fullName: contact?.fullName ?? null,
        schoolName: contact?.schoolName ?? null,
      },
    });
    await purgerAnciens();
  } catch (error) {
    console.error(`[refus] Enregistrement impossible pour ${form} :`, error);
  }
}

/// Variante pour un échec de validation zod : on retient la PREMIÈRE anomalie,
/// celle-là même que le formulaire affiche à la personne. Les suivantes
/// disparaissent souvent d'elles-mêmes une fois la première corrigée.
export async function logZodRejection(
  form: string,
  error: ZodError,
  contact?: ContactRefus
): Promise<string> {
  const issue = error.issues[0];
  const reason = issue?.message ?? "Formulaire invalide.";
  await logFormRejection(form, reason, issue?.path.join(".") || null, contact);
  return reason;
}
