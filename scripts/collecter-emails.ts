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
import { chargerEnvLocal } from "../lib/env-local";

const RACINE = path.resolve(__dirname, "..");

/// Le même robot sert deux fichiers aux colonnes différentes : les écoles et
/// leurs pouvoirs organisateurs (cf. scripts/pouvoirs-organisateurs.ts). Seuls
/// changent les noms de colonnes et ce qui fait une bonne adresse — chez une
/// commune, c'est le service enseignement, pas la « direction ».
type Profil = {
  fichier: string;
  rapport: string;
  nom: string;
  ville: string;
  codePostal: string;
  email: string;
  /// Libellés prioritaires propres au profil, avant le classement commun.
  prioritaires: RegExp | null;
  /// Mots supplémentaires pour repérer les liens vers la page de contact.
  liens: RegExp | null;
  /// N'accepter que les adresses hébergées sur le domaine du site visité.
  /// Indispensable pour les communes : leur page d'accueil ne publie pas
  /// d'adresse, et le seul email du pied de page est celui de l'agence web qui
  /// a réalisé le site. Les écoles, elles, écrivent légitimement depuis un
  /// autre domaine (brucity.education, une boîte communale mutualisée...).
  memeDomaine: boolean;
  /// Budget de pages : un site communal enfouit ses contacts plus profond que
  /// le site d'une école.
  pages: number;
  /// En deçà de ce score, aucune adresse n'est retenue — elles restent
  /// visibles dans le rapport. Une commune publie beaucoup d'adresses de
  /// services sans rapport avec l'enseignement : mieux vaut ne rien écrire que
  /// d'écrire à la voirie.
  scoreMinimum: number;
  /// Mots dont la présence autour d'une adresse la désigne comme la bonne.
  /// Pour une commune, le PO est le collège communal et l'interlocuteur est
  /// l'échevin·e de l'enseignement : son adresse est une adresse nominative
  /// que rien, dans son libellé, ne distingue — seul son voisinage dans la
  /// page la trahit.
  contexte: { mots: RegExp; bonus: number }[] | null;
};

const PROFILS: Record<string, Profil> = {
  ecoles: {
    fichier: path.join(RACINE, "data/prospection-ecoles.csv"),
    rapport: path.join(RACINE, "data/collecte-rapport.csv"),
    nom: "nom",
    ville: "ville",
    codePostal: "code_postal",
    email: "email_direction",
    prioritaires: null,
    liens: null,
    memeDomaine: false,
    pages: 4,
    scoreMinimum: Number.NEGATIVE_INFINITY,
    contexte: null,
  },
  po: {
    fichier: path.join(RACINE, "data/prospection-po.csv"),
    rapport: path.join(RACINE, "data/collecte-po-rapport.csv"),
    nom: "nom_po",
    ville: "localite",
    codePostal: "code_postal",
    email: "email_po",
    prioritaires: /^(enseignement|instruction|affaires?[._-]?scolaires?|servicescolaire|ecoles)/,
    liens: /enseignement|instruction-publique|affaires-scolaires|scolaire|academi|college-communal|colleges?-et-conseil|echevin|mandataire|autorites|bourgmestre/i,
    memeDomaine: true,
    pages: 9,
    scoreMinimum: 5,
    contexte: [
      { mots: /[ée]chevin/i, bonus: 8 },
      { mots: /enseignement|instruction publique|affaires scolaires/i, bonus: 8 },
    ],
  },
};

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
  "group.calendar.google.com", "calendar.google.com", "sentry.io", "wixpress.com", "wix.com", "example.com", "domain.com", "email.com",
  "godaddy.com", "squarespace.com", "jimdo.com", "weebly.com", "joomla.org",
  "wordpress.org", "wordpress.com", "sitew.com", "e-monsite.com", "webnode.com",
];
const LOCALES_EXCLUES =
  /^(no-?reply|noreply|donotreply|webmaster|postmaster|abuse|support|sales|billing|hostmaster|mailer-daemon)$/i;
// Délégué à la protection des données, service juridique : présents sur les
// sites de pouvoirs organisateurs, mais ce ne sont pas des interlocuteurs.
const ROLES_EXCLUS = /(^|[._-])(dpo|rgpd|gdpr|privacy|juridique|legal)([._-]|$)/i;
// Adresses de démonstration laissées par le thème du site : elles ressemblent
// à s'y méprendre à une vraie adresse de contact.
const ADRESSES_FICTIVES =
  /^(john|jane)\.?(doe)?@|^(prenom|nom)\.(nom|prenom)@|^(votre|your)[-_.]?(e?mail|nom)@|^(exemple|example|test|demo|sample|user|name|email|mail|adresse|address|contact)@(exemple|example|test|demo|domain|domaine|mail|email|site|monsite|votresite)\./i;

/// Le domaine suffit à trancher, quelle que soit la partie locale : aucune
/// école n'écrit depuis « domaine.com ». La règle ci-dessus exigeait que les
/// DEUX moitiés soient reconnues, et « utilisateur@domaine.com » — la
/// traduction française de « user@ », absente de la liste — est passée jusqu'à
/// l'envoi.
const DOMAINES_FICTIFS =
  /@(exemple|example|domaine|domain|mondomaine|votredomaine|monsite|votresite|site|test|demo|localhost)\./i;

function estFictive(email: string): boolean {
  return ADRESSES_FICTIVES.test(email) || DOMAINES_FICTIFS.test(email);
}

/// Beaucoup de sites d'école encodent l'arobase (&#64;, &commat;, %40) pour
/// échapper aux robots collecteurs. On décode avant d'extraire, sinon les
/// pages les plus soigneuses sont justement celles qu'on rate.
function decoderEntites(html: string): string {
  return html
    .replace(/&#(\d{2,5});/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]{2,4});/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&commat;/gi, "@")
    .replace(/&period;/gi, ".")
    .replace(/&amp;/gi, "&")
    .replace(/%40/g, "@")
    // Séparateurs encodés dans les liens mailto (« tel:071%7C02%7Cmail@… ») :
    // sans les décoder, ils se collent au début de l'adresse extraite.
    .replace(/%7c/gi, "|");
}

// Extensions réellement rencontrées chez les écoles belges, plus les ccTLD à
// deux lettres. Sans cette liste, du CSS minifié produit des « adresses »
// comme specs.stores.fix@navigation.sposition — deux mots collés autour d'un
// point que la regex prend pour un domaine.
const EXTENSIONS = new Set([
  "be", "com", "net", "org", "eu", "info", "biz", "education", "brussels",
  "school", "academy", "edu", "site", "online", "cloud", "wallonie", "team",
  "pro", "coop", "tech", "institute",
]);

// Accepter n'importe quelle extension de deux lettres laissait passer des
// mots coupés en deux : « qualific@ion.ue » vient d'un « qualification.ue »
// dans du texte compacté, et « .ue » n'existe pas.
const EXTENSIONS_PAYS = new Set([
  "be", "fr", "nl", "lu", "de", "uk", "ie", "es", "it", "pt", "ch", "at", "dk",
  "se", "no", "fi", "pl", "cz", "ca", "us", "io", "co", "me", "tv",
]);

function extensionPlausible(domaine: string): boolean {
  const extension = domaine.split(".").pop() ?? "";
  return EXTENSIONS.has(extension) || EXTENSIONS_PAYS.has(extension);
}

/// Texte de la page, balises retirées : les distances mesurées dans le HTML
/// brut n'ont pas de sens, un tableau de mandataires met des centaines de
/// caractères de balisage entre un nom et son adresse.
function enTexte(html: string): string {
  return decoderEntites(html)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
}

// Mentions de pied de page des prestataires : « réalisé par », « powered by »,
// « webdesign ». L'adresse qui les accompagne est celle de l'agence qui a fait
// le site, jamais celle de l'établissement — c'est le faux positif le plus
// coûteux, puisqu'il vise une entreprise privée au lieu d'une école.
const MENTION_PRESTATAIRE =
  /((r[ée]alis|con[çc]u|con[çc]ept|d[ée]velopp|cr[ée]ation|int[ée]gration|design|h[ée]berg)[a-zé]*(\s+et\s+[a-zé]+)?\s+par)|powered\s+by|design(ed)?\s+by|webdesign|web\s?agency|agence\s+(web|de\s+communication)|webmaster\s*[:\-–]?\s|cr[ée]dits?\s*[:\-–]/gi;

/// Bonus accordé à une adresse selon ce qui l'entoure dans la page. La fenêtre
/// est étroite à dessein : sur une page « collège communal », chaque échevin·e
/// a son bloc, et une fenêtre large les confondrait tous.
/// Sentinelle : l'adresse est celle d'un prestataire, elle ne doit jamais être
/// retenue quel que soit son libellé par ailleurs.
const PRESTATAIRE = Number.NEGATIVE_INFINITY;

/// Ce qui suit une mention de prestataire, compacté (« Conception et
/// développement par cropmark » → « ...parcropmark »). On raisonne sur le nom
/// du prestataire et non sur son adresse : celle-ci ne figure souvent que dans
/// un attribut HTML, hors du texte, alors que son nom est toujours écrit en
/// toutes lettres — et « Caravane Média » y devient « caravanemedia », soit
/// exactement le domaine de son adresse.
function signaturesDePrestataires(texte: string): string[] {
  const signatures: string[] = [];
  for (const mention of texte.matchAll(MENTION_PRESTATAIRE)) {
    const debut = mention.index ?? 0;
    signatures.push(texte.slice(debut, debut + 160).replace(/[^a-z0-9]+/g, ""));
  }
  return signatures;
}

/// Nom de domaine réduit à son radical : « info@caravanemedia.com » → « caravanemedia ».
function radicalDeDomaine(email: string): string {
  const domaine = email.split("@")[1] ?? "";
  const parties = domaine.split(".");
  return (parties.length > 2 ? parties[parties.length - 2] : parties[0] ?? "").replace(
    /[^a-z0-9]/g,
    ""
  );
}

function bonusDeContexte(
  texte: string,
  email: string,
  contexte: { mots: RegExp; bonus: number }[]
): number {
  const FENETRE = 260;
  let meilleur = 0;
  let depuis = 0;
  let vue = false;
  for (;;) {
    const position = texte.toLowerCase().indexOf(email, depuis);
    if (position === -1) break;
    vue = true;
    depuis = position + email.length;
    const voisinage = texte.slice(
      Math.max(0, position - FENETRE),
      position + email.length + FENETRE
    );
    // Une seule occurrence dans une mention de prestataire suffit à disqualifier
    // l'adresse : elle n'apparaîtra pas ailleurs pour de bonnes raisons.
    if (MENTION_PRESTATAIRE.test(voisinage)) return PRESTATAIRE;
    const total = contexte.reduce((acc, c) => acc + (c.mots.test(voisinage) ? c.bonus : 0), 0);
    meilleur = Math.max(meilleur, total);
  }
  return vue ? meilleur : 0;
}

function normaliserEmails(html: string): string[] {
  const trouves = new Set<string>();
  const texte = decoderEntites(html);

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
    if (LOCALES_EXCLUES.test(locale) || ROLES_EXCLUS.test(locale)) return false;
    if (DOMAINES_EXCLUS.some((d) => domaine === d || domaine.endsWith(`.${d}`))) return false;
    if (estFictive(e)) return false;
    // Identifiant technique plutôt qu'adresse : un agenda partagé, une clé
    // d'API. Aucune boîte réelle n'a un libellé de quarante caractères.
    if (locale.length > 40 || /[0-9a-f]{24,}/i.test(locale)) return false;
    return extensionPlausible(domaine);
  });
}

/// Deux adresses valent mieux l'une que l'autre : celle de la direction ou du
/// secrétariat, sur le domaine du site de l'école, plutôt qu'une adresse
/// personnelle d'enseignant ou une boîte hébergée ailleurs.
/// Deux domaines de la même institution : identiques, sous-domaine, ou même
/// nom sous une autre extension (anderlecht.be / anderlecht.brussels).
function memeMaison(domaine: string, domaineSite: string | null): boolean {
  if (!domaineSite) return false;
  if (domaine === domaineSite || domaine.endsWith(`.${domaineSite}`)) return true;
  const radical = domaineSite.replace(/\.[a-z.]+$/, "");
  return radical.length >= 4 && domaine.replace(/\.[a-z.]+$/, "").endsWith(radical);
}

function scorer(email: string, domaineSite: string | null, prioritaires: RegExp | null): number {
  const [locale, domaine] = email.split("@");
  let score = 0;

  // Un service enseignement communal prime sur le « info@ » de la commune.
  if (prioritaires?.test(locale)) score += 8;

  // « préfet des études » et « proviseur » sont les intitulés de direction du
  // secondaire en Fédération Wallonie-Bruxelles : ils valent « direction ».
  if (/^direction|^dir\b|^directeur|^directrice|^prefet|^préfet|^proviseur/.test(locale)) score += 6;
  else if (/^secretariat|^secretaire|^secr/.test(locale)) score += 5;
  else if (/^(info|contact|ecole|college|athenee|institut|administration|admin)/.test(locale)) score += 4;
  else if (/^(inscription|inscriptions|accueil)/.test(locale)) score += 2;

  if (memeMaison(domaine, domaineSite)) score += 3;
  else if (domaineSite) score -= 1;

  // Boîtes grand public : fréquentes et légitimes dans le fondamental, mais à
  // ne retenir qu'à défaut d'une adresse sur le domaine de l'école.
  if (/(gmail|hotmail|outlook|yahoo|live|skynet|proximus|voo)\./.test(domaine)) score -= 1;

  // À libellé équivalent, la direction passe avant son adjoint·e.
  if (/adjoint/.test(locale)) score -= 1;
  // Services annexes et associations : ce sont des boîtes de l'école, mais pas
  // celles qui reçoivent une proposition institutionnelle.
  if (/internat|cantine|refectoire|parents|amicale|anciens|bibliotheque|pms/.test(locale)) score -= 3;

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

async function telecharger(url: string, timeoutMs: number, essai = 0): Promise<Reponse> {
  try {
    const reponse = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml" },
    });
    // 429/503 : hébergement mutualisé qui nous freine. Un seul réessai, après
    // une pause — insister davantage serait s'acharner sur un serveur qui dit
    // déjà non.
    if ((reponse.status === 429 || reponse.status === 503) && essai === 0) {
      await new Promise((r) => setTimeout(r, 3000));
      return telecharger(url, timeoutMs, 1);
    }
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
function liensContact(html: string, base: string, motsEnPlus: RegExp | null): string[] {
  const candidats: { url: string; poids: number }[] = [];
  const vus = new Set<string>();

  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{0,120}?)<\/a>/gi)) {
    const [, href, libelle] = m;
    if (/^(mailto:|tel:|javascript:|#)/i.test(href)) continue;
    const texte = libelle.replace(/<[^>]+>/g, " ");
    const pertinent = (v: string) => MOTS_CONTACT.test(v) || (motsEnPlus?.test(v) ?? false);
    if (!pertinent(href) && !pertinent(texte)) continue;

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
    const cible = `${href} ${texte}`;
    const poids = motsEnPlus?.test(cible) ? 3 : /contact|coordonn|joindre/i.test(cible) ? 2 : 1;
    candidats.push({ url: absolu, poids });
  }

  return candidats.sort((a, b) => b.poids - a.poids).map((c) => c.url);
}

type Candidate = { email: string; score: number };

type ResultatSite = {
  /// Adresses retenues, dans l'ordre de préférence : la première est celle qui
  /// sera écrite dans le fichier.
  retenues: Candidate[];
  /// Toutes les adresses vues, y compris celles écartées par le profil. Le
  /// rapport les montre : une collecte qui ne dit pas ce qu'elle a jeté n'est
  /// pas relisable.
  vues: Candidate[];
  pagesVisitees: string[];
  erreur: string | null;
};

async function collecterSurSite(
  siteUrl: string,
  options: { timeoutMs: number; maxPages: number; profil: Profil }
): Promise<ResultatSite> {
  const pagesVisitees: string[] = [];
  const trouves = new Map<string, number>();

  const accueil = await telecharger(siteUrl, options.timeoutMs);
  if (!accueil) return { retenues: [], vues: [], pagesVisitees, erreur: "site injoignable" };
  pagesVisitees.push(accueil.url);

  const domaineSite = domaineDe(accueil.url);
  const origine = new URL(accueil.url).origin;
  const interdits = await cheminsInterdits(origine, options.timeoutMs);

  const enregistrer = (html: string) => {
    // Le texte est calculé même sans contexte propre au profil : le malus
    // « prestataire » vaut pour toutes les campagnes.
    const texte = enTexte(html).toLowerCase();
    const signatures = signaturesDePrestataires(texte);
    for (const email of normaliserEmails(html)) {
      const radical = radicalDeDomaine(email);
      // Le domaine de l'établissement lui-même n'est jamais disqualifié : une
      // école qui a réalisé son site en interne se citerait dans son propre
      // pied de page.
      const prestataire =
        radical.length >= 4 &&
        !memeMaison(email.split("@")[1], domaineSite) &&
        signatures.some((signature) => signature.includes(radical));

      const bonus = bonusDeContexte(texte, email, options.profil.contexte ?? []);
      const score =
        prestataire || bonus === PRESTATAIRE
          ? PRESTATAIRE
          : scorer(email, domaineSite, options.profil.prioritaires) + bonus;
      trouves.set(email, Math.max(trouves.get(email) ?? -Infinity, score));
    }
  };
  enregistrer(accueil.html);

  // On s'arrête dès qu'une adresse convaincante est trouvée : inutile de
  // charger trois pages de plus pour confirmer direction@ecole.be.
  const seuilConvaincant = options.profil.contexte ? 14 : 7;
  const convaincante = () => [...trouves.values()].some((s) => s >= seuilConvaincant);

  // Quand aucun lien ne se signale comme page de contact, on tente les
  // chemins conventionnels : beaucoup de sites les servent sans les exposer
  // dans un menu analysable (navigation en JavaScript).
  // Les chemins conventionnels sont tentés après les liens réellement trouvés,
  // et non seulement à défaut : un menu en JavaScript peut fournir dix liens
  // sans jamais exposer /contact, qui existe pourtant (cas de wbe.be).
  const liens = liensContact(accueil.html, accueil.url, options.profil.liens);
  const conventionnels = ["contact", "contact.html", "nous-contacter", "index.php/contact"].map(
    (c) => new URL(c, accueil.url).toString()
  );
  // /contact passe en tête : quand la page d'accueil expose déjà neuf liens
  // « plausibles », le budget s'épuise avant d'y arriver alors que c'est la
  // page la plus rentable.
  const aTenter = [...new Set([conventionnels[0], ...liens, ...conventionnels.slice(1)])];

  for (const lien of aTenter) {
    if (pagesVisitees.length >= options.maxPages || convaincante()) break;
    if (!autorise(lien, interdits)) continue;
    const page = await telecharger(lien, options.timeoutMs);
    if (!page) continue;
    pagesVisitees.push(page.url);
    enregistrer(page.html);
  }

  const parPreference = (a: Candidate, b: Candidate) =>
    b.score - a.score || a.email.length - b.email.length || a.email.localeCompare(b.email);

  const vues = [...trouves.entries()]
    .map(([email, score]) => ({ email, score }))
    .sort(parPreference);

  const retenues = vues.filter(({ email, score }) => {
    if (score === PRESTATAIRE) return false;
    if (score < options.profil.scoreMinimum) return false;
    if (!options.profil.memeDomaine || !domaineSite) return true;
    return memeMaison(email.split("@")[1], domaineSite);
  });

  const erreur =
    retenues.length > 0
      ? null
      : vues.length > 0
        ? "candidates écartées (voir le rapport)"
        : "aucune adresse trouvée";

  return { retenues, vues, pagesVisitees, erreur };
}

// ---------------------------------------------------------------------------
// Recherche du site des écoles qui n'en ont pas dans l'annuaire
// ---------------------------------------------------------------------------

// Annuaires, réseaux sociaux et agrégateurs : ils citent l'école sans être son
// site, et leurs adresses de contact sont les leurs, pas celles de la direction.
const DOMAINES_NON_ECOLE =
  /(enseignement\.be|facebook|instagram|linkedin|twitter|x\.com|youtube|wikipedia|pagesdor|pagesjaunes|infobel|cylex|goldenpages|kompass|trouverunecole|schoolsofbelgium|editus|mappy|google\.|bing\.|duckduckgo)/i;

/// Recherche du site officiel d'une école via l'API Brave Search (offre
/// gratuite : une clé sur api.search.brave.com, 2 000 requêtes par mois).
///
/// Pas de scraping de moteur de recherche ici : DuckDuckGo, Mojeek et
/// Startpage interdisent tous « /search » dans leur robots.txt et répondent
/// par un contrôle anti-robot. Sans clé, l'option --recherche s'arrête au lieu
/// de passer outre.
async function chercherSite(
  ecole: LigneCsv,
  timeoutMs: number
): Promise<{ url: string | null; erreur: string | null }> {
  const cle = process.env.BRAVE_SEARCH_API_KEY;
  if (!cle) return { url: null, erreur: "clé de recherche absente" };

  const requete = `${ecole.nom ?? ecole.nom_po} ${ecole.code_postal} ${ecole.ville ?? ecole.localite} site officiel`;
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(requete)}&country=be&count=5`;

  try {
    const reponse = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { accept: "application/json", "x-subscription-token": cle },
    });
    if (!reponse.ok) return { url: null, erreur: `recherche ${reponse.status}` };

    const donnees = (await reponse.json()) as { web?: { results?: { url?: string }[] } };
    for (const resultat of donnees.web?.results ?? []) {
      const domaine = resultat.url ? domaineDe(resultat.url) : null;
      if (!domaine || DOMAINES_NON_ECOLE.test(domaine)) continue;
      return { url: `https://${domaine}/`, erreur: null };
    }
    return { url: null, erreur: "aucun site trouvé" };
  } catch (erreur) {
    return { url: null, erreur: erreur instanceof Error ? erreur.message : "recherche en échec" };
  }
}

// ---------------------------------------------------------------------------
// Programme
// ---------------------------------------------------------------------------

type Options = {
  profil: Profil;
  fichier: string;
  rapport: string;
  limite: number | null;
  concurrence: number;
  timeoutMs: number;
  maxPages: number;
  recherche: boolean;
  /// Revisite aussi les écoles déjà pourvues d'une adresse, pour reconstituer
  /// la liste des candidates. Ne réécrit jamais « email_direction » : une case
  /// déjà remplie l'a été à la main ou par un passage précédent, validé depuis.
  toutes: boolean;
  niveau: string | null;
};

function lireOptions(argv: string[]): Options {
  const valeur = (nom: string): string | undefined => {
    const prefixe = `--${nom}=`;
    return argv.find((a) => a.startsWith(prefixe))?.slice(prefixe.length);
  };
  const present = (nom: string) => argv.some((a) => a === `--${nom}` || a.startsWith(`--${nom}=`));

  const nomProfil = valeur("profil") ?? "ecoles";
  const profil = PROFILS[nomProfil];
  if (!profil) {
    console.error(`Profil inconnu : ${nomProfil} (attendu : ${Object.keys(PROFILS).join(", ")})`);
    process.exit(1);
  }

  return {
    profil,
    fichier: valeur("fichier") ?? profil.fichier,
    rapport: valeur("rapport") ?? profil.rapport,
    limite: valeur("limite") ? Number(valeur("limite")) : null,
    // Quatre sites différents en parallèle : la charge par serveur reste d'une
    // requête à la fois, ce qui est l'essentiel pour des hébergements d'école.
    concurrence: valeur("concurrence") ? Number(valeur("concurrence")) : 4,
    timeoutMs: valeur("timeout") ? Number(valeur("timeout")) : 15000,
    maxPages: valeur("pages") ? Number(valeur("pages")) : profil.pages,
    recherche: present("recherche"),
    toutes: present("toutes"),
    niveau: valeur("niveau") ?? null,
  };
}

const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type LigneRapport = {
  nom: string;
  code_postal: string;
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
  chargerEnvLocal(RACINE);
  const options = lireOptions(process.argv.slice(2));
  const contenu = fs.readFileSync(options.fichier, "utf8");
  const colonnes = colonnesDe(contenu);
  const lignes = lireCsv(contenu);

  const { profil } = options;
  if (!colonnes.includes("email_source")) colonnes.push("email_source");

  const aTraiterTout = lignes.filter(
    (l) =>
      (options.toutes || !EMAIL_VALIDE.test(l[profil.email] ?? "")) &&
      (!options.niveau || l.niveau === options.niveau) &&
      ((options.recherche && !!process.env.BRAVE_SEARCH_API_KEY) ||
        (l.site_web ?? "").trim() !== "")
  );
  const aTraiter = options.limite ? aTraiterTout.slice(0, options.limite) : aTraiterTout;

  if (options.recherche && !process.env.BRAVE_SEARCH_API_KEY) {
    console.log(
      "--recherche demande une clé BRAVE_SEARCH_API_KEY (offre gratuite sur api.search.brave.com).\n" +
        "Sans elle, seules les écoles dont l'annuaire donne déjà le site sont visitées.\n"
    );
  }

  const avecSite = aTraiter.filter((l) => (l.site_web ?? "").trim() !== "").length;
  console.log(`Fichier      : ${path.relative(RACINE, options.fichier)}`);
  console.log(`Sans adresse : ${lignes.filter((l) => !EMAIL_VALIDE.test(l[profil.email] ?? "")).length}`);
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
          nom: ligne[profil.nom], code_postal: ligne[profil.codePostal], niveau: ligne.niveau ?? "", site_web: "", origine_site: "",
          email_retenu: "", score: "", autres_candidats: "", pages_visitees: "",
          statut: erreur ?? "pas de site",
        });
        continue;
      }

      const resultat = await collecterSurSite(site, { ...options, profil });
      const meilleur = resultat.retenues[0];

      if (meilleur && !EMAIL_VALIDE.test(ligne[profil.email] ?? "")) {
        ligne[profil.email] = meilleur.email;
        ligne.email_source = origineSite === "recherche" ? "site trouvé par recherche" : "site officiel";
        if (!ligne.site_web) ligne.site_web = site;
        remplis++;
      }

      rapport.push({
        nom: ligne[profil.nom],
        code_postal: ligne[profil.codePostal],
        niveau: ligne.niveau ?? "",
        site_web: site,
        origine_site: origineSite,
        email_retenu: meilleur?.email ?? "",
        score: meilleur ? String(meilleur.score) : "",
        autres_candidats: resultat.vues
          .filter((c) => c.email !== meilleur?.email)
          .slice(0, 6)
          .map((c) => `${c.email} (${c.score === PRESTATAIRE ? "prestataire" : c.score})`)
          .join(" | "),
        pages_visitees: resultat.pagesVisitees.length ? String(resultat.pagesVisitees.length) : "",
        statut: meilleur ? "trouvé" : resultat.erreur ?? "aucune adresse",
      });

      const etat = meilleur ? `✓ ${meilleur.email}` : `· ${resultat.erreur}`;
      console.log(`  [${numero}/${aTraiter.length}] ${etat} — ${ligne[profil.nom]}`);
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, options.concurrence) }, () => travailleur())
  );

  fs.writeFileSync(options.fichier, ecrireCsv(colonnes, lignes), "utf8");
  const colonnesRapport = [
    "nom", "code_postal", "niveau", "site_web", "origine_site", "email_retenu", "score",
    "autres_candidats", "pages_visitees", "statut",
  ];

  // Le rapport est cumulatif : une deuxième passe ne porte que sur les écoles
  // restées sans adresse, et ne doit pas effacer le détail des précédentes.
  const cle = (l: LigneCsv) => `${l.nom}|${l.code_postal}`;
  const fusion = new Map<string, LigneCsv>();
  if (fs.existsSync(options.rapport)) {
    for (const ancienne of lireCsv(fs.readFileSync(options.rapport, "utf8"))) {
      fusion.set(cle(ancienne), ancienne);
    }
  }
  for (const nouvelle of rapport as unknown as LigneCsv[]) fusion.set(cle(nouvelle), nouvelle);

  fs.writeFileSync(options.rapport, ecrireCsv(colonnesRapport, [...fusion.values()]), "utf8");

  const restant = lignes.filter((l) => !EMAIL_VALIDE.test(l[profil.email] ?? "")).length;
  console.log(`\n${remplis} adresse(s) ajoutée(s) sur ${aTraiter.length} école(s) visitée(s).`);
  console.log(`Écoles encore sans adresse : ${restant}`);
  console.log(`Fichier mis à jour : ${path.relative(RACINE, options.fichier)}`);
  console.log(`Rapport            : ${path.relative(RACINE, options.rapport)}`);
}

main().catch((erreur) => {
  console.error(erreur);
  process.exit(1);
});
