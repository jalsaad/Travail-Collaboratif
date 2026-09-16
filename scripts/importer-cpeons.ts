// ---------------------------------------------------------------------------
// scripts/importer-cpeons.ts
// Complète l'annuaire (fwb_schools) avec les téléphones, emails et sites web
// que le CPEONS publie lui-même pour ses établissements secondaires :
//
//   https://www.cpeons.be/liste-etablissements?key=&type=2&bassin=
//
// Contrairement à scripts/collecter-emails.ts, qui doit deviner l'adresse en
// visitant le site de chaque école, cette page les donne directement : pas de
// scraping heuristique, juste une lecture et un appariement.
//
//   npm run importer-cpeons                 # analyse, n'écrit rien
//   npm run importer-cpeons -- --ecrire     # inscrit les champs vides en base
//
// Appariement à l'annuaire, dans cet ordre :
//   1. Numéro FASE — la fiche de chaque établissement (/etablissement/{id})
//      le publie, et c'est la clé primaire de fwb_schools : sans ambiguïté
//      possible.
//   2. À défaut (le CPEONS ne le publie pas pour toutes ses fiches), nom +
//      code postal, comme scripts/synchroniser-prospection.ts, restreint aux
//      réseaux que fédère le CPEONS (Subventionné communal/provincial) pour
//      ne pas apparier une école libre du même nom.
//
// Seuls les champs vides de l'annuaire sont remplis — une valeur déjà
// présente (saisie à la main ou trouvée par collecter-emails.ts) n'est
// jamais écrasée. Le détail de l'appariement part dans
// data/import-cpeons-rapport.csv, à relire avant d'écrire en base.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { chargerEnvLocal } from "../lib/env-local";
import { ecrireCsv } from "../lib/prospection-csv";

const RACINE = path.resolve(__dirname, "..");
const BASE = "https://www.cpeons.be";
const URL_LISTE = `${BASE}/liste-etablissements?key=&type=2&bassin=`;
const RAPPORT = path.join(RACINE, "data/import-cpeons-rapport.csv");

// Réseaux de l'annuaire que fédère le CPEONS (cf. lib/fwb-directory.ts) :
// restreindre l'appariement par nom à ce périmètre évite de confondre une
// école communale avec une école libre homonyme.
const RESEAUX_CPEONS = ["Subventionné communal", "Subventionné provincial"];

const USER_AGENT =
  "TravailCollaboratifBot/1.0 (+https://travail-collaboratif.be ; admin@travail-collaboratif.be)";

// ---------------------------------------------------------------------------
// Téléchargement — cpeons.be sert une chaîne de certificats incomplète (le
// navigateur la reconstitue via AIA, mais fetch()/curl la rejettent telle
// quelle : même symptôme que `curl` sans `-k`). On ne désactive la
// vérification TLS que pour les requêtes vers ce domaine précis, et on la
// restaure aussitôt après.
// ---------------------------------------------------------------------------

async function avecTlsPermissif<T>(action: () => Promise<T>): Promise<T> {
  const precedent = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  try {
    return await action();
  } finally {
    if (precedent === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = precedent;
  }
}

async function telecharger(url: string, timeoutMs: number): Promise<string | null> {
  return avecTlsPermissif(async () => {
    try {
      const reponse = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { "user-agent": USER_AGENT, accept: "text/html" },
      });
      if (!reponse.ok) return null;
      return await reponse.text();
    } catch {
      return null;
    }
  });
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

type Etablissement = {
  id: string;
  nom: string;
  adresse: string;
  codePostal: string;
  ville: string;
  telephone: string;
  email: string;
  website: string;
  numeroFase: string | null;
};

function decoderEntites(html: string): string {
  return html
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&");
}

/// Le CPEONS publie parfois un lien de site cassé — un bogue de leur
/// formulaire de saisie, jamais une adresse à deux protocoles :
///   - protocole doublé : « http://https://ecole.be »
///   - adresse collée deux fois autour d'un « # » : « http://#ecole.be/# »
///     ou « http://ecole.be#http://ecole.be# » (vus tels quels dans le HTML).
/// On retire le protocole redondant, puis on retient le dernier segment non
/// vide autour des « # » : c'est systématiquement la partie exploitable.
function normaliserSite(href: string): string {
  const sansProtocoleDouble = href.replace(/^https?:\/\/(?=https?:\/\/)/, "");
  const segments = sansProtocoleDouble.split("#").filter(Boolean);
  return segments.at(-1) ?? href;
}

function extraireEtablissements(html: string): Omit<Etablissement, "numeroFase">[] {
  const tbody = /<tbody>([\s\S]*?)<\/tbody>/.exec(html)?.[1];
  if (!tbody) return [];

  const resultats: Omit<Etablissement, "numeroFase">[] = [];
  for (const ligneMatch of tbody.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const cellules = [...ligneMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1]);
    if (cellules.length < 6) continue;

    const id = /\/etablissement\/(\d+)/.exec(cellules[0])?.[1] ?? "";
    const nom = decoderEntites(/<a[^>]*>([\s\S]*?)<\/a>/.exec(cellules[0])?.[1] ?? "").replace(
      /<[^>]+>/g,
      ""
    );
    const adresse = decoderEntites(cellules[1].replace(/<[^>]+>/g, "")).trim();
    const localite = decoderEntites(cellules[2].replace(/<[^>]+>/g, "")).trim();
    const [codePostal, ...reste] = localite.split(" ");
    const ville = reste.join(" ");

    const telBrut = /<a[^>]*>([^<]*)<\/a>/.exec(cellules[3])?.[1] ?? cellules[3].replace(/<[^>]+>/g, "");
    const telephone = telBrut.trim() === "/" ? "" : telBrut.trim();

    const email = /mailto:([^"]+)"/.exec(cellules[4])?.[1]?.trim() ?? "";

    const hrefSite = /href="([^"]+)"/.exec(cellules[5])?.[1];
    const website = hrefSite ? normaliserSite(hrefSite) : "";

    if (!id) continue;
    resultats.push({ id, nom: nom.trim(), adresse, codePostal, ville, telephone, email, website });
  }
  return resultats;
}

async function listerEtablissements(timeoutMs: number): Promise<Omit<Etablissement, "numeroFase">[]> {
  const tous: Omit<Etablissement, "numeroFase">[] = [];
  for (let page = 0; ; page++) {
    const url = page === 0 ? URL_LISTE : `${URL_LISTE}&page=${page}`;
    const html = await telecharger(url, timeoutMs);
    if (!html) break;
    const lignes = extraireEtablissements(html);
    if (lignes.length === 0) break;
    tous.push(...lignes);
    // La page suivante n'existe pas : le CPEONS republie alors la dernière
    // page valide plutôt qu'une page vide, d'où la comparaison au lot déjà vu.
    if (page > 0 && tous.slice(-lignes.length).every((l, i) => l.id === lignes[i].id)) {
      const dejaVus = new Set(tous.slice(0, -lignes.length).map((l) => l.id));
      if (lignes.every((l) => dejaVus.has(l.id))) {
        tous.splice(-lignes.length);
        break;
      }
    }
  }
  return tous;
}

async function recupererFase(id: string, timeoutMs: number): Promise<string | null> {
  const html = await telecharger(`${BASE}/etablissement/${id}`, timeoutMs);
  if (!html) return null;
  const m = /Fase\s*:?\s*<\/strong><\/div>\s*<div>\s*([0-9.]+)\s*<\/div>/i.exec(html);
  return m ? m[1].trim() : null;
}

// ---------------------------------------------------------------------------
// Appariement à l'annuaire
// ---------------------------------------------------------------------------

const normaliser = (valeur: string) =>
  valeur
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const motsCles = (nom: string) => new Set(normaliser(nom).split(" ").filter((m) => m.length > 3));

/// Numéro FASE de l'annuaire officiel, écrit en décimal ("2895.0") sur
/// certains exports : on le ramène à sa forme entière pour qu'il se compare
/// à celui, déjà entier, que lit le CPEONS.
function normaliserFase(valeur: string): string {
  const nombre = Number(valeur);
  return Number.isFinite(nombre) && nombre > 0 ? String(Math.trunc(nombre)) : valeur.trim();
}

type EcoleAnnuaire = {
  numeroFase: string;
  name: string;
  postalCode: string | null;
  reseau: string;
  phone: string | null;
  emailDirection: string | null;
  website: string | null;
};

type Appariement =
  | { methode: "fase"; ecole: EcoleAnnuaire }
  | { methode: "nom"; ecole: EcoleAnnuaire }
  | { methode: "aucune" };

function apparier(
  etab: Etablissement,
  parFase: Map<string, EcoleAnnuaire>,
  parCodePostal: Map<string, EcoleAnnuaire[]>
): Appariement {
  if (etab.numeroFase) {
    const ecole = parFase.get(normaliserFase(etab.numeroFase));
    if (ecole) return { methode: "fase", ecole };
  }

  const candidates = (parCodePostal.get(etab.codePostal) ?? []).filter((e) =>
    RESEAUX_CPEONS.includes(e.reseau)
  );
  const cible = motsCles(etab.nom);
  if (cible.size === 0) return { methode: "aucune" };

  const retenues = candidates.filter((e) => {
    const source = motsCles(e.name);
    if (source.size === 0) return false;
    const communs = [...source].filter((m) => cible.has(m)).length;
    return communs >= Math.min(source.size, cible.size);
  });

  return retenues.length === 1 ? { methode: "nom", ecole: retenues[0] } : { methode: "aucune" };
}

// ---------------------------------------------------------------------------
// Programme
// ---------------------------------------------------------------------------

const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Fiches manifestement de test ou vides : rien à en tirer, et « Test Sec »
// n'est pas une école.
function estExploitable(etab: Omit<Etablissement, "numeroFase">): boolean {
  if (/^test\b/i.test(etab.nom)) return false;
  return Boolean(etab.telephone || etab.email || etab.website);
}

type LigneRapport = {
  id_cpeons: string;
  nom: string;
  code_postal: string;
  numero_fase_cpeons: string;
  methode: string;
  numero_fase_apparie: string;
  telephone_ajoute: string;
  email_ajoute: string;
  website_ajoute: string;
  statut: string;
};

async function main() {
  chargerEnvLocal(RACINE);
  const ecrire = process.argv.includes("--ecrire");
  const timeoutMs = 15000;

  console.log(`Liste : ${URL_LISTE}\n`);
  console.log("Récupération des pages de l'annuaire CPEONS...");
  const brut = await listerEtablissements(timeoutMs);
  console.log(`  ${brut.length} fiche(s) trouvée(s).`);

  const exploitables = brut.filter(estExploitable);
  console.log(`  ${exploitables.length} exploitable(s) (${brut.length - exploitables.length} ignorée(s) : fiche de test ou sans aucun contact).\n`);

  console.log("Récupération du numéro FASE de chaque fiche...");
  const etablissements: Etablissement[] = [];
  let index = 0;
  async function travailleur() {
    while (index < exploitables.length) {
      const etab = exploitables[index++];
      const numeroFase = await recupererFase(etab.id, timeoutMs);
      etablissements.push({ ...etab, numeroFase });
    }
  }
  await Promise.all(Array.from({ length: 4 }, () => travailleur()));
  console.log(`  ${etablissements.filter((e) => e.numeroFase).length}/${etablissements.length} avec un numéro FASE publié.\n`);

  const prisma = new PrismaClient();
  try {
    const annuaire = await prisma.fwbSchool.findMany({
      select: { numeroFase: true, name: true, postalCode: true, reseau: true, phone: true, emailDirection: true, website: true },
    });

    const parFase = new Map(annuaire.map((e) => [normaliserFase(e.numeroFase), e]));
    const parCodePostal = new Map<string, typeof annuaire>();
    for (const e of annuaire) {
      const cle = e.postalCode ?? "";
      parCodePostal.set(cle, [...(parCodePostal.get(cle) ?? []), e]);
    }

    const rapport: LigneRapport[] = [];
    const compte = { fase: 0, nom: 0, aucune: 0, majTelephone: 0, majEmail: 0, majWebsite: 0 };

    for (const etab of etablissements) {
      const resultat = apparier(etab, parFase, parCodePostal);
      compte[resultat.methode]++;

      if (resultat.methode === "aucune") {
        rapport.push({
          id_cpeons: etab.id, nom: etab.nom, code_postal: etab.codePostal,
          numero_fase_cpeons: etab.numeroFase ?? "", methode: "aucune", numero_fase_apparie: "",
          telephone_ajoute: "", email_ajoute: "", website_ajoute: "", statut: "sans correspondance dans l'annuaire",
        });
        continue;
      }

      const { ecole } = resultat;
      const maj: Record<string, string> = {};
      if (!ecole.phone && etab.telephone) maj.phone = etab.telephone;
      if (!ecole.emailDirection && etab.email && EMAIL_VALIDE.test(etab.email)) maj.emailDirection = etab.email;
      if (!ecole.website && etab.website) maj.website = etab.website;

      if (Object.keys(maj).length > 0 && ecrire) {
        await prisma.fwbSchool.update({ where: { numeroFase: ecole.numeroFase }, data: maj });
      }
      if (maj.phone) compte.majTelephone++;
      if (maj.emailDirection) compte.majEmail++;
      if (maj.website) compte.majWebsite++;

      rapport.push({
        id_cpeons: etab.id, nom: etab.nom, code_postal: etab.codePostal,
        numero_fase_cpeons: etab.numeroFase ?? "", methode: resultat.methode, numero_fase_apparie: ecole.numeroFase,
        telephone_ajoute: maj.phone ?? "", email_ajoute: maj.emailDirection ?? "", website_ajoute: maj.website ?? "",
        statut: Object.keys(maj).length > 0 ? (ecrire ? "mis à jour" : "à mettre à jour") : "déjà complet",
      });
    }

    fs.writeFileSync(
      RAPPORT,
      ecrireCsv(
        ["id_cpeons", "nom", "code_postal", "numero_fase_cpeons", "methode", "numero_fase_apparie",
          "telephone_ajoute", "email_ajoute", "website_ajoute", "statut"],
        rapport as unknown as Record<string, string>[]
      ),
      "utf8"
    );

    console.log("APPARIEMENT");
    console.log(`  ${compte.fase} par numéro FASE`);
    console.log(`  ${compte.nom} par nom + code postal`);
    console.log(`  ${compte.aucune} sans correspondance\n`);
    console.log(ecrire ? "MISE À JOUR" : "CHAMPS À COMPLÉTER (analyse seule, relancez avec --ecrire)");
    console.log(`  ${compte.majTelephone} téléphone(s)`);
    console.log(`  ${compte.majEmail} email(s)`);
    console.log(`  ${compte.majWebsite} site(s) web`);
    console.log(`\nRapport : ${path.relative(RACINE, RAPPORT)}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((erreur) => {
  console.error(erreur);
  process.exit(1);
});
