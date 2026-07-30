import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/role-labels";
import { SupportTicketRowActions } from "@/components/support-ticket-row-actions";
import { SupportTicketSubject } from "@/components/support-ticket-subject";
import { Reveal } from "@/components/reveal";

const categoryLabel: Record<string, string> = {
  ASSISTANCE: "Assistance",
  INCIDENT: "Incident",
};

const categoryBadge: Record<string, string> = {
  ASSISTANCE: "bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300",
  INCIDENT: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

const statusLabel: Record<string, string> = {
  OPEN: "Ouvert",
  RESOLVED: "Résolu",
};

const statusBadge: Record<string, string> = {
  OPEN: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  RESOLVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

export default async function AdminAssistancePage() {
  const tickets = await prisma.supportTicket.findMany({
    include: { user: true, school: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">Assistance</h1>

      <Reveal className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50/70 text-left text-xs font-semibold uppercase tracking-wide text-stone-400 dark:border-stone-800 dark:bg-stone-800/50 dark:text-stone-500">
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Sujet</th>
              <th className="px-5 py-3">Demandeur</th>
              <th className="px-5 py-3">École</th>
              <th className="px-5 py-3">Rôle</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Statut</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-stone-400 dark:text-stone-500">
                  Aucun ticket pour le moment.
                </td>
              </tr>
            )}
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="border-b border-stone-50 last:border-0 dark:border-stone-800">
                <td className="px-5 py-3.5">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${categoryBadge[ticket.category]}`}>
                    {categoryLabel[ticket.category]}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <SupportTicketSubject subject={ticket.subject} message={ticket.message} />
                </td>
                <td className="px-5 py-3.5 text-xs text-stone-500 dark:text-stone-400">
                  {ticket.user.firstName} {ticket.user.lastName}
                  <p className="text-stone-400 dark:text-stone-500">{ticket.user.email}</p>
                </td>
                <td className="px-5 py-3.5 text-xs text-stone-500 dark:text-stone-400">
                  {ticket.school?.name ?? "—"}
                </td>
                <td className="px-5 py-3.5 text-xs text-stone-500 dark:text-stone-400">
                  {ticket.role ? roleLabel[ticket.role] : "—"}
                </td>
                <td className="px-5 py-3.5 text-xs text-stone-500 dark:text-stone-400">
                  {ticket.createdAt.toLocaleDateString("fr-BE", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-5 py-3.5">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge[ticket.status]}`}>
                    {statusLabel[ticket.status]}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <SupportTicketRowActions ticketId={ticket.id} status={ticket.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Reveal>
    </div>
  );
}
