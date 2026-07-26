"use client";

import { useActionState } from "react";
import {
  approveSchool,
  rejectSchool,
  type SchoolApprovalState,
} from "@/app/admin/ecoles/actions";

const initialState: SchoolApprovalState = {};

export function SchoolApprovalActions({
  schoolId,
  status,
}: {
  schoolId: string;
  status: "PENDING" | "REJECTED";
}) {
  const [approveState, approveAction, approvePending] = useActionState(approveSchool, initialState);
  const [rejectState, rejectAction, rejectPending] = useActionState(rejectSchool, initialState);

  return (
    <div className="flex items-center gap-2">
      <form action={approveAction}>
        <input type="hidden" name="schoolId" value={schoolId} />
        <button type="submit" disabled={approvePending || rejectPending} className="btn-primary px-3 py-1.5 text-xs">
          {approvePending ? "..." : status === "REJECTED" ? "Ré-approuver" : "Approuver"}
        </button>
      </form>
      {/* Refuser une école déjà refusée n'a pas de sens (elle l'est déjà) —
          seule la voie inverse (ré-approuver) est utile depuis cet état. */}
      {status === "PENDING" && (
        <form action={rejectAction}>
          <input type="hidden" name="schoolId" value={schoolId} />
          <button
            type="submit"
            disabled={approvePending || rejectPending}
            className="btn-secondary px-3 py-1.5 text-xs"
          >
            {rejectPending ? "..." : "Refuser"}
          </button>
        </form>
      )}
      {approveState?.error && <p className="text-xs text-red-600">{approveState.error}</p>}
      {rejectState?.error && <p className="text-xs text-red-600">{rejectState.error}</p>}
    </div>
  );
}
