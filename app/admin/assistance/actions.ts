"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertIsSuperAdmin } from "@/lib/admin-authorization";
import { logAudit, AuditAction } from "@/lib/audit-log";

export type SupportTicketActionState = { error?: string };

async function requireSuperAdmin() {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");
  await assertIsSuperAdmin(session.userId);
  return session;
}

export async function toggleTicketStatus(
  _prevState: SupportTicketActionState | undefined,
  formData: FormData
): Promise<SupportTicketActionState> {
  const session = await requireSuperAdmin();

  const ticketId = formData.get("ticketId") as string;
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { error: "Ticket introuvable." };

  const nextStatus = ticket.status === "OPEN" ? "RESOLVED" : "OPEN";
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: nextStatus, resolvedAt: nextStatus === "RESOLVED" ? new Date() : null },
  });

  if (nextStatus === "RESOLVED") {
    await logAudit({
      schoolId: null,
      actorId: session.userId,
      action: AuditAction.RESOLVE_SUPPORT_TICKET,
      targetType: "SupportTicket",
      targetId: ticketId,
    });
  }

  revalidatePath("/admin/assistance");
  return {};
}

// Suppression réservée aux tickets déjà traités (RESOLVED) — cf. le bouton
// "Supprimer" côté client (components/support-ticket-row-actions.tsx), qui ne
// s'affiche que dans ce cas ; revérifié ici pour ne pas dépendre uniquement
// de l'UI.
export async function deleteTicket(ticketId: string) {
  const session = await requireSuperAdmin();

  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.status !== "RESOLVED") return;

  await prisma.supportTicket.delete({ where: { id: ticketId } });

  await logAudit({
    schoolId: ticket.schoolId,
    actorId: session.userId,
    action: AuditAction.DELETE_SUPPORT_TICKET,
    targetType: "SupportTicket",
    targetId: ticketId,
    metadata: { subject: ticket.subject },
  });

  revalidatePath("/admin/assistance");
}
