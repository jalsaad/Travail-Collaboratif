import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LogoHomeLink } from "@/components/logo-home-link";
import {
  CONSERVATION,
  DEVELOPPEMENT,
  PRESTATAIRES,
  PRIVACY_POLICY_VERSION,
  RESPONSABLE,
  politiqueIncomplete,
} from "@/lib/privacy-policy";

// Politique de confidentialité publique (RGPD art. 5.1.a et 13), liée depuis
// la case à cocher de chaque formulaire d'inscription (cf.
// components/privacy-policy-checkbox.tsx).
//
// Chaque affirmation de ce texte doit correspondre au code : ce qui est
// collecté (prisma/schema.prisma), ce qui figure sur les relevés
// (lib/export-identity.ts), ce que la suppression efface
// (lib/account-deletion.ts). Toute évolution de l'un de ces points impose de
// revoir ce texte ET d'incrémenter PRIVACY_POLICY_VERSION.

export function generateMetadata(): Metadata {
  return {
    title: "Politique de confidentialité — Travail Collaboratif",
    // Un brouillon aux mentions manquantes n'a rien à faire dans un moteur de
    // recherche.
    robots: politiqueIncomplete() ? { index: false, follow: false } : undefined,
  };
}

/// Mention obligatoire encore inconnue : affichée comme telle, jamais devinée.
function AFaire({ quoi }: { quoi: string }) {
  return (
    <mark className="rounded bg-amber-100 px-1 font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
      [à compléter : {quoi}]
    </mark>
  );
}

function Valeur({ valeur, quoi }: { valeur: string | null; quoi: string }) {
  return valeur === null ? <AFaire quoi={quoi} /> : <>{valeur}</>;
}

function Section({ id, titre, children }: { id?: string; titre: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 space-y-3">
      <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">{titre}</h2>
      {children}
    </section>
  );
}

function dateVersion(): string {
  return new Date(`${PRIVACY_POLICY_VERSION}T12:00:00`).toLocaleDateString("fr-BE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ConfidentialitePage() {
  const brouillon = politiqueIncomplete();

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-10 dark:bg-stone-950">
      <article className="mx-auto max-w-3xl space-y-8 rounded-2xl border border-stone-200 bg-white p-6 text-sm leading-relaxed text-stone-700 sm:p-10 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300">
        <header className="flex flex-col items-center gap-3 text-center">
          <LogoHomeLink />
          <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
            Politique de confidentialité
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400">Version du {dateVersion()}</p>
        </header>

        {brouillon && (
          <div
            role="alert"
            className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
          >
            <strong>Document en cours de finalisation.</strong> Certaines mentions obligatoires,
            signalées ci-dessous, restent à compléter.
          </div>
        )}

        <p>
          Travail Collaboratif est une plateforme gratuite qui permet aux membres du personnel des
          écoles de la Fédération Wallonie-Bruxelles de déclarer leurs périodes de travail
          collaboratif, de les faire valider par les collègues concernés et d&apos;en remettre le
          relevé à leur direction. Cette page vous explique, avant toute inscription, quelles données
          nous traitons, pourquoi, et quels sont vos droits (Règlement général sur la protection des
          données — RGPD, articles 5.1.a et 13).
        </p>

        <Section titre="1. Qui est responsable de vos données ?">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Responsable du traitement : <Valeur valeur={RESPONSABLE.nom} quoi="nom" />
            </li>
            <li>
              Adresse : <Valeur valeur={RESPONSABLE.adresse} quoi="adresse postale" />
            </li>
            <li>Conception et développement de la plateforme : {DEVELOPPEMENT}</li>
            <li>
              Contact pour toute question ou demande :{" "}
              {RESPONSABLE.email === null ? (
                <AFaire quoi="adresse email de contact" />
              ) : (
                <a href={`mailto:${RESPONSABLE.email}`} className="text-brand-700 underline dark:text-brand-400">
                  {RESPONSABLE.email}
                </a>
              )}
            </li>
            <li>
              Délégué à la protection des données :{" "}
              {RESPONSABLE.dpo === null ? (
                <AFaire quoi="DPO désigné ou non" />
              ) : RESPONSABLE.dpo === false ? (
                "aucun délégué n'a été désigné ; adressez-vous au contact ci-dessus."
              ) : (
                RESPONSABLE.dpo
              )}
            </li>
          </ul>
        </Section>

        <Section titre="2. Quelles données sont traitées ?">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Identité et compte</strong> : prénom, nom, adresse email, mot de passe (conservé
              uniquement sous forme d&apos;empreinte chiffrée, jamais en clair), date de dernière
              connexion.
            </li>
            <li>
              <strong>Identification administrative</strong> : sexe, date de naissance et 4 derniers
              chiffres du numéro de matricule, qui forment ensemble votre numéro de matricule complet
              (voir la section 4).
            </li>
            <li>
              <strong>Rattachement à une école</strong> : école, fonction, niveaux enseignés et
              heures par semaine, disciplines.
            </li>
            <li>
              <strong>Activité</strong> : périodes de travail collaboratif déclarées (date, horaires,
              durée, nature, description, pièces jointes éventuelles), participants et validations.
            </li>
            <li>
              <strong>Collègues que vous invitez</strong> : nom et, le cas échéant, adresse email,
              utilisés uniquement pour leur adresser l&apos;invitation.
            </li>
            <li>
              <strong>Assistance et avis</strong> : demandes adressées au support (avec pièce
              jointe éventuelle) et note de satisfaction si vous en donnez une.
            </li>
            <li>
              <strong>Sécurité</strong> : journal des actions sensibles (création de compte,
              rattachement, export…), avec leur auteur et leur date.
            </li>
          </ul>
          <p>
            Seuls des cookies strictement nécessaires sont utilisés : maintien de votre session et
            mémorisation de l&apos;école active. Aucun cookie publicitaire ni outil de mesure
            d&apos;audience.
          </p>
        </Section>

        <Section titre="3. Pourquoi et sur quelle base ?">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Fournir le service que vous demandez</strong> — créer votre compte, déclarer
              et valider des périodes, calculer votre suivi annuel, produire les relevés remis à
              votre direction, envoyer les emails qui en découlent (invitation, demande de
              validation, information de la direction de l&apos;école lorsqu&apos;un nouveau membre
              la rejoint). Base : exécution du service demandé (art. 6.1.b RGPD).
            </li>
            <li>
              <strong>Assurer la sécurité de la plateforme</strong> et pouvoir retracer les actions
              sensibles en cas de litige ou d&apos;abus. Base : intérêt légitime à protéger les
              comptes et l&apos;intégrité des relevés (art. 6.1.f RGPD).
            </li>
          </ul>
          <p>
            La case cochée à l&apos;inscription atteste que vous avez reçu cette information. Elle
            n&apos;est pas un consentement : le traitement repose sur les bases ci-dessus. Vos
            données ne sont ni vendues, ni utilisées à des fins publicitaires, ni employées à
            d&apos;autres fins que celles décrites ici.
          </p>
        </Section>

        <Section id="matricule" titre="4. Sexe, date de naissance et matricule : pourquoi ces informations ?">
          <p>
            Les relevés de travail collaboratif que vous remettez à votre direction vous identifient
            par <strong>votre nom et votre numéro de matricule</strong>, l&apos;identifiant qui vous
            désigne auprès de l&apos;administration de l&apos;enseignement de la Fédération
            Wallonie-Bruxelles. Il permet à la direction de rattacher sans ambiguïté le relevé à la
            bonne personne, même en cas d&apos;homonymie.
          </p>
          <p>Ce numéro de 11 chiffres est construit ainsi :</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>1 chiffre pour le sexe (1 pour un homme, 2 pour une femme) ;</li>
            <li>6 chiffres pour la date de naissance (année sur 2 chiffres, mois, jour) ;</li>
            <li>4 chiffres propres à chaque personne, que vous encodez vous-même.</li>
          </ul>
          <p>
            C&apos;est pourquoi nous vous demandons votre sexe et votre date de naissance : la
            plateforme en déduit les 7 premiers chiffres, et vous n&apos;avez à saisir que les 4
            derniers. Cela évite les erreurs de recopie d&apos;un long numéro, qui rendraient vos
            relevés inexploitables. Le matricule est aussi unique par compte, ce qui empêche
            l&apos;ouverture de deux comptes pour une même personne.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Ce qui figure sur les relevés</strong> : votre nom, votre prénom et votre
              numéro de matricule. Votre sexe et votre date de naissance n&apos;y apparaissent pas en
              tant que tels, mais le matricule, par sa construction même, les contient.
            </li>
            <li>
              <strong>Un second usage, pour le sexe uniquement</strong> : la formule de politesse
              (« Madame » ou « Monsieur ») employée dans les emails de la plateforme, y compris ceux
              qui vous mentionnent auprès de collègues ou de la direction de votre école.
            </li>
            <li>
              <strong>Aucun autre usage</strong> : ni statistique par sexe ou par âge, ni profilage,
              ni transmission à qui que ce soit en dehors des relevés.
            </li>
            <li>
              <strong>Qui les voit</strong> : vous-même, depuis votre profil, et l&apos;équipe
              d&apos;administration de la plateforme lorsqu&apos;elle doit corriger un compte. La
              direction de votre école voit votre matricule sur les relevés ; ni elle ni vos
              collègues ne voient votre sexe ou votre date de naissance en tant que tels.
            </li>
          </ul>
          <p>
            Ces trois informations sont obligatoires : sans elles, votre matricule ne peut être
            établi et vos relevés ne pourraient pas être remis à votre direction.
          </p>
        </Section>

        <Section titre="5. Qui a accès à vos données ?">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Les membres de votre école</strong>, chacun selon son rôle : vos collègues voient
              votre nom sur les périodes qui les concernent ; la direction de l&apos;école voit les
              membres rattachés, leurs périodes et leurs relevés. Les membres des autres écoles
              n&apos;ont accès à rien.
            </li>
            <li>
              <strong>L&apos;équipe d&apos;administration de la plateforme</strong>, pour
              l&apos;assistance, la validation des écoles et la correction des comptes.
            </li>
            <li>
              <strong>Nos prestataires techniques</strong>, qui agissent uniquement sur nos
              instructions :
              <ul className="mt-1 list-[circle] space-y-1 pl-5">
                <li>
                  hébergement du serveur et de la base de données :{" "}
                  <Valeur valeur={PRESTATAIRES.hebergement} quoi="hébergeur et pays" />
                </li>
                <li>
                  envoi des emails : <Valeur valeur={PRESTATAIRES.email} quoi="service d'envoi des emails" />
                </li>
                <li>
                  stockage des fichiers (logos, pièces jointes) :{" "}
                  <Valeur valeur={PRESTATAIRES.stockage} quoi="service de stockage ou serveur" />
                </li>
              </ul>
            </li>
          </ul>
          <p>
            Transfert de données hors de l&apos;Union européenne :{" "}
            <Valeur valeur={PRESTATAIRES.transfertHorsUE} quoi="aucun, ou lesquels et avec quelles garanties" />
          </p>
        </Section>

        <Section titre="6. Combien de temps sont-elles conservées ?">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Données du compte : <Valeur valeur={CONSERVATION.compte} quoi="durée de conservation des comptes" />
            </li>
            <li>
              Relevés archivés en fin d&apos;année scolaire :{" "}
              <Valeur valeur={CONSERVATION.archives} quoi="durée de conservation des archives" />
            </li>
          </ul>
          <p>
            Lorsqu&apos;un compte est supprimé et qu&apos;il n&apos;a laissé aucune trace dans le
            travail d&apos;autrui, il est entièrement effacé. S&apos;il a pris part à des périodes
            collaboratives, celles-ci sont conservées, car elles font partie des relevés de vos
            collègues : le compte est alors <strong>anonymisé</strong> — nom, prénom, adresse email,
            mot de passe, sexe, date de naissance et matricule sont effacés et remplacés par la
            mention « Compte supprimé ».
          </p>
          <p>
            Les archives de fin d&apos;année scolaire (nom, adresse email, matricule et périodes des
            participants) ne sont pas modifiées par la suppression d&apos;un compte : elles sont
            conservées pendant la durée indiquée ci-dessus, puis supprimées.
          </p>
        </Section>

        <Section titre="7. Vos droits">
          <p>Vous pouvez à tout moment demander :</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>l&apos;accès à vos données et une copie de celles-ci ;</li>
            <li>la rectification de données inexactes (une partie est modifiable depuis votre profil) ;</li>
            <li>l&apos;effacement de vos données, dans les conditions décrites à la section 6 ;</li>
            <li>la limitation du traitement ;</li>
            <li>la portabilité des données que vous avez fournies ;</li>
            <li>
              de vous opposer au traitement fondé sur l&apos;intérêt légitime (section 3), pour des
              raisons tenant à votre situation particulière.
            </li>
          </ul>
          <p>
            Adressez votre demande à{" "}
            {RESPONSABLE.email === null ? (
              <AFaire quoi="adresse email de contact" />
            ) : (
              <a href={`mailto:${RESPONSABLE.email}`} className="text-brand-700 underline dark:text-brand-400">
                {RESPONSABLE.email}
              </a>
            )}
            . Une réponse vous est apportée dans un délai d&apos;un mois, prolongeable de deux mois
            pour une demande complexe (art. 12.3 RGPD). Une preuve d&apos;identité peut être
            demandée en cas de doute raisonnable.
          </p>
          <p>
            Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une plainte
            auprès de l&apos;<strong>Autorité de protection des données</strong>, rue de la Presse
            35, 1000 Bruxelles —{" "}
            <a
              href="https://www.autoriteprotectiondonnees.be"
              target="_blank"
              rel="noopener"
              className="text-brand-700 underline dark:text-brand-400"
            >
              www.autoriteprotectiondonnees.be
            </a>
            .
          </p>
        </Section>

        <Section titre="8. Données obligatoires et décisions automatisées">
          <p>
            Les champs demandés à l&apos;inscription sont tous nécessaires au fonctionnement du
            service : sans eux, le compte ne peut pas être créé. Les informations facultatives
            (pièces jointes, note de satisfaction…) sont signalées comme telles.
          </p>
          <p>
            Aucune décision produisant des effets juridiques à votre égard n&apos;est prise sur la
            seule base d&apos;un traitement automatisé (art. 22 RGPD). Les calculs de suivi annuel
            sont une aide : la validation des périodes relève des collègues concernés, et
            l&apos;usage des relevés, de votre direction.
          </p>
        </Section>

        <Section titre="9. Sécurité">
          <p>
            Les mots de passe ne sont jamais conservés en clair, l&apos;accès aux données est
            cloisonné par école et par rôle, et les actions sensibles sont journalisées.
          </p>
        </Section>

        <Section titre="10. Modifications de cette politique">
          <p>
            Toute modification substantielle donne lieu à une nouvelle version datée. La version
            dont vous avez pris connaissance est enregistrée avec votre compte.
          </p>
        </Section>
      </article>
    </div>
  );
}
