// ---------------------------------------------------------------------------
// scripts/inviter-directions.ts
// Campagne d'invitation des directions d'école listées dans
// data/prospection-ecoles.csv (export de l'annuaire public de la Fédération
// Wallonie-Bruxelles, colonne « email_direction » à compléter).
//
//   npm run invitations                      # simulation, rien n'est envoyé
//   npm run invitations -- --apercu          # écrit un aperçu HTML de l'email
//   npm run invitations -- --envoyer --limite=25
//
// Rien ne part sans --envoyer. Chaque envoi est journalisé au fil de l'eau
// dans data/prospection-journal.csv : relancer la commande reprend là où elle
// s'était arrêtée, sans jamais réécrire à une adresse déjà servie.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";
import { buildDirectionInvitation, type InvitedSchool } from "../lib/invitation-directions";
import { echapperCsv, lireCsv } from "../lib/prospection-csv";

const RACINE = path.resolve(__dirname, "..");
const FICHIER_DEFAUT = path.join(RACINE, "data/prospection-ecoles.csv");
const JOURNAL_DEFAUT = path.join(RACINE, "data/prospection-journal.csv");
const APERCU_DEFAUT = path.join(RACINE, "data/apercu-invitation.html");

// ---------------------------------------------------------------------------
// Environnement
// ---------------------------------------------------------------------------

// ts-node ne passe pas par le chargement d'environnement de Next : on lit .env
// à la main plutôt que d'ajouter une dépendance pour six lignes.
function chargerEnv() {
  const fichier = path.join(RACINE, ".env");
  if (!fs.existsSync(fichier)) return;
  for (const ligne of fs.readFileSync(fichier, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(ligne);
    if (!m) continue;
    const valeur = m[2].trim().replace(/^["'](.*)["']$/, "$1");
    if (process.env[m[1]] === undefined) process.env[m[1]] = valeur;
  }
}

const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ---------------------------------------------------------------------------
// Journal des envois
// ---------------------------------------------------------------------------

type EntreeJournal = { email: string; ecole: string; date: string; statut: string; detail: string };

function lireJournal(chemin: string): EntreeJournal[] {
  if (!fs.existsSync(chemin)) return [];
  return lireCsv(fs.readFileSync(chemin, "utf8")).map((r) => ({
    email: (r.email ?? "").toLowerCase(),
    ecole: r.ecole ?? "",
    date: r.date ?? "",
    statut: r.statut ?? "",
    detail: r.detail ?? "",
  }));
}

/// Écrit une ligne par envoi, immédiatement : une coupure au milieu d'une
/// campagne de plusieurs centaines d'emails ne doit pas faire perdre la trace
/// de ce qui est déjà parti.
function journaliser(chemin: string, entree: EntreeJournal) {
  if (!fs.existsSync(chemin)) {
    fs.writeFileSync(chemin, "email;ecole;date;statut;detail\n", "utf8");
  }
  const ligne = [entree.email, entree.ecole, entree.date, entree.statut, entree.detail]
    .map(echapperCsv)
    .join(";");
  fs.appendFileSync(chemin, `${ligne}\n`, "utf8");
}

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

type Options = {
  fichier: string;
  journal: string;
  envoyer: boolean;
  apercu: string | null;
  limite: number | null;
  delaiMs: number;
  niveau: string | null;
  baseUrl: string;
  contactEmail: string;
  from: string;
};

function lireOptions(argv: string[]): Options {
  const valeur = (nom: string): string | undefined => {
    const prefixe = `--${nom}=`;
    const trouve = argv.find((a) => a.startsWith(prefixe));
    return trouve?.slice(prefixe.length);
  };
  const present = (nom: string) => argv.some((a) => a === `--${nom}` || a.startsWith(`--${nom}=`));

  return {
    fichier: valeur("fichier") ?? FICHIER_DEFAUT,
    journal: valeur("journal") ?? JOURNAL_DEFAUT,
    envoyer: present("envoyer"),
    apercu: present("apercu") ? valeur("apercu") ?? APERCU_DEFAUT : null,
    limite: valeur("limite") ? Number(valeur("limite")) : null,
    // Un envoi lent passe mieux les filtres anti-spam qu'une rafale, et laisse
    // le temps d'interrompre la campagne si la première réponse est mauvaise.
    delaiMs: valeur("delai") ? Number(valeur("delai")) : 4000,
    niveau: valeur("niveau") ?? null,
    baseUrl: (process.env.APP_ORIGIN || "https://travail-collaboratif.be").replace(/\/$/, ""),
    contactEmail: process.env.PLATFORM_NOTIFICATION_EMAIL || "admin@travail-collaboratif.be",
    from: process.env.SMTP_FROM || "Travail Collaboratif <no-reply@travail-collaboratif.be>",
  };
}

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Campagne
// ---------------------------------------------------------------------------

async function main() {
  chargerEnv();
  const options = lireOptions(process.argv.slice(2));

  if (!fs.existsSync(options.fichier)) {
    console.error(`Fichier introuvable : ${options.fichier}`);
    process.exit(1);
  }

  const lignes = lireCsv(fs.readFileSync(options.fichier, "utf8"));
  const dejaServis = new Set(
    lireJournal(options.journal)
      .filter((e) => e.statut === "envoye")
      .map((e) => e.email)
  );

  const ecoles = lignes.filter((r) => !options.niveau || r.niveau === options.niveau);
  const sansEmail = ecoles.filter((r) => !EMAIL_VALIDE.test(r.email_direction ?? ""));

  // Une même adresse peut couvrir plusieurs implantations : on n'écrit qu'une
  // fois, en gardant la première école rencontrée comme référence.
  const vues = new Set<string>();
  const destinataires = ecoles.filter((r) => {
    const email = (r.email_direction ?? "").toLowerCase();
    if (!EMAIL_VALIDE.test(email) || vues.has(email) || dejaServis.has(email)) return false;
    vues.add(email);
    return true;
  });

  const aTraiter = options.limite ? destinataires.slice(0, options.limite) : destinataires;

  console.log(`Fichier          : ${path.relative(RACINE, options.fichier)}`);
  console.log(`Écoles listées   : ${ecoles.length}${options.niveau ? ` (niveau ${options.niveau})` : ""}`);
  console.log(`Sans adresse     : ${sansEmail.length}`);
  console.log(`Déjà invitées    : ${dejaServis.size}`);
  console.log(`À inviter        : ${destinataires.length}${aTraiter.length !== destinataires.length ? ` (limité à ${aTraiter.length})` : ""}`);
  console.log(`Lien d'inscription : ${options.baseUrl}/creer-ecole`);

  const enEcole = (r: Record<string, string>): InvitedSchool => ({
    nom: r.nom ?? "",
    ville: r.ville ?? "",
    codePostal: r.code_postal ?? "",
    reseau: r.reseau ?? "",
    niveau: r.niveau ?? "",
  });

  if (options.apercu) {
    const modele = aTraiter[0] ?? ecoles[0];
    const contenu = buildDirectionInvitation({
      school: modele ? enEcole(modele) : {
        nom: "École fondamentale libre Saint-Michel",
        ville: "Charleroi",
        codePostal: "6044",
        reseau: "Libre confessionnel",
        niveau: "Fondamental",
      },
      baseUrl: options.baseUrl,
      contactEmail: options.contactEmail,
    });
    fs.writeFileSync(options.apercu, contenu.html, "utf8");
    console.log(`\nAperçu écrit     : ${path.relative(RACINE, options.apercu)}`);
    console.log(`Objet            : ${contenu.subject}`);
  }

  if (!options.envoyer) {
    console.log(`\nSimulation — rien n'a été envoyé. Ajoutez --envoyer pour lancer la campagne.`);
    for (const r of aTraiter.slice(0, 10)) {
      console.log(`  · ${r.email_direction} — ${r.nom} (${r.code_postal} ${r.ville})`);
    }
    if (aTraiter.length > 10) console.log(`  … et ${aTraiter.length - 10} autres.`);
    return;
  }

  if (!process.env.SMTP_HOST) {
    console.error("\nSMTP_HOST n'est pas configuré : impossible d'envoyer. Renseignez les SMTP_* dans .env.");
    process.exit(1);
  }
  if (aTraiter.length === 0) {
    console.log("\nAucun destinataire à traiter.");
    return;
  }

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
    // Une seule connexion réutilisée pour toute la campagne : les serveurs
    // sortants limitent le nombre de sessions bien avant le nombre de messages.
    pool: true,
    maxConnections: 1,
  });

  console.log(`\nEnvoi de ${aTraiter.length} invitation(s), une toutes les ${options.delaiMs} ms…\n`);
  let envoyes = 0;
  let echecs = 0;

  for (const [index, r] of aTraiter.entries()) {
    const email = r.email_direction.toLowerCase();
    const contenu = buildDirectionInvitation({
      school: enEcole(r),
      baseUrl: options.baseUrl,
      contactEmail: options.contactEmail,
    });

    try {
      await transport.sendMail({
        from: options.from,
        to: email,
        // Les réponses (questions, désinscriptions) doivent arriver sur une
        // boîte lue par un humain, pas sur le no-reply de la plateforme.
        replyTo: options.contactEmail,
        subject: contenu.subject,
        text: contenu.text,
        html: contenu.html,
        headers: { "List-Unsubscribe": contenu.listUnsubscribe },
      });
      envoyes++;
      journaliser(options.journal, {
        email,
        ecole: r.nom ?? "",
        date: new Date().toISOString(),
        statut: "envoye",
        detail: "",
      });
      console.log(`  ✓ ${email} — ${r.nom}`);
    } catch (erreur) {
      echecs++;
      const detail = erreur instanceof Error ? erreur.message : String(erreur);
      journaliser(options.journal, {
        email,
        ecole: r.nom ?? "",
        date: new Date().toISOString(),
        statut: "echec",
        detail,
      });
      console.error(`  ✗ ${email} — ${r.nom} : ${detail}`);
    }

    if (index < aTraiter.length - 1) await attendre(options.delaiMs);
  }

  transport.close();
  console.log(`\nTerminé : ${envoyes} envoyée(s), ${echecs} en échec.`);
  console.log(`Journal : ${path.relative(RACINE, options.journal)}`);
}

main().catch((erreur) => {
  console.error(erreur);
  process.exit(1);
});
