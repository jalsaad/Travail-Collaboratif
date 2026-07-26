# Travail Collaboratif

Application de gestion du travail collaboratif enseignant, conforme au vade-mecum de la Circulaire 8894/7167 (Fédération Wallonie-Bruxelles) : déclaration et confirmation des périodes de collaboration entre pairs, tableau de bord direction/référent numérique, rattachement d'école par code, plateforme superadmin (annonces ciblées, flag dons) et exports PDF/XLSX.

Les règles d'autorisation (matrice par rôle, cloisonnement inter-écoles, ciblage des annonces...) sont documentées dans [`permissions.md`](permissions.md) — c'est la référence à jour du modèle de droits, à consulter avant toute modification touchant aux accès.

## Stack technique

- [Next.js 15](https://nextjs.org/) (App Router), React 19, TypeScript
- [Prisma](https://www.prisma.io/) + PostgreSQL 16
- [Auth.js v5](https://authjs.dev/) (Credentials, sessions JWT)
- Tailwind CSS 4
- `exceljs` / `pdfkit` pour les exports

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

## Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm start` | Build et exécution en production |
| `npm run prisma:migrate` | Applique une nouvelle migration |
| `npm run prisma:seed` | Recharge le jeu de données de démonstration (idempotent) |
| `npm run prisma:studio` | Explorateur de données Prisma Studio |

## Structure

```
app/(auth)/       pages publiques (connexion, inscription via code)
app/(app)/        espace enseignant/direction (école active via cookie)
app/admin/        espace superadmin (annonces, dons, dashboard d'usage)
app/api/export/   téléchargement des relevés PDF/XLSX
lib/              logique métier partagée (autorisations, requêtes, audit)
components/       composants UI
prisma/           schéma, migrations, seed
```
