// ---------------------------------------------------------------------------
// scripts/inviter-directions.ts
// Campagne d'invitation des directions d'école listées dans
// data/prospection-ecoles.csv (export de l'annuaire public de la Fédération
// Wallonie-Bruxelles, colonne « email_direction » à compléter).
//
//   npm run invitations                      # simulation, rien n'est envoyé
//   npm run invitations -- --apercu          # écrit un aperçu HTML de l'email
//   npm run invitations -- --envoyer --limite=25
//   npm run invitations -- --inclure-a-verifier   # y compris les adresses douteuses
//
// Rien ne part sans --envoyer. Chaque envoi est journalisé au fil de l'eau
// dans data/prospection-journal.csv : relancer la commande reprend là où elle
// s'était arrêtée, sans jamais réécrire à une adresse déjà servie.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";
import {
  buildDirectionInvitation,
  buildPoInvitation,
  type InvitationContent,
  type InvitedSchool,
} from "../lib/invitation-directions";
import { echapperCsv, lireCsv } from "../lib/prospection-csv";
import { escapeHtml } from "../lib/email-template";
import { chargerEnvLocal } from "../lib/env-local";

const RACINE = path.resolve(__dirname, "..");
const APERCU_DEFAUT = path.join(RACINE, "data/apercu-invitation.html");

/// Deux campagnes distinctes : les directions d'école, et les pouvoirs
/// organisateurs qui les chapeautent (cf. scripts/pouvoirs-organisateurs.ts).
/// Fichiers, colonnes et texte de l'invitation diffèrent ; le reste — journal,
/// simulation, espacement, désinscription — est commun.
type Profil = {
  fichier: string;
  journal: string;
  email: string;
  nom: string;
  contenu: (ligne: Record<string, string>, baseUrl: string, contactEmail: string) => InvitationContent;
  decrire: (ligne: Record<string, string>) => string;
};

const PROFILS: Record<string, Profil> = {
  ecoles: {
    fichier: path.join(RACINE, "data/prospection-ecoles.csv"),
    journal: path.join(RACINE, "data/prospection-journal.csv"),
    email: "email_direction",
    nom: "nom",
    contenu: (r, baseUrl, contactEmail) =>
      buildDirectionInvitation({
        school: {
          nom: r.nom ?? "",
          ville: r.ville ?? "",
          codePostal: r.code_postal ?? "",
          reseau: r.reseau ?? "",
          niveau: r.niveau ?? "",
        } satisfies InvitedSchool,
        baseUrl,
        contactEmail,
      }),
    decrire: (r) => `${r.nom} (${r.code_postal} ${r.ville})`,
  },
  po: {
    fichier: path.join(RACINE, "data/prospection-po.csv"),
    journal: path.join(RACINE, "data/prospection-po-journal.csv"),
    email: "email_po",
    nom: "nom_po",
    contenu: (r, baseUrl, contactEmail) =>
      buildPoInvitation({
        po: {
          nom: r.nom_po ?? "",
          localite: r.localite ?? "",
          nbEcoles: Number(r.nb_ecoles ?? "1") || 1,
          // Le collège communal exerce le pouvoir organisateur : l'invitation
          // s'adresse alors à l'échevin·e de l'enseignement.
          estCommune: (r.reseaux ?? "").includes("Subventionné communal"),
        },
        baseUrl,
        contactEmail,
      }),
    decrire: (r) => `${r.nom_po} — ${r.nb_ecoles} école(s)`,
  },
};

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
  profil: Profil;
  fichier: string;
  journal: string;
  envoyer: boolean;
  /// Inclure malgré tout les adresses marquées par verifier-adresses.
  inclureAVerifier: boolean;
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

  const nomProfil = valeur("profil") ?? "ecoles";
  const profil = PROFILS[nomProfil];
  if (!profil) {
    console.error(`Profil inconnu : ${nomProfil} (attendu : ${Object.keys(PROFILS).join(", ")})`);
    process.exit(1);
  }

  return {
    profil,
    fichier: valeur("fichier") ?? profil.fichier,
    journal: valeur("journal") ?? profil.journal,
    envoyer: present("envoyer"),
    inclureAVerifier: present("inclure-a-verifier"),
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
  chargerEnvLocal(RACINE);
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

  const { profil } = options;
  const ecoles = lignes.filter((r) => !options.niveau || r.niveau === options.niveau);
  const sansEmail = ecoles.filter((r) => !EMAIL_VALIDE.test(r[profil.email] ?? ""));

  // Une même adresse peut couvrir plusieurs implantations : on n'écrit qu'une
  // fois, en gardant la première école rencontrée comme référence.
  const vues = new Set<string>();
  // Écartées d'office : les adresses que scripts/verifier-adresses.ts a
  // marquées comme n'étant vraisemblablement pas celles d'une direction —
  // service provincial, fédération de réseau, adresse partagée par des écoles
  // sans lien. Le message est écrit pour un directeur ; l'envoyer ailleurs
  // brûle une adresse sans convaincre personne. `--inclure-a-verifier` passe
  // outre, une fois la colonne relue.
  const aVerifier = ecoles.filter(
    (r) => EMAIL_VALIDE.test(r[profil.email] ?? "") && (r.verification ?? "").trim() !== ""
  );
  const destinataires = ecoles.filter((r) => {
    const email = (r[profil.email] ?? "").toLowerCase();
    if (!EMAIL_VALIDE.test(email) || vues.has(email) || dejaServis.has(email)) return false;
    if (!options.inclureAVerifier && (r.verification ?? "").trim() !== "") return false;
    vues.add(email);
    return true;
  });

  const aTraiter = options.limite ? destinataires.slice(0, options.limite) : destinataires;

  console.log(`Fichier          : ${path.relative(RACINE, options.fichier)}`);
  console.log(`Destinataires    : ${ecoles.length}${options.niveau ? ` (niveau ${options.niveau})` : ""}`);
  console.log(`Sans adresse     : ${sansEmail.length}`);
  console.log(`Déjà invitées    : ${dejaServis.size}`);
  if (aVerifier.length > 0) {
    console.log(
      `À vérifier       : ${aVerifier.length}${options.inclureAVerifier ? " (incluses)" : " (écartées)"}`
    );
  }
  console.log(`À inviter        : ${destinataires.length}${aTraiter.length !== destinataires.length ? ` (limité à ${aTraiter.length})` : ""}`);
  console.log(`Lien d'inscription : ${options.baseUrl}/creer-ecole`);


  if (options.apercu) {
    const modele = aTraiter[0] ?? ecoles[0];
    if (!modele) {
      console.error("Fichier vide : rien à prévisualiser.");
      process.exit(1);
    }
    const contenu = profil.contenu(modele, options.baseUrl, options.contactEmail);
    // Le corps de l'email est un fragment — pas de <html>, pas de <head> : dans
    // un message, l'encodage est porté par l'en-tête MIME, que nodemailer fixe
    // à utf-8. Ouvert comme un simple fichier, ce fragment ne dit rien de son
    // encodage et le navigateur devine, généralement en latin-1 : les accents
    // partent alors en « Ã© ». L'aperçu, et lui seul, est donc enveloppé dans un
    // document minimal qui le déclare.
    const page = [
      "<!doctype html>",
      '<html lang="fr">',
      "<head>",
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      `<title>Aperçu — ${escapeHtml(contenu.subject)}</title>`,
      "</head>",
      "<body style=\"margin:0;background:#fafaf9;\">",
      `<p style="margin:0;padding:12px;font:13px/1.5 system-ui,sans-serif;color:#78716c;">`,
      `Objet : <strong style="color:#1c1917;">${escapeHtml(contenu.subject)}</strong>`,
      "</p>",
      contenu.html,
      "</body>",
      "</html>",
    ].join("\n");
    fs.writeFileSync(options.apercu, page, "utf8");
    console.log(`\nAperçu écrit     : ${path.relative(RACINE, options.apercu)}`);
    console.log(`Objet            : ${contenu.subject}`);
  }

  if (!options.envoyer) {
    console.log(`\nSimulation — rien n'a été envoyé. Ajoutez --envoyer pour lancer la campagne.`);
    for (const r of aTraiter.slice(0, 10)) {
      console.log(`  · ${r[profil.email]} — ${profil.decrire(r)}`);
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
    const email = r[profil.email].toLowerCase();
    const contenu = profil.contenu(r, options.baseUrl, options.contactEmail);

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
        ecole: r[profil.nom] ?? "",
        date: new Date().toISOString(),
        statut: "envoye",
        detail: "",
      });
      console.log(`  ✓ ${email} — ${r[profil.nom]}`);
    } catch (erreur) {
      echecs++;
      const detail = erreur instanceof Error ? erreur.message : String(erreur);
      journaliser(options.journal, {
        email,
        ecole: r[profil.nom] ?? "",
        date: new Date().toISOString(),
        statut: "echec",
        detail,
      });
      console.error(`  ✗ ${email} — ${r[profil.nom]} : ${detail}`);
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
