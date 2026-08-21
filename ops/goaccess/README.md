# Suivi de fréquentation

Analyse des journaux Nginx par [GoAccess](https://goaccess.io), sans traceur ni
cookie : rien n'est ajouté aux pages, rien n'est déposé sur le poste du
visiteur, et aucune donnée ne part chez un tiers. La contrepartie est qu'on
observe des requêtes, pas des parcours reconstitués — voir « Ce qu'on voit, ce
qu'on ne voit pas » plus bas.

## Installation

Sur le VPS, une seule fois :

```bash
cd /var/www/Travail-Collaboratif
sudo bash ops/goaccess/installer.sh
```

Il installe GoAccess, demande un identifiant et un mot de passe pour l'accès au
rapport, pose les unités systemd et lance la première génération. Il reste
**une ligne à ajouter à la main** dans le bloc `server` HTTPS de
`/etc/nginx/sites-available/…`, avant le `location /` qui relaie vers Next.js :

```nginx
include /etc/nginx/snippets/statistiques.conf;
```

Puis `sudo nginx -t && sudo systemctl reload nginx`.

Le rapport est ensuite consultable sur **https://travail-collaboratif.be/statistiques**,
protégé par le mot de passe choisi.

## Ce qui a été fait différemment de la recette d'OVH

**Le rapport n'est pas public.** La recette courante l'écrit dans
`/var/www/html/report.html`, où quiconque en connaît l'adresse lit vos
référents, vos pages et vos visiteurs. Ici il vit sous `/var/lib/goaccess`,
hors de tout dossier servi, et n'est exposé que par un emplacement Nginx
authentifié en HTTPS.

**Pas de mode temps réel.** `--real-time-html` ouvre un WebSocket sur un port
supplémentaire et meurt avec la session qui l'a lancé. Un timer systemd
régénère le rapport toutes les quinze minutes : une surface d'attaque en moins,
un service qui survit aux redémarrages, et une fraîcheur bien suffisante.

**Les adresses IP sont anonymisées** (`--anonymize-ip`). Un journal d'accès
contient des données personnelles au sens du RGPD ; sur une plateforme destinée
à des écoles, c'est la position confortable.

**Les assets sont écartés avant l'analyse.** Un affichage de page Next.js tire
des dizaines de fichiers `/_next/` : sans filtre, ce sont eux qui occuperaient
le classement des pages les plus vues.

**Les robots sont exclus** (`--ignore-crawlers`), sans quoi Googlebot fausse le
décompte des visiteurs d'un site peu fréquenté.

## Ce qu'on voit, ce qu'on ne voit pas

On voit : le nombre de visiteurs uniques par jour, les pages consultées et leur
ordre de popularité, les référents, les systèmes et navigateurs, les pays, les
codes d'erreur (404, 500) et le temps de réponse du serveur.

On ne voit pas : ce qui se passe *dans* une page — défilement, clics, champs
abandonnés. Il faudrait pour cela un traceur JavaScript, avec le bandeau de
consentement qui l'accompagne.

## Mesurer une campagne

Les liens des invitations portent une marque : `?src=invitation` pour les
directions, `?src=invitation-po` pour les pouvoirs organisateurs
(cf. `lib/invitation-directions.ts`). Ces visites sont donc reconnaissables
dans le panneau « Requested Files » du rapport, ce qu'un référent d'email ne
permettrait pas — la plupart des clients de messagerie n'en envoient aucun.

Pour compter à la main :

```bash
sudo zcat -f /var/log/nginx/access.log* | grep -c 'src=invitation '
```

## Écarter son propre trafic

Sur un serveur d'administration, une part importante des requêtes vient de
l'équipe elle-même — ici un cinquième au premier relevé. Le script accepte une
liste d'adresses à ne pas compter, à poser dans un supplément systemd, qui
survivra aux mises à jour du dépôt :

```bash
sudo systemctl edit goaccess-rapport.service
```

Ajoutez :

```ini
[Service]
Environment="EXCLUSIONS_IP=169.155.241.0-169.155.241.255"
```

Puis `sudo systemctl daemon-reload` et `sudo systemctl start goaccess-rapport.service`.

**Vérifiez d'abord que le réseau est bien le vôtre** : exclure celui d'un tiers
reviendrait à effacer de vrais visiteurs. Une adresse seule ou un intervalle
sont acceptés, séparés par des virgules.

## Lire les chiffres sans se tromper

Un serveur exposé est balayé en permanence par des robots qui cherchent des
failles — `/.env`, `/wp-admin`, `/phpmyadmin`. Au premier relevé, **35 % des
requêtes répondaient 404**, presque toutes de cette nature. Elles sont
délibérément conservées : le panneau « Not Found URLs » sert à repérer aussi
bien un scan qu'un vrai lien cassé.

Le total de requêtes est donc toujours supérieur à la fréquentation réelle.
Les nombres à regarder sont ceux des pages qui existent, et la marque
`src=invitation` pour ce qui vient d'une campagne.

Les filtres de messagerie ouvrent par ailleurs les liens des emails avant de
les délivrer : quelques visites suivent chaque envoi sans qu'aucun humain
n'ait cliqué.

## Profondeur d'historique

Le rapport est reconstruit à chaque passage depuis **tous les journaux encore
présents**. La profondeur dépend donc de logrotate, qui conserve quatorze jours
par défaut. Pour garder un trimestre :

```bash
sudo sed -i 's/^\trotate 14$/\trotate 90/' /etc/logrotate.d/nginx
```

Le coût est modeste — quelques dizaines de mégaoctets compressés — et permet de
comparer l'avant et l'après d'une campagne.

## Dépannage

```bash
systemctl status goaccess-rapport.timer     # le minuteur tourne-t-il
journalctl -u goaccess-rapport.service -n 30  # ce qu'a fait la dernière génération
sudo systemctl start goaccess-rapport.service # régénérer tout de suite
```

Un rapport vide signale généralement un format de journal différent de
`COMBINED` : vérifiez `log_format` dans `/etc/nginx/nginx.conf` et ajustez
`--log-format` dans `generer-rapport.sh`.

Un **500** avec « rapport.htmlindex.html is not a directory » dans le journal
d'erreurs signale un emplacement terminé par une barre oblique : un `alias`
vers un fichier exige `location = /statistiques`, sans barre finale.

Un rapport qui reste sur son indicateur d'attente, avec « No authentication
provided », signale que quelque chose empêche son JavaScript d'aboutir — une
politique `Content-Security-Policy` trop stricte, par exemple : le rapport
émet des `fetch()` à son initialisation. Le message lui-même est normal pour
un rapport statique, il n'indique pas un refus d'accès.

Un **404** vient presque toujours de l'`include` posé dans
le mauvais bloc `server` — celui du port 80, qui ne fait que rediriger. Un
**403** signale que le fichier n'appartient pas au groupe `www-data` :

```bash
sudo ls -l /var/lib/goaccess/rapport.html   # attendu : root www-data, 640
sudo tail -5 /var/log/nginx/error.log
```
