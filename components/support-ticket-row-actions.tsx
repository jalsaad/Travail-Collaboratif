"use client";

import { useActionState, useTransition } from "react";
import { toggleTicketStatus, deleteTicket, type SupportTicketActionState } from "@/app/admin/assistance/actions";

const initialState: SupportTicketActionState = {};

export function SupportTicketRowActions({
  ticketId,
  status,
}: {
  ticketId: string;
  status: "OPEN" | "RESOLVED";
}) {
  const [state, formAction, pending] = useActionState(toggleTicketStatus, initialState);
  const [deletePending, startDeleteTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm("Supprimer définitivement ce ticket ? Cette action est irréversible.")) {
      return;
    }
    startDeleteTransition(() => {
      deleteTicket(ticketId);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <form action={formAction}>
        <input type="hidden" name="ticketId" value={ticketId} />
        <button
          type="submit"
          disabled={pending || deletePending}
          className={status === "OPEN" ? "btn-primary px-3 py-1.5 text-xs" : "btn-secondary px-3 py-1.5 text-xs"}
        >
          {pending ? "..." : status === "OPEN" ? "Marquer résolu" : "Rouvrir"}
        </button>
      </form>
      {/* Suppression réservée aux tickets déjà traités (résolus) — un ticket
          ouvert n'a pas encore été pris en charge, il ne doit pas pouvoir
          disparaître silencieusement. */}
      {status === "RESOLVED" && (
        <button
          type="button"
          disabled={deletePending}
          onClick={handleDelete}
          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
        >
          {deletePending ? "..." : "Supprimer"}
        </button>
      )}
      {state?.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
    </div>
  );
}
