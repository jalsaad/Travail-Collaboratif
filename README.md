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

Nginx doit transmettre `Host` et `X-Forwarded-Proto`, sans quoi les liens absolus des emails partent avec le mauvais hôte ou protocole.

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
