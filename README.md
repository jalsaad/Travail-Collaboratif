# Travail Collaboratif

Application de gestion du travail collaboratif enseignant en Fédération Wallonie-Bruxelles : déclaration et confirmation des périodes de collaboration entre pairs, tableau de bord direction/référent numérique, rattachement d'école par code, plateforme superadmin et exports PDF/XLSX.

Le modèle métier suit la **circulaire 7167 du 03/06/2019** (mise en œuvre du décret du 14 mars 2019) et son vade-mecum, complétés par la **circulaire 8894 du 20/04/2023**. Deux points en découlent directement dans le code :

- Le travail collaboratif ne connaît que **deux formes** ayant valeur normative — réunions des équipes pédagogique et éducative, et collaboration à visée pédagogique. C'est l'enum `PeriodType`, et rien d'autre. La qualification fine passe par `CollaborativePeriod.natureActivite`, dont les thèmes viennent du vade-mecum §8 — lequel précise qu'« une liste de thèmes n'est pas imposée » (cf. [`lib/collaborative-activities.ts`](lib/collaborative-activities.ts)).
- Une **période vaut 50 minutes** et la durée est calculée à la valeur exacte, sans arrondi : le quota annuel de 60 périodes a valeur réglementaire (cf. [`lib/period-duration.ts`](lib/period-duration.ts)).

Les règles d'autorisation (matrice par rôle, cloisonnement inter-écoles, ciblage des annonces...) sont documentées dans [`permissions.md`](permissions.md) — c'est la référence à jour du modèle de droits, à consulter avant toute modification touchant aux accès.

## Stack technique

- [Next.js 15](https://nextjs.org/) (App Router), React 19, TypeScript
- [Prisma](https://www.prisma.io/) + PostgreSQL 16
- [Auth.js v5](https://authjs.dev/) (Credentials, sessions JWT)
- Tailwind CSS 4
- `pdfkit` / `exceljs` pour les exports et l'affiche, `qrcode` pour les QR codes, `nodemailer` pour les emails

## Démarrage

Prérequis : Node.js 20+, Docker.

```bash
cp .env.example .env          # ajuster AUTH_SECRET si besoin (npx auth secret)
docker compose up -d          # démarre PostgreSQL
npm install
npx prisma migrate dev        # applique les migrations
npx prisma db seed            # charge le jeu de données de démonstration
npm run dev                   # http://localhost:3000
```

### Comptes de démonstration

Mot de passe unique pour tous les comptes : `demo1234`.

| Email | Rôle |
|---|---|
| `c.toumpsin@ecole-tilleuls.be` | Direction (École Les Tilleuls) |
| `s.dubois@ecole-tilleuls.be` | Référent numérique (Tilleuls) + Enseignante (Val) |
| `m.lefevre@ecole-tilleuls.be`, `a.colson@…`, `k.benali@…`, `j.vandamme@…` | Enseignant·e·s (Tilleuls) |
| `t.gregoire@val.be` | Enseignant (Athénée Provincial du Val) |
| `admin@travail-collaboratif.be` | Superadmin plateforme |

Codes de rattachement actifs (pour `/rejoindre` ou `/rejoindre-ecole`) : voir `/ecole/parametres` une fois connecté en direction, ou directement en base (table `join_codes`).

## Configuration

Tout est optionnel hors `DATABASE_URL` et `AUTH_SECRET` : chaque bloc absent dégrade proprement, ce qui permet de développer sans compte cloud. Voir [`.env.example`](.env.example) pour le détail.

| Variable | Effet si absente |
|---|---|
| `SMTP_*` | Les emails ne partent pas : liens et notifications sont journalisés dans la console. |
| `ARCHIVE_DIR` | Les archives de fin d'année sont écrites dans `./archives`, perdu au redéploiement. **À définir en production.** |
| `PLATFORM_NOTIFICATION_EMAIL` | Les alertes plateforme partent vers `admin@travail-collaboratif.be`. |
| `S3_*` | Les fichiers uploadés (logos, médias) vont sur le disque local. |
| `APP_ORIGIN`, `AUTH_TRUST_HOST` | Nécessaires derrière un reverse proxy, sinon les Server Actions et les callbacks NextAuth échouent. |

## Fonctionnalités notables

**Déclaration d'une période** — plage horaire (la durée en périodes en est déduite), forme légale, nature de l'activité, description et objectifs du plan de pilotage. Ce dernier champ reprend la 4ᵉ colonne du formulaire officiel de recensement annexé à la circulaire 7167.

**Validation par email** — chaque collègue invité reçoit un message dont le bouton ouvre une page récapitulative. Le lien ne valide **rien** par lui-même : les filtres anti-hameçonnage préchargent les URL des emails et confirmeraient sinon la participation à l'insu de l'intéressé. Le jeton est haché en base, à usage unique, expirant à 30 jours (cf. [`lib/participation-token.ts`](lib/participation-token.ts)).

**Autres notifications** — rattachement d'un enseignant (vers la direction et les référents), inscription d'une école (vers la plateforme), rappel de remise avec décompte des jours (vers les enseignants, en copie cachée). Un échec SMTP ne fait jamais échouer l'action qui l'a déclenché.

**Affiche à imprimer** — PDF A4 avec QR code menant au formulaire d'inscription, code de l'école pré-rempli. Accessible depuis l'espace Direction et l'administration plateforme (cf. [`lib/join-poster.ts`](lib/join-poster.ts)).

**Archivage de fin d'année** — écrit sur disque un dump JSON et un relevé PDF par école, puis crée l'année suivante. Rien n'est supprimé en base : les périodes déclarées par quelqu'un sont le relevé légal de ses collègues (cf. [`lib/school-year-archive.ts`](lib/school-year-archive.ts)). L'année scolaire va du dernier lundi d'août au premier vendredi de juillet, avec des dates saisissables — la Fédération y déroge certaines années.

**Suppression de compte** — réservée au superadmin. Un compte sans trace collaborative est réellement effacé ; les autres sont anonymisés, leur adresse étant libérée dans les deux cas (cf. [`lib/account-deletion.ts`](lib/account-deletion.ts)).

## Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm start` | Build et exécution en production |
| `npm run prisma:migrate` | Applique une nouvelle migration |
| `npm run prisma:seed` | Recharge le jeu de données de démonstration (idempotent) |
| `npm run prisma:studio` | Explorateur de données Prisma Studio |
| `npm run invitations` | Campagne d'invitation des directions (simulation par défaut) |
| `npm run collecte-emails` | Collecte des adresses des directions sur les sites d'école |
| `npm run po` | Liste des pouvoirs organisateurs des écoles de prospection |
| `npm run export-prospection` | Classeur XLSX de toute la prospection (Sheets/Excel) |
| `npm run purger-test` | Vide la base de ses comptes de test (simulation par défaut) |
| `npm run cartographie` | Importe l'annuaire officiel des écoles de la FWB (simulation par défaut) |

## Inviter les directions d'école

`data/prospection-ecoles.csv` liste 491 établissements (266 fondamentaux, 225 secondaires)
issus de l'annuaire public de la Fédération Wallonie-Bruxelles. **L'annuaire ne publie pas
les adresses email** : la colonne `email_direction` est vide et doit être complétée avant
tout envoi — le script ignore silencieusement les lignes sans adresse valide.

```bash
npm run invitations                              # simulation : compte et liste, n'envoie rien
npm run invitations -- --apercu                  # écrit data/apercu-invitation.html
npm run invitations -- --envoyer --limite=25     # première vague de 25
npm run invitations -- --envoyer --niveau=Secondaire
```

### Collecter les adresses des directions

L'annuaire de la Fédération ne publie pas les emails : `npm run collecte-emails` va les
chercher sur le site des écoles et remplit la colonne `email_direction`.

```bash
npm run collecte-emails                      # écoles dont l'annuaire donne le site
npm run collecte-emails -- --recherche       # + recherche du site pour les autres
npm run collecte-emails -- --limite=20 --concurrence=2
```

Le robot visite la page d'accueil puis les pages de contact qu'elle référence (4 pages max
par site), décode les adresses masquées en entités HTML, écarte les adresses techniques,
les exemples laissés par les thèmes et **celles des prestataires** — le pied de page qui
crédite l'agence web est reconnu, et toute adresse portant son nom de domaine est
disqualifiée quelle que soit sa forme —, puis classe les candidates : direction, secrétariat et
adresses génériques d'abord, sur le domaine de l'école de préférence. Il se présente sous
un `User-Agent` identifiable, respecte `robots.txt`, ne réessaie qu'une fois en cas de 503.

Seules les cases vides sont remplies — une adresse saisie à la main n'est jamais écrasée —
et le détail (candidates écartées, score, statut) part dans `data/collecte-rapport.csv`.
`--recherche` couvre les écoles dont l'annuaire ne donne aucun site : il faut alors une clé
`BRAVE_SEARCH_API_KEY` (offre gratuite). Le script ne scrape aucun moteur de recherche —
DuckDuckGo, Mojeek et Startpage interdisent `/search` dans leur robots.txt — et **les
adresses obtenues par cette voie sont à vérifier** : le site retenu est le premier résultat
plausible, ce qui reste une supposition.

Relancer la commande ne visite que les écoles encore sans adresse, ce qui rattrape les
sites momentanément indisponibles ; `--toutes` revisite tout le monde pour reconstituer le
rapport, sans jamais réécrire une adresse déjà en place. Le rapport est cumulatif.

### Relire la prospection dans un tableur

`npm run export-prospection` réunit les quatre fichiers dans `data/prospection.xlsx` :
une synthèse chiffrée, les écoles, les pouvoirs organisateurs et les deux rapports de
collecte, en-têtes figés, filtres actifs et cases d'adresse manquante surlignées. À importer
dans Google Sheets (Drive → Nouveau → Importation de fichier) ou à ouvrir dans Excel.

Le classeur est une photographie : les scripts d'envoi lisent les CSV, pas lui.

### Contacter les pouvoirs organisateurs

Le PO est l'employeur juridique des enseignant·es : pour les 4 050 écoles de l'officiel
subventionné c'est la commune — concrètement l'échevin·e de l'enseignement, membre du
collège communal qui exerce le pouvoir organisateur —, pour le provincial la province,
pour le réseau WBE l'organisme unique. `npm run po` construit `data/prospection-po.csv`,
la liste des PO de nos 491 écoles, avec le nombre d'écoles que chacun couvre.

```bash
npm run po                                   # construit ou met à jour le fichier
npm run po -- --rafraichir                   # redemande les sources au lieu du cache
npm run collecte-emails -- --profil=po       # cherche leurs adresses
npm run invitations -- --profil=po --apercu  # invitation adressée au PO
```

Deux sources publiques : le fichier signalétique des établissements de la FWB (Open Data
Wallonie-Bruxelles), qui donne le PO de chaque école mais aucune adresse email, et
Wikidata, pour le site officiel des communes et provinces. Le rapprochement école ↔ PO se
fait sur le nom et le code postal, et n'accepte une correspondance approchée qu'au-delà de
la moitié des mots en commun — un mauvais PO enverrait l'invitation à la mauvaise
institution.

Le profil `po` du collecteur vise l'adresse du service enseignement ou de l'échevin·e :
il suit les liens vers le collège communal, accorde un bonus aux adresses entourées des
mots « échevin » et « enseignement » dans la page, et **n'accepte que les adresses sur le
domaine de l'institution** — le seul email en pied de page d'un site communal est celui de
l'agence web qui l'a réalisé. En deçà d'un score minimum, rien n'est retenu : les
candidates restent visibles dans `data/collecte-po-rapport.csv`.

Rien ne part sans `--envoyer`, et l'envoi exige `SMTP_HOST`. Chaque message est journalisé
au fil de l'eau dans `data/prospection-journal.csv` : relancer la commande reprend là où
elle s'était arrêtée et ne réécrit jamais à une adresse déjà servie — c'est aussi ce qui
permet d'étaler la campagne en plusieurs vagues. Les adresses en doublon (implantations
partageant une boîte) ne sont servies qu'une fois, l'envoi est espacé de 4 secondes par
défaut (`--delai`), les réponses arrivent sur `PLATFORM_NOTIFICATION_EMAIL` et chaque
message porte un en-tête `List-Unsubscribe`.

Le contenu de l'invitation vit dans [`lib/invitation-directions.ts`](lib/invitation-directions.ts)
et reprend le gabarit commun des emails de la plateforme, extrait dans
[`lib/email-template.ts`](lib/email-template.ts) pour être utilisable hors requête HTTP.

## Déploiement

L'application tourne sous PM2 derrière Nginx. Séquence de mise en production :

```bash
cd /var/www/Travail-Collaboratif
git pull origin main
npm ci                        # sans --omit=dev : le build a besoin des devDependencies
npx prisma migrate deploy     # jamais migrate dev en production
npm run build
pm2 restart travail-collaboratif --update-env
pm2 save
```

Ne sautez pas `npm ci` sous prétexte que `package-lock.json` n'a pas bougé : son script de
post-installation régénère le client Prisma, du code dérivé de `prisma/schema.prisma`. Sans
lui, un schéma modifié fait échouer le build sur des colonnes que le client ignore encore —
et le `.next` laissé à moitié écrit met le site à terre au redémarrage suivant. Si vous
tenez à l'éviter, `npx prisma generate` avant le build joue le même rôle.

Le redémarrage ne se fait qu'après un build **terminé** : `next start` sur un `.next`
incomplet échoue en boucle, et PM2 affiche « online » pendant que Nginx répond 502.

Nginx doit transmettre `Host` et `X-Forwarded-Proto`, sans quoi les liens absolus des emails partent avec le mauvais hôte ou protocole.

### Cartographier les écoles de la Fédération

`npm run cartographie` charge `data/Cartographie-Ecoles-FWB.csv` — l'annuaire officiel, publié
en données ouvertes — dans la table `fwb_schools`, que l'espace plateforme affiche sous
**Cartographie** : qui a rejoint la plateforme, qui reste à convaincre.

```bash
npm run cartographie                 # simulation : compte, n'écrit rien
npm run cartographie -- --confirmer  # écrit en base
```

Le fichier donne une ligne par **implantation** : 8 052 lignes pour 2 972 établissements,
jusqu'à trente pour un seul. L'import regroupe par numéro FASE d'établissement et agrège les
types d'enseignement, que deux établissements sur trois cumulent. Les numéros y sont écrits en
décimal (`10.0`), séquelle d'un export tableur, et sont ramenés à leur forme entière — la seule
qui se compare à `School.numeroFase`.

Réexécutable sans dommage : les colonnes officielles sont réécrites depuis le fichier, les
colonnes de relance (email, téléphone, statut, notes) ne le sont jamais. Une réédition annuelle
de l'annuaire se rejoue donc par-dessus le travail de prospection déjà accompli.

L'annuaire alimente aussi le formulaire public de création d'école : la direction saisit son
numéro FASE en tête de formulaire, et le nom, le réseau, la zone, l'adresse et les niveaux se
remplissent seuls. Un numéro absent de l'annuaire n'est pas bloquant — les écoles à programme
belge à l'étranger n'y figurent pas —, la saisie reste manuelle. Deux correspondances ne sont
pas des équivalences et méritent d'être connues : l'annuaire dit « Libre confessionnel » sans
préciser la confession (le SeGEC est proposé, à corriger au besoin), et ni COCOF ni « organisme
public autre » n'ont d'équivalent dans la liste de la plateforme.

### Repartir d'une base propre

`npm run purger-test` supprime les comptes de démonstration et tout ce qui en dépend —
périodes, rattachements, tickets, annonces, journal — puis les écoles restées sans membre.

```bash
npm run purger-test                          # simulation : compte, ne supprime rien
npm run purger-test -- --confirmer           # exécute
npm run purger-test -- --sauf=vous@ecole.be  # préserve en plus ces adresses
npm run purger-test -- --garder-ecoles       # ne touche qu'aux comptes
```

Les administrateurs de la plateforme sont préservés sans avoir à être nommés : c'est le
drapeau `isSuperAdmin` en base qui fait foi. Le script refuse de s'exécuter s'il ne
resterait personne. Sont conservées aussi les données de référence — années scolaires,
disciplines, interrupteurs de fonctionnalité — sans lesquelles la base ne permettrait
plus de déclarer quoi que ce soit.

Rien ne part sans `--confirmer`, et en terminal interactif il faut encore taper
`SUPPRIMER` : la commande peut être collée sur le mauvais serveur, et il n'y a pas de
retour en arrière. Prenez une sauvegarde avant (`pg_dump`).

## Structure

```
app/(auth)/       pages publiques : connexion, création d'école, rattachement
                  par code, réinitialisation, validation par jeton (/valider)
app/(app)/        espace enseignant/direction (école active via cookie)
app/admin/        espace superadmin (écoles, utilisateurs, annonces, archives, dons)
app/api/export/   relevés PDF/XLSX
app/api/affiche/  affiche A4 avec QR code de rattachement
lib/              logique métier partagée (autorisations, requêtes, audit, emails)
components/       composants UI
prisma/           schéma, migrations, seed
```
