"use client";

import { useState } from "react";
import { localitiesForPostalCode, POSTAL_CODE_LIST } from "@/lib/belgian-postal-codes";

// Bloc rue / code postal / localité partagé par les trois formulaires d'école
// (création publique, paramètres direction, édition admin) — même markup et
// même comportement partout, une seule implémentation à maintenir.
//
// Le code postal est un <input list> plutôt qu'un <select> : 1145 codes dans un
// menu déroulant seraient inutilisables, et la saisie libre reste nécessaire
// pour les écoles hors territoire belge (cf. REGION_OPTIONS).
//
// Choisir un code postal connu restreint la localité aux valeurs de ce code (un
// code en dessert souvent plusieurs, ex: 1350 → Orp-Jauche, Jauche, Marilles) ;
// un code inconnu bascule la localité en saisie libre.
export function AddressFields({
  address = "",
  postalCode = "",
  locality = "",
  required = false,
}: {
  address?: string;
  postalCode?: string;
  locality?: string;
  required?: boolean;
}) {
  const [code, setCode] = useState(postalCode);
  const localities = localitiesForPostalCode(code);

  return (
    <>
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Rue et numéro
        </label>
        <input
          id="address"
          name="address"
          defaultValue={address}
          required={required}
          placeholder="ex: Rue de l'École 12"
          className="input-field mt-1.5"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="postalCode" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Code postal
          </label>
          <input
            id="postalCode"
            name="postalCode"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            list="postal-codes"
            inputMode="numeric"
            maxLength={4}
            required={required}
            placeholder="ex: 6000"
            className="input-field mt-1.5"
          />
          <datalist id="postal-codes">
            {POSTAL_CODE_LIST.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor="locality" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Localité
          </label>
          {localities.length > 0 ? (
            <select
              id="locality"
              name="locality"
              key={code}
              defaultValue={localities.includes(locality) ? locality : localities[0]}
              required={required}
              className="input-field mt-1.5"
            >
              {localities.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="locality"
              name="locality"
              defaultValue={locality}
              required={required}
              placeholder="ex: Charleroi"
              className="input-field mt-1.5"
            />
          )}
        </div>
      </div>
    </>
  );
}
