// ---------------------------------------------------------------------------
// scripts/collecter-emails.ts
// Complète la colonne « email_direction » de data/prospection-ecoles.csv en
// visitant le site de chaque école qui n'a pas encore d'adresse : page
// d'accueil, puis les quelques pages de contact qu'elle référence.
//
//   npm run collecte-emails                        # écoles ayant un site connu
//   npm run collecte-emails -- --recherche         # + recherche du site des autres
//   npm run collecte-emails -- --limite=20 --concurrence=2
//
// Le fichier n'est réécrit qu'à la fin, et seules les cases vides sont
// remplies : une adresse saisie à la main n'est jamais écrasée. Le détail de
// ce qui a été trouvé (candidats écartés compris) part dans
// data/collecte-rapport.csv, à relire avant d'envoyer quoi que ce soit.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { colonnesDe, ecrireCsv, lireCsv, type LigneCsv } from "../lib/prospection-csv";

const RACINE = path.resolve(__dirname, "..");
const FICHIER_DEFAUT = path.join(RACINE, "data/prospection-ecoles.csv");
const RAPPORT_DEFAUT = path.join(RACINE, "data/collecte-rapport.csv");

// Un robot qui se présente et donne une adresse de contact : c'est ce qui
// permet à un webmaster de nous écrire plutôt que de nous bloquer.
const USER_AGENT =
  "TravailCollaboratifBot/1.0 (+https://travail-collaboratif.be ; admin@travail-collaboratif.be)";

// ---------------------------------------------------------------------------
// Extraction des adresses
// ---------------------------------------------------------------------------

const EMAIL_BRUT = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// « nom (at) domaine.be », « nom [arobase] domaine.be » — l'obfuscation la plus
// répandue sur les sites d'école, et la seule qui se décode sans exécuter le JS.
const EMAIL_OBFUSQUE =
  /([A-Za-z0-9._%+-]+)\s*(?:\(|\[|&#40;)?\s*(?:at|arobase|@)\s*(?:\)|\]|&#41;)?\s*([A-Za-z0-9.-]+)\s*(?:\(|\[)?\s*(?:dot|point)\s*(?:\)|\])?\s*([A-Za-z]{2,})/gi;

// Extensions d'images : « logo@2x.png » ressemble à une adresse pour la regex.
const FAUX_POSITIFS = /\.(png|jpe?g|gif|svg|webp|css|js|woff2?|ttf)$/i;
// Adresses techniques ou de prestataires : jamais celles d'une direction.
const DOMAINES_EXCLUS = [
  "sentry.io", "wixpress.com", "wix.com", "example.com", "domain.com", "email.com",
  "godaddy.com", "squarespace.com", "jimdo.com", "weebly.com", "joomla.org",
  "wordpress.org", "wordpress.com", "sitew.com", "e-monsite.com", "webnode.com",
];
const LOCALES_EXCLUES = /^(no-?reply|noreply|donotreply|webmaster|postmaster|abuse|privacy|dpo|rgpd|support|sales|billing|hostmaster|mailer-daemon)$/i;

function normaliserEmails(texte: string): string[] {
  const trouves = new Set<string>();

  for (const brut of texte.match(EMAIL_BRUT) ?? []) {
    trouves.add(brut.replace(/[.,;:)]+$/, "").toLowerCase());
  }
  for (const m of texte.matchAll(EMAIL_OBFUSQUE)) {
    trouves.add(`${m[1]}@${m[2]}.${m[3]}`.toLowerCase());
  }

  return [...trouves].filter((e) => {
    const [locale, domaine] = e.split("@");
    if (!locale || !domaine) return false;
    if (FAUX_POSITIFS.test(e)) return false;
    if (LOCALES_EXCLUES.test(locale)) return false;
    if (DOMAINES_EXCLUS.some((d) => domaine === d || domaine.endsWith(`.${d}`))) return false;
    // Une adresse dont le domaine n'a pas de point ou dont l'extension fait
    // plus de 6 lettres vient presque toujours d'un faux positif de balisage.
    return /\.[a-z]{2,6}$/.test(domaine);
  });
}

/// Deux adresses valent mieux l'une que l'autre : celle de la direction ou du
/// secrétariat, sur le domaine du site de l'école, plutôt qu'une adresse
/// personnelle d'enseignant ou une boîte hébergée ailleurs.
function scorer(email: string, domaineSite: string | null): number {
  const [locale, domaine] = email.split("@");
  let score = 0;

  if (/^direction|^dir\b|^directeur|^directrice/.test(locale)) score += 6;
  else if (/^secretariat|^secretaire|^secr/.test(locale)) score += 5;
  else if (/^(info|contact|ecole|college|athenee|institut|administration|admin)/.test(locale)) score += 4;
  else if (/^(inscription|inscriptions|accueil)/.test(locale)) score += 2;

  if (domaineSite && (domaine === domaineSite || domaine.endsWith(`.${domaineSite}`))) score += 3;
  else if (domaineSite) score -= 1;

  // Boîtes grand public : fréquentes et légitimes dans le fondamental, mais à
  // ne retenir qu'à défaut d'une adresse sur le domaine de l'école.
  if (/(gmail|hotmail|outlook|yahoo|live|skynet|proximus|voo)\./.test(domaine)) score -= 1;

  return score;
}

function domaineDe(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Visite d'un site
// ---------------------------------------------------------------------------

type Reponse = { url: string; html: string } | null;

async function telecharger(url: string, timeoutMs: number): Promise<Reponse> {
  try {
    const reponse = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml" },
    });
    if (!reponse.ok) return null;
    const type = reponse.headers.get("content-type") ?? "";
    if (type && !/text\/html|application\/xhtml/.test(type)) return null;
    return { url: reponse.url, html: await reponse.text() };
  } catch {
    return null;
  }
}

/// robots.txt du site, réduit aux chemins interdits à « User-agent: * ».
/// Un cache par origine évite de le redemander à chaque page visitée.
const robotsParOrigine = new Map<string, Promise<string[]>>();

async function cheminsInterdits(origine: string, timeoutMs: number): Promise<string[]> {
  let cache = robotsParOrigine.get(origine);
  if (!cache) {
    cache = (async () => {
      const reponse = await telecharger(`${origine}/robots.txt`, timeoutMs).catch(() => null);
      const texte = reponse?.html ?? "";
      const interdits: string[] = [];
      let concerne = false;
      for (const ligne of texte.split("\n")) {
        const l = ligne.split("#")[0].trim();
        const ua = /^user-agent:\s*(.+)$/i.exec(l);
        if (ua) {
          concerne = ua[1].trim() === "*";
          continue;
        }
        const dis = /^disallow:\s*(.*)$/i.exec(l);
        if (dis && concerne && dis[1].trim()) interdits.push(dis[1].trim());
      }
      return interdits;
    })();
    robotsParOrigine.set(origine, cache);
  }
  return cache;
}

function autorise(url: string, interdits: string[]): boolean {
  try {
    const chemin = new URL(url).pathname;
    return !interdits.some((i) => chemin.startsWith(i));
  } catch {
    return false;
  }
}

const MOTS_CONTACT =
  /contact|coordonn|nous-joindre|nous_joindre|joindre|direction|secretariat|secr[ée]tariat|infos?[-_]?pratiques|qui-sommes|l-ecole|notre-ecole|equipe|inscription/i;

/// Liens internes de la page d'accueil qui ressemblent à une page de contact,
/// dans l'ordre où on veut les visiter.
function liensContact(html: string, base: string): string[] {
  const candidats: { url: string; poids: number }[] = [];
  const vus = new Set<string>();

  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{0,120}?)<\/a>/gi)) {
    const [, href, libelle] = m;
    if (/^(mailto:|tel:|javascript:|#)/i.test(href)) continue;
    const texte = libelle.replace(/<[^>]+>/g, " ");
    if (!MOTS_CONTACT.test(href) && !MOTS_CONTACT.test(texte)) continue;

    let absolu: string;
    try {
      absolu = new URL(href, base).toString().split("#")[0];
    } catch {
      continue;
    }
    if (domaineDe(absolu) !== domaineDe(base)) continue;
    if (vus.has(absolu)) continue;
    vus.add(absolu);

    // « contact » l'emporte sur « notre école » : les pages génériques ne sont
    // visitées que s'il reste du budget.
    const poids = /contact|coordonn|joindre/i.test(`${href} ${texte}`) ? 2 : 1;
    candidats.push({ url: absolu, poids });
  }

  return candidats.sort((a, b) => b.poids - a.poids).map((c) => c.url);
}

type ResultatSite = {
  emails: { email: string; score: number }[];
  pagesVisitees: string[];
  erreur: string | null;
};

async function collecterSurSite(
  siteUrl: string,
  options: { timeoutMs: number; maxPages: number }
): Promise<ResultatSite> {
  const pagesVisitees: string[] = [];
  const trouves = new Map<string, number>();

  const accueil = await telecharger(siteUrl, options.timeoutMs);
  if (!accueil) return { emails: [], pagesVisitees, erreur: "site injoignable" };
  pagesVisitees.push(accueil.url);

  const domaineSite = domaineDe(accueil.url);
  const origine = new URL(accueil.url).origin;
  const interdits = await cheminsInterdits(origine, options.timeoutMs);

  const enregistrer = (html: string) => {
    for (const email of normaliserEmails(html)) {
      const score = scorer(email, domaineSite);
      trouves.set(email, Math.max(trouves.get(email) ?? -Infinity, score));
    }
  };
  enregistrer(accueil.html);

  // On s'arrête dès qu'une adresse convaincante est trouvée : inutile de
  // charger trois pages de plus pour confirmer direction@ecole.be.
  const convaincante = () => [...trouves.values()].some((s) => s >= 7);

  for (const lien of liensContact(accueil.html, accueil.url)) {
    if (pagesVisitees.length >= options.maxPages || convaincante()) break;
    if (!autorise(lien, interdits)) continue;
    const page = await telecharger(lien, options.timeoutMs);
    if (!page) continue;
    pagesVisitees.push(page.url);
    enregistrer(page.html);
  }

  const emails = [...trouves.entries()]
    .map(([email, score]) => ({ email, score }))
    .sort((a, b) => b.score - a.score || a.email.localeCompare(b.email));

  return { emails, pagesVisitees, erreur: emails.length === 0 ? "aucune adresse trouvée" : null };
}

// ---------------------------------------------------------------------------
// Recherche du site des écoles qui n'en ont pas dans l'annuaire
// ---------------------------------------------------------------------------

// Annuaires, réseaux sociaux et agrégateurs : ils citent l'école sans être son
// site, et leurs adresses de contact sont les leurs, pas celles de la direction.
const DOMAINES_NON_ECOLE =
  /(enseignement\.be|facebook|instagram|linkedin|twitter|x\.com|youtube|wikipedia|pagesdor|pagesjaunes|infobel|cylex|goldenpages|kompass|trouverunecole|schoolsofbelgium|editus|mappy|google\.|bing\.|duckduckgo)/i;

async function chercherSite(
  ecole: LigneCsv,
  timeoutMs: number
): Promise<{ url: string | null; erreur: string | null }> {
  const requete = `${ecole.nom} ${ecole.code_postal} ${ecole.ville} école site officiel`;
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(requete)}`;
  const reponse = await telecharger(url, timeoutMs);
  if (!reponse) return { url: null, erreur: "recherche indisponible" };

  for (const m of reponse.html.matchAll(/href="(\/\/duckduckgo\.com\/l\/\?uddg=[^"]+)"/g)) {
    const brut = decodeURIComponent(/uddg=([^&]+)/.exec(m[1])?.[1] ?? "");
    if (!brut) continue;
    const domaine = domaineDe(brut);
    if (!domaine || DOMAINES_NON_ECOLE.test(domaine)) continue;
    return { url: `https://${domaine}/`, erreur: null };
  }
  return { url: null, erreur: "aucun site trouvé" };
}

// ---------------------------------------------------------------------------
// Programme
// ---------------------------------------------------------------------------

type Options = {
  fichier: string;
  rapport: string;
  limite: number | null;
  concurrence: number;
  timeoutMs: number;
  maxPages: number;
  recherche: boolean;
  niveau: string | null;
};

function lireOptions(argv: string[]): Options {
  const valeur = (nom: string): string | undefined => {
    const prefixe = `--${nom}=`;
    return argv.find((a) => a.startsWith(prefixe))?.slice(prefixe.length);
  };
  const present = (nom: string) => argv.some((a) => a === `--${nom}` || a.startsWith(`--${nom}=`));

  return {
    fichier: valeur("fichier") ?? FICHIER_DEFAUT,
    rapport: valeur("rapport") ?? RAPPORT_DEFAUT,
    limite: valeur("limite") ? Number(valeur("limite")) : null,
    // Quatre sites différents en parallèle : la charge par serveur reste d'une
    // requête à la fois, ce qui est l'essentiel pour des hébergements d'école.
    concurrence: valeur("concurrence") ? Number(valeur("concurrence")) : 4,
    timeoutMs: valeur("timeout") ? Number(valeur("timeout")) : 15000,
    maxPages: valeur("pages") ? Number(valeur("pages")) : 4,
    recherche: present("recherche"),
    niveau: valeur("niveau") ?? null,
  };
}

const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type LigneRapport = {
  nom: string;
  niveau: string;
  site_web: string;
  origine_site: string;
  email_retenu: string;
  score: string;
  autres_candidats: string;
  pages_visitees: string;
  statut: string;
};

async function main() {
  const options = lireOptions(process.argv.slice(2));
  const contenu = fs.readFileSync(options.fichier, "utf8");
  const colonnes = colonnesDe(contenu);
  const lignes = lireCsv(contenu);

  if (!colonnes.includes("email_source")) colonnes.push("email_source");

  const aTraiterTout = lignes.filter(
    (l) =>
      !EMAIL_VALIDE.test(l.email_direction ?? "") &&
      (!options.niveau || l.niveau === options.niveau) &&
      (options.recherche || (l.site_web ?? "").trim() !== "")
  );
  const aTraiter = options.limite ? aTraiterTout.slice(0, options.limite) : aTraiterTout;

  const avecSite = aTraiter.filter((l) => (l.site_web ?? "").trim() !== "").length;
  console.log(`Fichier      : ${path.relative(RACINE, options.fichier)}`);
  console.log(`Sans adresse : ${lignes.filter((l) => !EMAIL_VALIDE.test(l.email_direction ?? "")).length}`);
  console.log(`À visiter    : ${aTraiter.length} (${avecSite} avec site connu, ${aTraiter.length - avecSite} à rechercher)`);
  console.log(`Concurrence  : ${options.concurrence}, timeout ${options.timeoutMs} ms, ${options.maxPages} pages max par site\n`);

  const rapport: LigneRapport[] = [];
  let index = 0;
  let traites = 0;
  let remplis = 0;

  async function travailleur() {
    while (index < aTraiter.length) {
      const ligne = aTraiter[index++];
      const numero = ++traites;

      let site = (ligne.site_web ?? "").trim();
      let origineSite = site ? "annuaire" : "";
      let erreur: string | null = null;

      if (!site && options.recherche) {
        const recherche = await chercherSite(ligne, options.timeoutMs);
        site = recherche.url ?? "";
        origineSite = site ? "recherche" : "";
        erreur = recherche.erreur;
      }

      if (!site) {
        rapport.push({
          nom: ligne.nom, niveau: ligne.niveau, site_web: "", origine_site: "",
          email_retenu: "", score: "", autres_candidats: "", pages_visitees: "",
          statut: erreur ?? "pas de site",
        });
        continue;
      }

      const resultat = await collecterSurSite(site, options);
      const meilleur = resultat.emails[0];

      if (meilleur) {
        ligne.email_direction = meilleur.email;
        ligne.email_source = origineSite === "recherche" ? "site trouvé par recherche" : "site officiel";
        if (!ligne.site_web) ligne.site_web = site;
        remplis++;
      }

      rapport.push({
        nom: ligne.nom,
        niveau: ligne.niveau,
        site_web: site,
        origine_site: origineSite,
        email_retenu: meilleur?.email ?? "",
        score: meilleur ? String(meilleur.score) : "",
        autres_candidats: resultat.emails.slice(1, 6).map((e) => `${e.email} (${e.score})`).join(" | "),
        pages_visitees: resultat.pagesVisitees.length ? String(resultat.pagesVisitees.length) : "",
        statut: meilleur ? "trouvé" : resultat.erreur ?? "aucune adresse",
      });

      const etat = meilleur ? `✓ ${meilleur.email}` : `· ${resultat.erreur}`;
      console.log(`  [${numero}/${aTraiter.length}] ${etat} — ${ligne.nom}`);
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, options.concurrence) }, () => travailleur())
  );

  fs.writeFileSync(options.fichier, ecrireCsv(colonnes, lignes), "utf8");
  const colonnesRapport = [
    "nom", "niveau", "site_web", "origine_site", "email_retenu", "score",
    "autres_candidats", "pages_visitees", "statut",
  ];
  fs.writeFileSync(
    options.rapport,
    ecrireCsv(colonnesRapport, rapport as unknown as LigneCsv[]),
    "utf8"
  );

  const restant = lignes.filter((l) => !EMAIL_VALIDE.test(l.email_direction ?? "")).length;
  console.log(`\n${remplis} adresse(s) ajoutée(s) sur ${aTraiter.length} école(s) visitée(s).`);
  console.log(`Écoles encore sans adresse : ${restant}`);
  console.log(`Fichier mis à jour : ${path.relative(RACINE, options.fichier)}`);
  console.log(`Rapport            : ${path.relative(RACINE, options.rapport)}`);
}

main().catch((erreur) => {
  console.error(erreur);
  process.exit(1);
});
