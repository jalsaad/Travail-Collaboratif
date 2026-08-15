// ---------------------------------------------------------------------------
// scripts/pouvoirs-organisateurs.ts
// Construit data/prospection-po.csv : la liste des pouvoirs organisateurs des
// écoles de data/prospection-ecoles.csv, avec le nombre d'écoles que chacun
// couvre.
//
//   npm run po                 # construit ou met à jour le fichier
//   npm run po -- --rafraichir # redemande les sources au lieu du cache
//
// Deux sources publiques, toutes deux ouvertes à l'accès automatisé :
//  · le fichier signalétique des établissements de la Fédération
//    Wallonie-Bruxelles (Open Data Wallonie-Bruxelles), qui donne le PO de
//    chaque école — mais aucune adresse email ;
//  · Wikidata, pour le site officiel des communes et provinces, qui sont le PO
//    de tout l'officiel subventionné.
//
// Les adresses elles-mêmes se récupèrent ensuite avec :
//   npm run collecte-emails -- --profil=po
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { colonnesDe, ecrireCsv, lireCsv, type LigneCsv } from "../lib/prospection-csv";

const RACINE = path.resolve(__dirname, "..");
const ECOLES = path.join(RACINE, "data/prospection-ecoles.csv");
const SORTIE = path.join(RACINE, "data/prospection-po.csv");
const CACHE_SIGNALETIQUE = path.join(RACINE, "data/fwb-signaletique.json");
const CACHE_COMMUNES = path.join(RACINE, "data/communes-sites.json");

const USER_AGENT =
  "TravailCollaboratifBot/1.0 (+https://travail-collaboratif.be ; admin@travail-collaboratif.be)";

const DATASET =
  "fwb-age-fichier-signaletique-des-etablissements-d-enseignement-de-la-federation-";

type Etablissement = {
  nom_d_etablissement: string;
  code_postal_de_l_etablissement: string | number | null;
  reseau: string;
  niveau: string;
  ndeg_fase_du_po: number;
  nom_du_po: string;
  numero_bce_du_po: string | null;
  adresse_du_po: string | null;
  code_postal_du_po: string | number | null;
  localite_du_po: string | null;
  commune_du_po: string | null;
};

async function telechargerJson<T>(url: string, cache: string, rafraichir: boolean): Promise<T> {
  if (!rafraichir && fs.existsSync(cache)) {
    return JSON.parse(fs.readFileSync(cache, "utf8")) as T;
  }
  const reponse = await fetch(url, {
    signal: AbortSignal.timeout(240000),
    headers: { "user-agent": USER_AGENT, accept: "application/json" },
  });
  if (!reponse.ok) throw new Error(`${url} → HTTP ${reponse.status}`);
  const texte = await reponse.text();
  fs.writeFileSync(cache, texte, "utf8");
  return JSON.parse(texte) as T;
}

/// Comparaison de noms d'établissement : sans accents, sans ponctuation, en
/// minuscules. « Ecole communale "Bois" » et « École communale Bois » doivent
/// se retrouver.
function normaliser(valeur: string): string {
  return (valeur ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/// Part de mots communs entre deux noms (indice de Jaccard) : les libellés de
/// l'annuaire et du signalétique divergent souvent d'un mot ou deux
/// (« Ecole fondamentale libre Saint-Michel » / « E.F.L. Saint-Michel »).
function similitude(a: string, b: string): number {
  const ma = new Set(a.split(" ").filter(Boolean));
  const mb = new Set(b.split(" ").filter(Boolean));
  if (ma.size === 0 || mb.size === 0) return 0;
  const commun = [...ma].filter((m) => mb.has(m)).length;
  return commun / new Set([...ma, ...mb]).size;
}

// Le PO de l'officiel subventionné est la commune ou la province : leur site
// officiel vient de Wikidata. Pour le libre, le PO est une ASBL ou un comité
// scolaire dont l'adresse n'est qu'un domicile administratif — y accrocher le
// site de la commune serait faux.
const RESEAUX_PUBLICS_LOCAUX = new Set(["Subventionné communal", "Subventionné provincial"]);

// Wallonie-Bruxelles Enseignement est le PO unique de tout le réseau WBE :
// www.w-b-e.be redirige vers wbe.be.
const SITE_WBE = "https://www.wbe.be/";

// Q493522 commune de Belgique · Q15273785 commune avec le titre de ville ·
// Q83116 province de Belgique. Sans la deuxième, les villes manquent ; sans la
// troisième, les provinces — qui sont le PO de tout le provincial.
const REQUETE_WIKIDATA = `SELECT ?nom ?site WHERE {
  VALUES ?type { wd:Q493522 wd:Q15273785 wd:Q83116 }
  ?item wdt:P31 ?type ; wdt:P17 wd:Q31 ; wdt:P856 ?site .
  ?item rdfs:label ?nom . FILTER(LANG(?nom)='fr')
}`;

type ReponseWikidata = { results: { bindings: { nom: { value: string }; site?: { value: string } }[] } };

async function sitesDesCommunes(rafraichir: boolean): Promise<Map<string, string>> {
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(REQUETE_WIKIDATA)}`;
  const donnees = await telechargerJson<ReponseWikidata>(url, CACHE_COMMUNES, rafraichir);
  const sites = new Map<string, string>();
  for (const ligne of donnees.results.bindings) {
    const site = ligne.site?.value;
    if (!site) continue;
    const cle = normaliser(ligne.nom.value);
    const actuel = sites.get(cle);
    // Bruxelles a trois sites officiels (brussel.be, brussels.be,
    // bruxelles.be) : on garde celui dont le domaine porte le nom français de
    // la commune, faute de quoi l'invitation partirait en néerlandais.
    if (!actuel || (!domainePorteLeNom(actuel, cle) && domainePorteLeNom(site, cle))) {
      sites.set(cle, site);
    }
  }
  return sites;
}

function domainePorteLeNom(site: string, nomNormalise: string): boolean {
  try {
    const hote = new URL(site).hostname.replace(/[^a-z0-9]/gi, "").toLowerCase();
    return hote.includes(nomNormalise.replace(/ /g, ""));
  } catch {
    return false;
  }
}

/// « Province du Hainaut », « Province de Liège » → « hainaut », « liege ».
function nomDeProvince(nomPo: string): string {
  return normaliser(nomPo.replace(/^province\s+(du|de la|de l'|des|de)\s+/i, ""));
}

/// Dernier recours pour les communes absentes de Wikidata (Charleroi, qui est
/// pourtant le PO de 42 écoles) : le domaine conventionnel, mais vérifié —
/// on ne retient l'adresse que si la page nomme réellement la commune.
async function siteDevine(commune: string): Promise<string> {
  const nom = normaliser(commune).replace(/ /g, "-");
  if (!nom) return "";
  const url = `https://www.${nom}.be/`;
  try {
    const reponse = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
      headers: { "user-agent": USER_AGENT, accept: "text/html" },
    });
    if (!reponse.ok) return "";
    const html = (await reponse.text()).slice(0, 200000);
    return normaliser(html).includes(normaliser(commune)) ? url : "";
  } catch {
    return "";
  }
}

type Options = { rafraichir: boolean };

async function main() {
  const argv = process.argv.slice(2);
  const options: Options = { rafraichir: argv.includes("--rafraichir") };

  const ecoles = lireCsv(fs.readFileSync(ECOLES, "utf8"));
  const signaletique = await telechargerJson<Etablissement[]>(
    `https://www.odwb.be/api/explore/v2.1/catalog/datasets/${DATASET}/exports/json?select=nom_d_etablissement,code_postal_de_l_etablissement,reseau,niveau,ndeg_fase_du_po,nom_du_po,numero_bce_du_po,adresse_du_po,code_postal_du_po,localite_du_po,commune_du_po`,
    CACHE_SIGNALETIQUE,
    options.rafraichir
  );
  const communes = await sitesDesCommunes(options.rafraichir);

  console.log(`Écoles           : ${ecoles.length}`);
  console.log(`Signalétique FWB : ${signaletique.length} établissements`);
  console.log(`Communes Wikidata: ${communes.size} sites officiels\n`);

  // Index par code postal : le rapprochement ne compare que des établissements
  // de la même localité, ce qui rend la similitude de noms fiable.
  const parCodePostal = new Map<string, Etablissement[]>();
  for (const etablissement of signaletique) {
    const cp = String(etablissement.code_postal_de_l_etablissement ?? "");
    const liste = parCodePostal.get(cp);
    if (liste) liste.push(etablissement);
    else parCodePostal.set(cp, [etablissement]);
  }

  type Groupe = {
    etablissement: Etablissement;
    ecoles: string[];
    reseaux: Set<string>;
  };
  const groupes = new Map<number, Groupe>();
  let exacts = 0;
  let approches = 0;
  const orphelines: string[] = [];

  for (const ecole of ecoles) {
    const candidats = parCodePostal.get(ecole.code_postal ?? "") ?? [];
    const nom = normaliser(ecole.nom ?? "");

    let trouve = candidats.find((c) => normaliser(c.nom_d_etablissement) === nom);
    if (trouve) exacts++;
    else {
      let meilleur = 0;
      for (const candidat of candidats) {
        const score = similitude(nom, normaliser(candidat.nom_d_etablissement));
        if (score > meilleur) {
          meilleur = score;
          trouve = candidat;
        }
      }
      // En dessous de la moitié des mots en commun, mieux vaut ne rien
      // affirmer : un mauvais PO enverrait l'invitation à la mauvaise adresse.
      if (meilleur < 0.5) trouve = undefined;
      else approches++;
    }

    if (!trouve) {
      orphelines.push(ecole.nom);
      continue;
    }

    const groupe = groupes.get(trouve.ndeg_fase_du_po);
    if (groupe) {
      groupe.ecoles.push(ecole.nom);
      groupe.reseaux.add(trouve.reseau);
    } else {
      groupes.set(trouve.ndeg_fase_du_po, {
        etablissement: trouve,
        ecoles: [ecole.nom],
        reseaux: new Set([trouve.reseau]),
      });
    }
  }

  // Les adresses déjà présentes (collectées ou saisies à la main) survivent à
  // une reconstruction du fichier.
  const existant = new Map<string, LigneCsv>();
  if (fs.existsSync(SORTIE)) {
    for (const ligne of lireCsv(fs.readFileSync(SORTIE, "utf8"))) {
      existant.set(ligne.fase_po, ligne);
    }
  }

  const lignes: LigneCsv[] = [];
  for (const [fase, groupe] of groupes.entries()) {
    lignes.push(
      await (async () => {
      const { etablissement, ecoles: noms, reseaux } = groupe;
      const reseauxTries = [...reseaux].sort();
      const ancienne = existant.get(String(fase));

      let site = ancienne?.site_web ?? "";
      if (!site) {
        if (reseauxTries.includes("WBE")) {
          site = SITE_WBE;
        } else if (reseauxTries.includes("Subventionné provincial")) {
          // La commune du PO provincial n'est que le siège administratif :
          // chercher « Mons » donnerait le site de la ville, pas celui de la
          // province du Hainaut.
          site = communes.get(nomDeProvince(etablissement.nom_du_po)) ?? "";
        } else if (reseauxTries.some((r) => RESEAUX_PUBLICS_LOCAUX.has(r))) {
          const commune = etablissement.commune_du_po ?? "";
          site = communes.get(normaliser(commune)) ?? (await siteDevine(commune));
        }
      }

      return {
        nom_po: etablissement.nom_du_po,
        fase_po: String(fase),
        bce_po: etablissement.numero_bce_du_po ?? "",
        reseaux: reseauxTries.join(" + "),
        adresse: etablissement.adresse_du_po ?? "",
        code_postal: String(etablissement.code_postal_du_po ?? ""),
        localite: etablissement.localite_du_po ?? "",
        commune: etablissement.commune_du_po ?? "",
        nb_ecoles: String(noms.length),
        ecoles: noms.sort().join(" | "),
        site_web: site,
        email_po: ancienne?.email_po ?? "",
        email_source: ancienne?.email_source ?? "",
        statut_envoi: ancienne?.statut_envoi ?? "",
      };
      })()
    );
  }
  lignes.sort((a, b) => Number(b.nb_ecoles) - Number(a.nb_ecoles) || a.nom_po.localeCompare(b.nom_po));

  const colonnes = fs.existsSync(SORTIE)
    ? colonnesDe(fs.readFileSync(SORTIE, "utf8"))
    : Object.keys(lignes[0]);
  fs.writeFileSync(SORTIE, ecrireCsv(colonnes, lignes), "utf8");

  const avecSite = lignes.filter((l) => l.site_web).length;
  const avecEmail = lignes.filter((l) => l.email_po).length;
  console.log(`Rapprochement : ${exacts} exact(s), ${approches} approché(s), ${orphelines.length} sans correspondance`);
  if (orphelines.length) console.log(`  · ${orphelines.slice(0, 5).join(" ; ")}${orphelines.length > 5 ? " …" : ""}`);
  console.log(`\nPouvoirs organisateurs : ${lignes.length}`);
  console.log(`  avec site officiel   : ${avecSite}`);
  console.log(`  avec adresse email   : ${avecEmail}`);
  console.log(`\nLes 8 premiers par nombre d'écoles :`);
  for (const l of lignes.slice(0, 8)) {
    console.log(`  ${String(l.nb_ecoles).padStart(3)} écoles — ${l.nom_po}${l.site_web ? ` (${l.site_web})` : ""}`);
  }
  console.log(`\nFichier : ${path.relative(RACINE, SORTIE)}`);
}

main().catch((erreur) => {
  console.error(erreur);
  process.exit(1);
});
