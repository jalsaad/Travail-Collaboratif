// ---------------------------------------------------------------------------
// scripts/verifier-adresses.ts
// Marque, dans data/prospection-ecoles.csv, les adresses qui ne sont
// vraisemblablement PAS celles d'une direction d'école — avant qu'une campagne
// ne parte dessus.
//
//   npm run verifier-adresses                 # analyse et rapporte
//   npm run verifier-adresses -- --ecrire     # inscrit la colonne « verification »
//   npm run verifier-adresses -- --profil=po
//
// Quatre signaux, tirés de ce qu'on a observé sur les premières collectes :
//
//   — une même adresse attribuée à plusieurs écoles de noms différents. Cinq
//     écoles pointaient sur apfl@provincedeliege.be, trois sur ifec@segec.be :
//     c'est un service provincial ou fédéral, pas une direction. Deux
//     implantations d'un même établissement partagent en revanche
//     légitimement une adresse — leurs noms se ressemblent, on ne les marque
//     pas ;
//   — un domaine de fédération, de province ou d'organisme public. Ceux-là
//     relèvent de la campagne « pouvoirs organisateurs », dont le message
//     s'adresse à un échevin et non à un directeur ;
//   — une adresse d'exemple laissée par le gabarit d'un site
//     (« utilisateur@domaine.com ») ;
//   — une adresse issue d'un site trouvé par recherche. Le site retenu est le
//     premier résultat plausible d'un moteur, pas une adresse déclarée par
//     l'école : on en a vu aboutir sur un journal d'annonces régional.
//
// Le script ne supprime jamais une adresse : il la marque. La décision reste
// humaine, et la colonne se vide à la main pour valider un cas.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { colonnesDe, ecrireCsv, lireCsv, type LigneCsv } from "../lib/prospection-csv";

const RACINE = path.resolve(__dirname, "..");

const PROFILS: Record<string, { fichier: string; email: string; nom: string }> = {
  ecoles: { fichier: path.join(RACINE, "data/prospection-ecoles.csv"), email: "email_direction", nom: "nom" },
  po: { fichier: path.join(RACINE, "data/prospection-po.csv"), email: "email_po", nom: "nom" },
};

/// Domaines qui ne peuvent pas être ceux d'une école : réseaux, provinces,
/// organismes publics. Comparés sur le suffixe, pour attraper aussi les
/// sous-domaines (ecoles.hainaut.be).
const DOMAINES_TUTELLE = [
  "segec.be",
  "felsi.be",
  "cpeons.be",
  "cecp.be",
  "wbe.be",
  "enseignement.be",
  "cfwb.be",
  "ecib.be",
  "provincedeliege.be",
  "hainaut.be",
  "eduhainaut.be",
  "province.namur.be",
  "brabantwallon.be",
  "provinceluxembourg.be",
  "one.be",
];

/// Adresses d'exemple laissées par un gabarit de site : « utilisateur@domaine.com »
/// est passé jusqu'à l'envoi, le collecteur ne reconnaissant que « user@ » et
/// pas sa traduction française. Le domaine seul suffit à trancher — aucune
/// école n'écrit depuis « domaine.com » —, la partie locale sert de filet.
const FACTICE_DOMAINE =
  /@(exemple|example|domaine|domain|mondomaine|votredomaine|monsite|votresite|site|test|demo|localhost)\./i;
const FACTICE_LOCAL =
  /^(utilisateur|user|username|votre|vous|nom|prenom|exemple|example|test|demo|sample|email|mail|adresse|address)[-_.@]/i;

function adresseFactice(email: string): boolean {
  return FACTICE_DOMAINE.test(email) || FACTICE_LOCAL.test(email);
}

const args = process.argv.slice(2);
const ecrire = args.includes("--ecrire");
const profil = PROFILS[args.find((a) => a.startsWith("--profil="))?.split("=")[1] ?? "ecoles"];

/// Deux noms d'école se ressemblent-ils assez pour être deux implantations du
/// même établissement ? Comparaison sur les mots significatifs, une fois
/// écartés les génériques qui les commencent presque tous.
const GENERIQUES = new Set([
  "ecole", "école", "fondamentale", "fondamental", "libre", "communale", "communal",
  "primaire", "maternelle", "secondaire", "athenee", "athénée", "institut", "college",
  "collège", "royal", "provincial", "provinciale", "de", "du", "des", "la", "le", "les",
  "d", "l", "et", "en", "sur", "saint", "sainte", "notre", "dame",
]);

function motsSignificatifs(nom: string): Set<string> {
  return new Set(
    nom
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((m) => m.length > 2 && !GENERIQUES.has(m))
  );
}

function memeEtablissement(a: string, b: string): boolean {
  const ma = motsSignificatifs(a);
  const mb = motsSignificatifs(b);
  if (ma.size === 0 || mb.size === 0) return false;
  const communs = [...ma].filter((m) => mb.has(m)).length;
  return communs >= Math.min(ma.size, mb.size);
}

function domaineDeTutelle(email: string): string | null {
  const domaine = email.split("@")[1]?.toLowerCase() ?? "";
  return DOMAINES_TUTELLE.find((d) => domaine === d || domaine.endsWith(`.${d}`)) ?? null;
}

function main() {
  if (!fs.existsSync(profil.fichier)) {
    console.error(`Fichier introuvable : ${profil.fichier}`);
    process.exitCode = 1;
    return;
  }

  const contenu = fs.readFileSync(profil.fichier, "utf8");
  const colonnes = colonnesDe(contenu);
  const lignes = lireCsv(contenu);
  if (!colonnes.includes("verification")) colonnes.push("verification");

  const avecAdresse = lignes.filter((l) => (l[profil.email] ?? "").trim() !== "");

  // Regroupement par adresse, pour repérer celles qui servent plusieurs écoles.
  const parAdresse = new Map<string, LigneCsv[]>();
  for (const l of avecAdresse) {
    const email = l[profil.email].trim().toLowerCase();
    parAdresse.set(email, [...(parAdresse.get(email) ?? []), l]);
  }

  const motifs = new Map<string, number>();
  let marquees = 0;

  for (const l of lignes) {
    const email = (l[profil.email] ?? "").trim().toLowerCase();
    if (email === "") {
      l.verification = "";
      continue;
    }

    const tutelle = domaineDeTutelle(email);
    const partagees = parAdresse.get(email) ?? [];
    const autres = partagees.filter((x) => !memeEtablissement(x[profil.nom], l[profil.nom]));

    let motif = "";
    if (adresseFactice(email)) {
      motif = "adresse d'exemple";
    } else if (tutelle) {
      motif = `domaine de tutelle (${tutelle})`;
    } else if (autres.length > 0) {
      motif = `partagée avec ${autres.length} autre(s) école(s)`;
    } else if ((l.email_source ?? "").includes("recherche")) {
      // Par construction une supposition : le site retenu est le premier
      // résultat plausible d'un moteur, pas une adresse déclarée par l'école.
      // On en a vu aboutir sur un journal d'annonces régional.
      motif = "site supposé — à confirmer";
    }

    l.verification = motif;
    if (motif) {
      marquees++;
      const cle = adresseFactice(email)
        ? "adresse d'exemple"
        : tutelle
        ? `domaine de tutelle (${tutelle})`
        : autres.length > 0
          ? "adresse partagée"
          : "site supposé";
      motifs.set(cle, (motifs.get(cle) ?? 0) + 1);
    }
  }

  console.log(`${avecAdresse.length} adresse(s) en fichier`);
  console.log(`${marquees} marquée(s) à vérifier, ${avecAdresse.length - marquees} exploitable(s)\n`);
  for (const [motif, n] of [...motifs].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${motif}`);
  }

  const exemples = lignes.filter((l) => l.verification).slice(0, 10);
  if (exemples.length > 0) {
    console.log("\nExemples");
    for (const l of exemples) {
      console.log(`  ${l[profil.email].padEnd(34)} ${l[profil.nom].slice(0, 44).padEnd(46)} ${l.verification}`);
    }
  }

  if (!ecrire) {
    console.log("\nAnalyse seule : le fichier n'a pas été modifié. Relancez avec --ecrire.");
    return;
  }

  fs.writeFileSync(profil.fichier, ecrireCsv(colonnes, lignes), "utf8");
  console.log(`\nColonne « verification » écrite dans ${path.basename(profil.fichier)}.`);
}

main();
