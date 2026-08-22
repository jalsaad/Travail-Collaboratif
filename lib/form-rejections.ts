import type { ZodError } from "zod";
import { prisma } from "@/lib/prisma";

// Relevé des motifs pour lesquels un formulaire public est refusé.
//
// Une inscription abandonnée ne laisse aucune trace : le serveur renvoie le
// formulaire avec un message, et l'affaire s'arrête là. Le journal du serveur
// web, lui, ne voit qu'un code 200 — impossible d'y distinguer une direction
// bloquée par une validation d'une direction qui a renoncé.
//
// Ce que l'on consigne : le formulaire, le champ mis en cause, le message.
// Ce que l'on ne consigne JAMAIS : les valeurs saisies, l'email, l'adresse IP.
// « Un compte existe déjà avec cet email » dit qu'un doublon a été rencontré,
// jamais lequel.

export const FORM_CREATE_SCHOOL = "creer-ecole";
export const FORM_JOIN_SCHOOL = "rejoindre-ecole";

/// Enregistre un refus. Ne lève jamais : une écriture ratée ici ne doit pas
/// transformer un simple refus de validation en erreur serveur pour la
/// personne qui remplit le formulaire.
export async function logFormRejection(
  form: string,
  reason: string,
  field?: string | null
): Promise<void> {
  try {
    await prisma.formRejection.create({
      data: { form, reason: reason.slice(0, 300), field: field?.slice(0, 60) ?? null },
    });
  } catch (error) {
    console.error(`[refus] Enregistrement impossible pour ${form} :`, error);
  }
}

/// Variante pour un échec de validation zod : on retient la PREMIÈRE anomalie,
/// celle-là même que le formulaire affiche à la personne. Les suivantes
/// disparaissent souvent d'elles-mêmes une fois la première corrigée.
export async function logZodRejection(form: string, error: ZodError): Promise<string> {
  const issue = error.issues[0];
  const reason = issue?.message ?? "Formulaire invalide.";
  await logFormRejection(form, reason, issue?.path.join(".") || null);
  return reason;
}
