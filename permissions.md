# Règles d'autorisation

Ces règles s'appliquent en couche service (jamais seulement côté UI), sur base de `Membership` (rôle + école) plutôt que sur l'identité seule — un même utilisateur peut avoir des droits différents selon l'école où il agit.

## Matrice par rôle

| Action | Enseignant·e | Admin | Super Admin |
|---|---|---|---|
| Voir son propre espace / ses périodes | ✅ | ✅ | ✅ |
| Déclarer une période, se partager avec des collègues | ✅ | ✅ | ✅ (si aussi enseignant·e) |
| Confirmer/refuser sa participation à une période | ✅ (si tagué·e) | ✅ | ✅ |
| Exporter son propre relevé | ✅ | ✅ | ✅ |
| Voir le tableau de bord de l'école (tous les enseignants) | ❌ | ✅ | ✅ |
| Voir le détail des périodes d'un·e autre enseignant·e | ❌ | ✅ | ✅ |
| Exporter le relevé collectif de l'école (personne, lot de personnes, ou totalité — filtrable par période chronologique) | ❌ | ✅ | ✅ |
| Générer/régénérer le code de rattachement | ❌ | ✅ | ✅ |
| Inviter un membre, choisir son rôle | ❌ | ✅ | ✅ |
| Promouvoir/rétrograder Enseignant ↔ Référent numérique | ❌ | ✅ | ✅ |
| Retirer un membre (= « supprimer son compte » côté école) | ❌ | ✅ | ✅ |
| Modifier les données personnelles (nom, email) d'un·e enseignant·e | ❌ (sauf soi-même) | ✅ | ✅ |
| Personnaliser l'espace école (logo, coordonnées) | ❌ | ✅ | ✅ |
| Modifier/retirer le rôle Super Admin (titulaire du compte) | ❌ | ❌ | ❌ (verrouillé, `isAccountOwner`) |
| Voir le journal d'audit de l'école | ❌ | ✅ | ✅ |

Admin a donc les mêmes droits de gestion que Super Admin — c'est une délégation, pas un rôle allégé. Seul le compte `isAccountOwner: true` (créateur de l'espace, rôle Super Admin) est protégé contre le retrait ou la rétrogradation, pour éviter qu'une école se retrouve sans titulaire — et, de la même façon, personne d'autre que le titulaire lui-même ne peut modifier ses propres données personnelles.

**Plusieurs Admins par école** : rien dans le modèle ne limite `REFERENT_NUMERIQUE` (libellé affiché : « Admin ») à une seule personne par `School` — chaque `Membership` est indépendante, le Super Admin peut donc nommer autant d'Admins qu'il le souhaite parmi les enseignants (via « Inviter un membre » ou « Promouvoir » ci-dessus), chacun héritant des mêmes droits de gestion que le Super Admin sur cette école.

## Portes de connexion (`/login/profs` vs `/login/direction`)

Contrairement au reste de l'application, ce contrôle porte sur l'**authentification elle-même**, pas sur une action post-connexion : `app/(auth)/login/actions.ts` vérifie d'abord le mot de passe lui-même (`lib/verify-credentials.ts`, partagé avec l'`authorize()` du provider Credentials dans `auth.ts`), SANS appeler `signIn` — ce qui permet de connaître le rôle du compte avant d'établir la moindre session. Ce n'est que si le mot de passe est correct qu'on regarde si le compte a au moins une `Membership` `DIRECTION`/`REFERENT_NUMERIQUE` (ou `User.isSuperAdmin`) : sinon, pour la porte « Direction », on retourne directement un message d'erreur invitant à changer d'espace vers `/login/profs`, sans jamais appeler `signIn` (donc sans jamais créer de session à défaire). Chaîner `signIn()` puis `signOut()` dans la même Server Action ne fonctionne PAS de façon fiable ici : `signOut` relit les cookies de la requête entrante d'origine, pas la mutation que `signIn` vient de faire dans la même exécution, donc la session survit malgré le message d'erreur affiché — d'où le choix de ne jamais établir la session plutôt que de la défaire après coup.

L'ordre (vérifier le mot de passe d'abord, le rôle ensuite) évite un oracle de mot de passe : le message « ce compte n'a pas accès à l'espace Direction » n'est jamais atteignable sans un mot de passe correct, donc inutilisable pour deviner l'existence ou le rôle d'un compte à l'aveugle. La porte « Profs » n'a symétriquement aucune restriction : un compte Admin/Super Admin peut se connecter indifféremment par l'une ou l'autre porte (la destination post-connexion, `/ecole` ou `/mes-periodes`, reste dérivée du rôle réel, jamais de la porte empruntée).

## Règle centrale : cloisonnement inter-écoles

Une période inter-écoles est **un seul enregistrement** (`CollaborativePeriod`), mais chaque `PeriodParticipant` porte son propre `membershipId`. C'est ce champ, et non l'identité globale de l'utilisateur, qui détermine ce qu'une direction peut voir.

```ts
// Périodes visibles par une direction/référent numérique pour SON école,
// en ne remontant, pour les périodes inter-écoles, que la ligne de
// participation qui concerne son propre personnel.
async function getVisiblePeriodsForSchool(schoolId: string, schoolYearId: string) {
  return prisma.collaborativePeriod.findMany({
    where: {
      schoolYearId,
      participants: {
        some: { membership: { schoolId, status: "ACTIVE" } },
      },
    },
    include: {
      // Ne jamais faire un include global des participants ici : on
      // resélectionne uniquement ceux rattachés à schoolId.
      participants: {
        where: { membership: { schoolId } },
        include: { user: true },
      },
    },
  });
}
```

Point d'attention : le `include` filtré est indispensable. Un `include` non filtré exposerait les noms et statuts des participants d'une école tierce — exactement ce que la règle de cloisonnement interdit. Toute nouvelle requête touchant `PeriodParticipant` doit repartir de ce filtre, pas seulement l'écran actuel.

## Vérification d'accès à une action ponctuelle

```ts
async function assertCanManageSchool(userId: string, schoolId: string) {
  const membership = await prisma.membership.findUnique({
    where: { userId_schoolId: { userId, schoolId } },
  });
  if (!membership || membership.status !== "ACTIVE") {
    throw new ForbiddenError("Aucun rattachement actif à cette école.");
  }
  if (membership.role !== "DIRECTION" && membership.role !== "REFERENT_NUMERIQUE") {
    throw new ForbiddenError("Droits de gestion requis.");
  }
  return membership;
}

async function assertCanConfirmParticipation(userId: string, periodId: string) {
  const participant = await prisma.periodParticipant.findUnique({
    where: { periodId_userId: { periodId, userId } },
  });
  if (!participant) {
    throw new ForbiddenError("Vous n'êtes pas partie prenante de cette période.");
  }
  return participant;
}
```

## Gestion d'un compte enseignant par Super Admin/Admin

- **Modifier les données personnelles** (`firstName`, `lastName`, `email`) : réservé à `DIRECTION`/`REFERENT_NUMERIQUE` (libellés affichés : Super Admin/Admin) de l'école où le ciblé a une `Membership` `ACTIVE`, ou au titulaire du compte lui-même. Le mot de passe (`passwordHash`) reste hors de ce droit — ni consultable ni modifiable par un tiers, uniquement via le propre flux self-service de l'utilisateur (réinitialisation par email).
- **« Supprimer le compte »** d'un enseignant, du point de vue Super Admin/Admin, correspond au retrait déjà modélisé : passer sa `Membership` à `status = REMOVED` (+ `removedAt`). Ça ne supprime jamais le `User` — un enseignant partagé entre plusieurs écoles (cas Sophie) garde son compte et son accès aux écoles où il a encore une `Membership` `ACTIVE`. La suppression réelle du `User` n'est pas exposée à Super Admin/Admin : elle casserait l'historique (périodes, audit) et l'accès aux autres écoles.
- **Attention identité partagée** : `firstName`/`lastName`/`email` vivent sur `User`, pas sur `Membership` — une modification par l'école A se répercute donc aussi sur l'école B si l'enseignant y est aussi rattaché. Toute modification d'email doit déclencher une notification à l'ancienne ET à la nouvelle adresse (protection contre une prise de contrôle de compte), et être journalisée dans `AuditLog`.
- **Enseignant·e** : ne peut agir que sur son propre `User` (modifier ses propres nom/email/mot de passe). Aucune action sur le compte d'un·e collègue, même dans la même école.

```ts
async function assertCanEditMemberProfile(actorUserId: string, targetUserId: string, schoolId: string) {
  if (actorUserId === targetUserId) return; // chacun gère toujours ses propres données

  const actorMembership = await assertCanManageSchool(actorUserId, schoolId); // rôle DIRECTION/REFERENT_NUMERIQUE requis
  const targetMembership = await prisma.membership.findUnique({
    where: { userId_schoolId: { userId: targetUserId, schoolId } },
  });
  if (!targetMembership || targetMembership.status !== "ACTIVE") {
    throw new ForbiddenError("Cette personne n'est pas membre active de cette école.");
  }
  if (targetMembership.isAccountOwner) {
    throw new ForbiddenError("Le titulaire du compte ne peut modifier que ses propres données.");
  }
  return actorMembership;
}

// Retrait = suppression du compte côté école, mêmes gardes que l'édition de profil.
async function assertCanRemoveMember(actorUserId: string, targetUserId: string, schoolId: string) {
  await assertCanManageSchool(actorUserId, schoolId);
  const targetMembership = await prisma.membership.findUnique({
    where: { userId_schoolId: { userId: targetUserId, schoolId } },
  });
  if (!targetMembership || targetMembership.status !== "ACTIVE") {
    throw new ForbiddenError("Cette personne n'est pas membre active de cette école.");
  }
  if (targetMembership.isAccountOwner) {
    throw new ForbiddenError("Le titulaire du compte ne peut pas être retiré.");
  }
  // Application : status = "REMOVED", removedAt = now(), + AuditLog (action: "REMOVE_MEMBER")
}
```

## Personnalisation de l'espace école

Super Admin (et, par délégation, Admin) a un accès total en modification aux informations de **sa propre** école (`name`, `reseau`, `address`, `logoUrl`) — même garde que les autres actions de gestion, via `assertCanManageSchool` :

```ts
async function assertCanEditSchool(userId: string, schoolId: string) {
  return assertCanManageSchool(userId, schoolId); // rôle DIRECTION/REFERENT_NUMERIQUE requis
}
```

Point d'attention volontairement mis à part de ce « total accès » : `numeroFase` est le matricule officiel FASE de l'établissement (identifiant légal, contrainte `@unique`) — le laisser librement modifiable par une école risquerait une erreur de saisie créant un conflit d'unicité ou un décalage avec le registre officiel. Recommandation : garder ce champ en lecture seule côté Super Admin/Admin (modification réservée à l'administrateur plateforme, sur justificatif), le reste (nom affiché, réseau, adresse, logo) restant en édition libre comme demandé.

## Calcul du plafond des 2 périodes/semaine (multi-écoles)

À vérifier à la création d'une `AnnualAssignment` ou d'une période, pas seulement à l'affichage :

```ts
async function checkWeeklyCapForUser(userId: string, schoolYearId: string) {
  const assignments = await prisma.annualAssignment.findMany({
    where: { membership: { userId }, schoolYearId },
  });
  const totalPeriodesAn = assignments.reduce((s, a) => s + Number(a.objectifPeriodes), 0);
  const equivalentHebdo = totalPeriodesAn / 36; // ~36 semaines scolaires
  if (equivalentHebdo > 2) {
    // Ne bloque pas forcément l'enregistrement (la répartition se négocie
    // entre PO), mais doit déclencher une alerte visible direction + enseignant.
    return { withinCap: false, equivalentHebdo };
  }
  return { withinCap: true, equivalentHebdo };
}
```

## Exports (relevés PDF)

Même garde que le reste de l'espace Super Admin/Admin — `assertCanManageSchool` pour l'export collectif (`app/api/export/school`), aucune vérification de rôle supplémentaire pour l'export individuel (`app/api/export/mine` — n'importe quel membre actif peut exporter son propre relevé, cohérent avec la matrice "Exporter son propre relevé" ✅ pour les trois rôles). Chaque téléchargement crée un `ExportLog` (traçabilité), avec `fileUrl` pointant vers la route de génération elle-même (avec ses query params, donc les filtres utilisés) plutôt qu'un fichier persisté : aucun stockage fichier n'est en place, retélécharger le même lien régénère le relevé à partir des données actuelles (informatif, comme le plafond hebdomadaire ci-dessus — pas un instantané figé au moment de l'export).

- **Filtre chronologique** (`start`/`end`, optionnels) : les deux routes acceptent une borne de dates sur `CollaborativePeriod.date`, sans restriction implicite à l'année scolaire en cours — un relevé sans bornes couvre tout l'historique. Bornes journalisées dans `ExportLog.rangeStart`/`rangeEnd`.
- **Portée de l'export collectif** (`app/api/export/school`) : Super Admin/Admin choisit, via une sélection de personnes côté formulaire (`userIds`), d'exporter **une personne**, **un lot de plusieurs personnes**, ou **toute l'école** (aucune personne cochée). La portée effective (`ExportScope.INDIVIDUAL`/`BATCH`/`SCHOOL`) est déduite côté serveur du nombre de `userIds` valides — jamais d'un scope déclaré par le client — après intersection avec les membres réellement actifs de cette école (aucun id arbitraire ne peut faire fuiter les données d'une autre école ou d'un membre retiré). Un `Membership` `BATCH` renseigne `ExportLog.targetUserIds`, `INDIVIDUAL` renseigne `targetUserId`.
- **Export individuel** (`app/api/export/mine`) : couvre toutes les périodes où l'enseignant·e est participant·e, qu'elle en soit l'initiateur·rice ou non, avec leur statut de validation par les pairs — permet donc à un enseignant d'exporter des périodes déclarées et validées par d'autres intervenant·es dès lors qu'il y participe.

## Ce qui reste volontairement hors du modèle d'autorisation applicatif

- La **confirmation par les pairs** n'est pas un contrôle hiérarchique : Super Admin/Admin ne peut pas valider une période à la place d'un participant, même en cas de blocage — cela romprait la logique de confiance du vade-mecum. En cas de blocage réel, la résolution passe par l'organe local de concertation sociale, pas par un contournement technique.
- Le comptage du quota est **informatif**, pas bloquant : un enseignant en retard peut continuer à déclarer des périodes normalement ; seule une alerte est levée côté Super Admin/Admin.

## Rôle plateforme : Administrateur plateforme

`User.isSuperAdmin` est **transverse à toutes les écoles** — ce n'est pas un rôle de `Membership` et il ne figure donc pas dans la matrice ci-dessus, qui reste scopée par école. Ce rôle plateforme a été renommé « Administrateur plateforme » (libellé nav court : « Plateforme ») précisément pour ne plus partager de mot avec le rôle d'école « Super Admin » (`DIRECTION`) — ce sont deux concepts totalement distincts malgré la proximité de nom avant renommage. C'est le seul rôle qui déroge à la règle de cloisonnement inter-écoles : un administrateur plateforme peut consulter n'importe quelle école pour assister un Super Admin en difficulté.

- Accès en lecture/écriture à toutes les écoles, sans passer par une `Membership`.
- Tableau de bord d'utilisation : décompte d'écoles actives, de membres par rôle, de périodes déclarées/validées, dernière connexion (`User.lastLoginAt`) — calculé à la demande à partir des données existantes, aucune agrégation persistée n'est nécessaire pour l'instant.
- **Validation des créations d'école** (`School.status`) : toute école créée via le flux public `/creer-ecole` démarre `PENDING` et reste bloquée pour ses membres (garde `app/(app)/layout.tsx` + défense en profondeur dans `assertCanManageSchool`) tant qu'un administrateur plateforme ne l'a pas fait passer à `APPROVED` (ou `REJECTED`) depuis `/admin/ecoles`. Les écoles existantes (seed, migrations antérieures) restent `APPROVED` par défaut, sans action requise.
- Gestion du service **annonces** (`Announcement` / `AnnouncementTarget`) : création, ciblage, publication.
- Gestion du **feature flag** `donations` (voir plus bas).
- Toute consultation ou action d'un administrateur plateforme sur une école précise **doit** être journalisée dans `AuditLog` avec `schoolId` renseigné, au même titre qu'une action Super Admin/Admin — l'exception au cloisonnement ne dispense pas de la traçabilité RGPD. Les actions transverses (ex: publier une annonce plateforme) sont journalisées avec `schoolId = null`.
- Ne peut pas être créé par une action applicative normale (pas de flux d'auto-promotion) ; à réserver à un provisioning manuel/admin.

## Service annonces (ciblage)

Une `Announcement` peut viser plusieurs profils à la fois via ses `AnnouncementTarget` :

- Les critères d'**une même ligne** (`role`, `schoolId`, `reseau`, `disciplineId`) se combinent en **ET**.
- **Plusieurs lignes** pour une même annonce se combinent en **OU** (élargir l'audience, ex: "profs de maths des Tilleuls" OU "toute direction, tout réseau").
- Un critère laissé à `null` = pas de restriction sur ce critère précis.
- Le filtre `reseau` cible `School.reseau` indépendamment de `schoolId` — utile pour toucher tout un réseau d'enseignement sans lister chaque école.
- Seul un administrateur plateforme peut créer/publier une `Announcement` ; tout utilisateur ne voit que celles dont au moins une ligne de ciblage matche sa/ses `Membership` active(s).

## Service dons (masqué en première version)

`Donation` et `FeatureFlag` existent déjà dans le modèle, mais la fonctionnalité **ne doit pas être visible** pour les utilisateurs tant que le flag `FeatureFlag.key = "donations"` reste à `enabled: false` :

- Toute route, écran ou lien menant au don doit vérifier ce flag côté service avant de s'afficher — pas seulement masquer le bouton côté UI.
- Seul un administrateur plateforme peut faire passer ce flag à `true` quand la fonctionnalité sera prête à être exposée.
