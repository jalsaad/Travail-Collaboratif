import { NextResponse, type NextRequest } from "next/server";
import {
  disableNewMemberNotifications,
  verifyNewMemberUnsubscribe,
} from "@/lib/notification-unsubscribe";

// Désabonnement en un clic depuis l'interface de la messagerie (RFC 8058) :
// Gmail, Outlook… envoient un POST à l'adresse de l'en-tête List-Unsubscribe
// (cf. lib/mailer.ts::sendNewMemberNotification). Le lien signé suffit à
// autoriser l'opération, qui ne peut que couper un email pour la personne qui
// l'a reçu.
//
// POST uniquement : un GET qui désabonne serait déclenché par les antivirus de
// messagerie qui ouvrent tout seuls les liens des emails. Le lien cliqué dans
// le corps de l'email passe, lui, par une page de confirmation
// (app/(auth)/notifications/desabonnement).
export async function POST(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const membershipId = verifyNewMemberUnsubscribe(searchParams.get("m"), searchParams.get("s"));
  if (!membershipId) {
    return NextResponse.json({ error: "Lien de désabonnement invalide." }, { status: 400 });
  }

  await disableNewMemberNotifications(membershipId);
  return NextResponse.json({ ok: true });
}
