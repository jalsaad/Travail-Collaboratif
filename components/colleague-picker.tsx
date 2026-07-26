"use client";

import { useState } from "react";

type Colleague = { membershipId: string; name: string };

export function ColleaguePicker({
  colleagues,
  initialSelected = [],
}: {
  colleagues: Colleague[];
  initialSelected?: string[];
}) {
  const [selected, setSelected] = useState<string[]>(initialSelected);

  function handleChange(index: number, value: string) {
    setSelected((prev) => {
      const next = [...prev];
      if (value === "") {
        next.splice(index, 1);
      } else {
        next[index] = value;
      }
      return next;
    });
  }

  if (colleagues.length === 0) {
    return <p className="text-xs text-stone-500 dark:text-stone-400">Aucun·e autre collègue dans cette école.</p>;
  }

  const canAddMore = selected.length < colleagues.length;

  return (
    <div className="space-y-2">
      {selected.map((membershipId, index) => {
        // Une liste ne peut jamais afficher un·e intervenant·e déjà retenu
        // dans une autre ligne — seule sa propre sélection reste visible ici.
        const available = colleagues.filter(
          (c) => c.membershipId === membershipId || !selected.includes(c.membershipId)
        );
        return (
          <select
            key={index}
            name="colleagueMembershipIds"
            value={membershipId}
            onChange={(e) => handleChange(index, e.target.value)}
            className="input-field"
          >
            <option value="">— Retirer cet·te intervenant·e —</option>
            {available.map((c) => (
              <option key={c.membershipId} value={c.membershipId}>
                {c.name}
              </option>
            ))}
          </select>
        );
      })}

      {canAddMore && (
        <select
          value=""
          onChange={(e) => handleChange(selected.length, e.target.value)}
          className="input-field"
        >
          <option value="">— Ajouter un·e intervenant·e —</option>
          {colleagues
            .filter((c) => !selected.includes(c.membershipId))
            .map((c) => (
              <option key={c.membershipId} value={c.membershipId}>
                {c.name}
              </option>
            ))}
        </select>
      )}
    </div>
  );
}
