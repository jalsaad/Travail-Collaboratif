"use client";

import { useState } from "react";
import { formatPeriodes, periodesBetween } from "@/lib/period-duration";

// Date + plage horaire d'une période, partagé par les trois formulaires
// (déclaration prof, modification prof, modification admin). La durée en
// périodes n'est pas un champ : elle est calculée à la volée ici pour que la
// personne voie ce qui sera comptabilisé, puis recalculée côté serveur à
// partir des mêmes heures (cf. app/(app)/declarer/schema.ts).
export function PeriodScheduleFields({
  defaultDate = "",
  defaultHeureDebut = "",
  defaultHeureFin = "",
}: {
  defaultDate?: string;
  defaultHeureDebut?: string;
  defaultHeureFin?: string;
}) {
  const [heureDebut, setHeureDebut] = useState(defaultHeureDebut);
  const [heureFin, setHeureFin] = useState(defaultHeureFin);

  const periodes = periodesBetween(heureDebut, heureFin);
  const bothFilled = heureDebut !== "" && heureFin !== "";

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="date" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Date
          </label>
          <input
            id="date"
            type="date"
            name="date"
            required
            defaultValue={defaultDate}
            className="input-field mt-1.5"
          />
        </div>
        <div>
          <label htmlFor="heureDebut" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            De
          </label>
          <input
            id="heureDebut"
            type="time"
            name="heureDebut"
            required
            value={heureDebut}
            onChange={(e) => setHeureDebut(e.target.value)}
            className="input-field mt-1.5"
          />
        </div>
        <div>
          <label htmlFor="heureFin" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            À
          </label>
          <input
            id="heureFin"
            type="time"
            name="heureFin"
            required
            value={heureFin}
            onChange={(e) => setHeureFin(e.target.value)}
            className="input-field mt-1.5"
          />
        </div>
      </div>

      {bothFilled && periodes === null ? (
        <p className="text-xs text-red-600">
          L&apos;heure de fin doit être postérieure à l&apos;heure de début.
        </p>
      ) : (
        <p className="text-xs text-stone-500 dark:text-stone-400">
          {periodes === null
            ? "La durée en périodes est calculée à partir des horaires (1 période = 50 minutes)."
            : `Soit ${formatPeriodes(periodes)} période(s) comptabilisée(s).`}
        </p>
      )}
    </div>
  );
}
