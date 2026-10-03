"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertIsSuperAdmin } from "@/lib/admin-authorization";

export type SuiviRefusState = { error?: string; success?: string };

/// Marque une tentative d'inscription comme recontactée, avec une note
/// facultative — « rappelée, elle réessaie demain », « adresse invalide ».
///
/// Pas de journal d'audit ici : c'est une annotation de travail sur une
/// tentative échouée, pas une action sur les données d'une école ou d'un
/// compte. Recliquer sur une ligne déjà traitée la rouvre, pour corriger une
/// erreur de manipulation.
export async function marquerRefusContacte(
  rejectionId: string,
  _prevState: SuiviRefusState | undefined,
  formData: FormData
): Promise<SuiviRefusState> {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");
  await assertIsSuperAdmin(session.userId);

  const refus = await prisma.formRejection.findUnique({
    where: { id: rejectionId },
    select: { contactedAt: true },
  });
  if (!refus) return { error: "Cette tentative n'existe plus." };

  const note = String(formData.get("notes") ?? "").trim();
  const rouvrir = refus.contactedAt !== null && note === "";

  await prisma.formRejection.update({
    where: { id: rejectionId },
    data: {
      contactedAt: rouvrir ? null : new Date(),
      notes: note ? note.slice(0, 500) : rouvrir ? null : undefined,
    },
  });

  revalidatePath("/admin");
  return { success: rouvrir ? "Tentative rouverte." : "Tentative marquée comme traitée." };
}
