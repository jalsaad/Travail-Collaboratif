#!/usr/bin/env python3
"""Génère lib/belgian-postal-codes.ts à partir de data/codes-postaux-belges.csv.

Le CSV est la source de vérité (une ligne « code,localité », doublons tolérés) ;
ce script le regroupe par code postal et écrit le module TypeScript consommé par
les formulaires d'adresse. À relancer après toute modification du CSV :

    python3 scripts/generate-postal-codes.py
"""

import collections
import csv
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "data" / "codes-postaux-belges.csv"
TS_PATH = ROOT / "lib" / "belgian-postal-codes.ts"

HEADER = '''// Codes postaux et localités de Belgique — source : data/codes-postaux-belges.csv
// (transcription de l'export fourni par l'utilisateur). Un code postal couvre
// souvent plusieurs localités (ex: 1350 → Orp-Jauche, Jauche, Marilles...) et
// une même localité peut apparaître sous plusieurs codes, d'où la table
// code → localités plutôt qu'une correspondance 1:1.
//
// Fichier GÉNÉRÉ — ne pas éditer à la main. Regénérer après modification du CSV :
//   python3 scripts/generate-postal-codes.py

export const POSTAL_CODES: Record<string, readonly string[]> = {
'''

FOOTER = '''
};

export const POSTAL_CODE_LIST: readonly string[] = Object.keys(POSTAL_CODES);

/// Localités desservies par un code postal ; liste vide si le code est inconnu
/// (saisie libre d'un code étranger, par exemple).
export function localitiesForPostalCode(code: string): readonly string[] {
  return POSTAL_CODES[code.trim()] ?? [];
}

/// Vrai si le couple code postal / localité fait partie du référentiel. Un
/// code inconnu est accepté (écoles hors territoire belge, cf.
/// REGION_OPTIONS qui prévoit "Hors territoire belge").
export function isKnownPostalCode(code: string): boolean {
  return code.trim() in POSTAL_CODES;
}
'''


def main() -> None:
    by_code: dict[str, set[str]] = collections.defaultdict(set)
    with CSV_PATH.open(encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            code = row["Code"].strip()
            locality = row["Localite"].strip()
            if not code or not locality:
                continue
            if not (code.isdigit() and len(code) == 4):
                raise SystemExit(f"Code postal invalide dans le CSV : {code!r}")
            by_code[code].add(locality)

    lines = [
        '  "%s": [%s]' % (code, ", ".join(json.dumps(name, ensure_ascii=False) for name in sorted(names)))
        for code, names in sorted(by_code.items())
    ]
    TS_PATH.write_text(HEADER + ",\n".join(lines) + "," + FOOTER, encoding="utf-8")
    print(f"{TS_PATH.relative_to(ROOT)} : {len(by_code)} codes postaux")


if __name__ == "__main__":
    main()
