// ---------------------------------------------------------------------------
// lib/fwb-directory.ts
// Traduction du vocabulaire de l'annuaire officiel de la Fédération
// Wallonie-Bruxelles vers celui de la plateforme. Partagé par le script
// d'import (scripts/importer-cartographie.ts) et par le préremplissage du
// formulaire de création d'école.
// ---------------------------------------------------------------------------

/// Les niveaux et types de la plateforme, en littéraux plutôt qu'en import
/// depuis @prisma/client : ce module est lu par un script ts-node hors Next,
/// et les valeurs sont de toute façon des chaînes en base.
export type Niveau = "MATERNELLE" | "PRIMAIRE" | "SECONDAIRE";
export type Genre = "ORDINAIRE" | "SPECIALISE";

/// Les dix « types d'enseignement » de l'annuaire, décomposés en niveau et
/// genre. Deux établissements sur trois en cumulent plusieurs, d'où
/// l'agrégation sur toutes leurs implantations.
///
/// L'artistique à horaire réduit (académies) n'a pas de niveau au sens de la
/// plateforme : il reste consigné tel quel dans typesEnseignement, sans
/// alimenter niveaux.
const TYPES: Record<string, { niveau?: Niveau; genre: Genre }> = {
  "Maternel ordinaire": { niveau: "MATERNELLE", genre: "ORDINAIRE" },
  "Primaire ordinaire": { niveau: "PRIMAIRE", genre: "ORDINAIRE" },
  "Secondaire ordinaire": { niveau: "SECONDAIRE", genre: "ORDINAIRE" },
  "Secondaire CEFA": { niveau: "SECONDAIRE", genre: "ORDINAIRE" },
  "Enseignement secondaire pour Adultes": { niveau: "SECONDAIRE", genre: "ORDINAIRE" },
  "Enseignement pour Adultes en alternance": { niveau: "SECONDAIRE", genre: "ORDINAIRE" },
  "Maternel spécialisé": { niveau: "MATERNELLE", genre: "SPECIALISE" },
  "Primaire spécialisé": { niveau: "PRIMAIRE", genre: "SPECIALISE" },
  "Secondaire spécialisé": { niveau: "SECONDAIRE", genre: "SPECIALISE" },
  "Artistique à horaire réduit": { genre: "ORDINAIRE" },
};

export function decomposerTypes(types: string[]): { niveaux: Niveau[]; genres: Genre[] } {
  const niveaux = new Set<Niveau>();
  const genres = new Set<Genre>();
  for (const type of types) {
    const t = TYPES[type];
    if (!t) continue; // type inconnu : consigné tel quel, sans interprétation
    if (t.niveau) niveaux.add(t.niveau);
    genres.add(t.genre);
  }
  const ordreNiveaux: Niveau[] = ["MATERNELLE", "PRIMAIRE", "SECONDAIRE"];
  const ordreGenres: Genre[] = ["ORDINAIRE", "SPECIALISE"];
  return {
    niveaux: ordreNiveaux.filter((n) => niveaux.has(n)),
    genres: ordreGenres.filter((g) => genres.has(g)),
  };
}

/// Les sept réseaux de l'annuaire vers les dix de la plateforme
/// (cf. lib/reseau-options.ts). La correspondance n'est pas bijective :
///
/// — « Libre confessionnel » ne dit pas LEQUEL. L'écrasante majorité relève du
///   SeGEC, on prérempli donc celui-ci, mais la direction voit la valeur dans
///   un menu qu'elle peut corriger. Mieux vaut une valeur presque toujours
///   juste et visible qu'un champ vide à saisir dans tous les cas.
/// — COCOF et « Organisme public autre » n'ont pas d'équivalent : le champ
///   reste vide, la direction choisit.
const RESEAUX: Record<string, string> = {
  WBE: "Officiel (WBE)",
  "Subventionné communal": "Officiel subventionné (CPEONS / CECP)",
  "Subventionné provincial": "Officiel subventionné (CPEONS / CECP)",
  "Libre non confessionnel": "Libre non confessionnel (FELSI)",
  "Libre confessionnel": "Libre confessionnel catholique (SeGEC)",
};

export function reseauPlateforme(reseauAnnuaire: string): string | null {
  return RESEAUX[reseauAnnuaire] ?? null;
}

/// Vrai quand la correspondance est une supposition et non une équivalence :
/// l'annuaire ne distingue pas les confessions.
export function reseauIncertain(reseauAnnuaire: string): boolean {
  return reseauAnnuaire === "Libre confessionnel";
}

/// L'annuaire écrit les numéros FASE en décimal — « 10.0 », « 1000.0 » —
/// séquelle d'un export tableur. On les ramène à leur forme entière, la seule
/// qui se compare à School.numeroFase et que saisira une direction.
export function normaliserFase(valeur: string): string | null {
  const brut = valeur.trim();
  if (!brut) return null;
  const nombre = Number(brut);
  if (!Number.isFinite(nombre) || nombre <= 0) return null;
  return String(Math.trunc(nombre));
}

/// Les « bassins » de l'annuaire sont les zones de la Fédération, au libellé
/// près : celles de la plateforme portent en plus leur numéro. La
/// correspondance est donc exacte, sauf « Hors zones » qui n'en désigne aucune.
const ZONES: Record<string, string> = {
  Bruxelles: "Bruxelles (Zone 1)",
  "Brabant wallon": "Brabant wallon (Zone 2)",
  "Huy-Waremme": "Huy-Waremme (Zone 3)",
  "Liège": "Liège (Zone 4)",
  Verviers: "Verviers (Zone 5)",
  Namur: "Namur (Zone 6)",
  Luxembourg: "Luxembourg (Zone 7)",
  "Wallonie Picarde": "Wallonie Picarde (Zone 8)",
  "Hainaut Centre": "Hainaut Centre (Zone 9)",
  "Hainaut Sud": "Hainaut Sud (Zone 10)",
};

export function regionPlateforme(bassin: string | null): string | null {
  return bassin ? (ZONES[bassin] ?? null) : null;
}
