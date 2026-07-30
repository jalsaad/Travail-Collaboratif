"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveMembership } from "@/lib/active-school";
import { getBaseUrl, sendSupportTicketNotification } from "@/lib/mailer";
import { logAudit, AuditAction } from "@/lib/audit-log";

export type SupportTicketState = { error?: string; success?: string };

const schema = z.object({
  category: z.enum(["ASSISTANCE", "INCIDENT"]),
  subject: z.string().min(3, "Sujet trop court"),
  message: z.string().min(10, "Message trop court (10 caractères minimum)"),
});

export async function createSupportTicket(
  _prevState: SupportTicketState | undefined,
  formData: FormData
): Promise<SupportTicketState> {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");

  const parsed = schema.safeParse({
    category: formData.get("category"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  // L'email de contact est celui du compte connecté, jamais resaisi dans le
  // formulaire — évite qu'un ticket usurpe une autre adresse. École et rôle
  // sont déduits de la même façon, depuis la Membership active (pas un champ
  // du formulaire) — cf. lib/active-school.ts, déjà utilisé partout ailleurs
  // dans l'app pour cette notion d'"école active".
  const requester = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
  const active = await resolveActiveMembership(requester.id);

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: requester.id,
      schoolId: active?.schoolId,
      role: active?.role,
      category: parsed.data.category,
      subject: parsed.data.subject,
      message: parsed.data.message,
    },
  });

  await logAudit({
    schoolId: null,
    actorId: requester.id,
    action: AuditAction.CREATE_SUPPORT_TICKET,
    targetType: "SupportTicket",
    targetId: ticket.id,
  });

  const admins = await prisma.user.findMany({ where: { isSuperAdmin: true }, select: { email: true } });
  const baseUrl = await getBaseUrl();
  await sendSupportTicketNotification({
    to: admins.map((a) => a.email),
    category: parsed.data.category,
    subject: parsed.data.subject,
    message: parsed.data.message,
    requesterName: `${requester.firstName} ${requester.lastName}`,
    requesterEmail: requester.email,
    adminUrl: `${baseUrl}/admin/assistance`,
  });

  return { success: "Votre message a été transmis. Nous reviendrons vers vous par email." };
}
