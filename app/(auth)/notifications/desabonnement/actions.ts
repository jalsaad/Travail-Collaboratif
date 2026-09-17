"use server";

import { redirect } from "next/navigation";
import {
  disableNewMemberNotifications,
  verifyNewMemberUnsubscribe,
} from "@/lib/notification-unsubscribe";

/// Confirmation depuis la page ouverte par le lien de l'email. La signature
/// est revérifiée ici : les champs cachés du formulaire sont modifiables par
/// quiconque l'envoie.
export async function confirmUnsubscribe(formData: FormData): Promise<void> {
  const m = formData.get("m");
  const s = formData.get("s");
  const membershipId = verifyNewMemberUnsubscribe(
    typeof m === "string" ? m : null,
    typeof s === "string" ? s : null
  );
  if (!membershipId) redirect("/notifications/desabonnement");

  await disableNewMemberNotifications(membershipId);
  // Retour sur la même page, qui lit l'état réel en base et affiche la
  // confirmation — un rechargement ne renvoie donc pas le formulaire.
  redirect(`/notifications/desabonnement?${new URLSearchParams({ m: membershipId, s: String(s) })}`);
}
