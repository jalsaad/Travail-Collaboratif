#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# ops/goaccess/generer-rapport.sh
# Reconstruit le rapport de fréquentation à partir des journaux Nginx.
#
# Appelé par goaccess-rapport.timer (toutes les quinze minutes). Le rapport est
# reconstruit ENTIÈREMENT à chaque passage, à partir de tous les journaux
# encore présents : c'est plus coûteux qu'un traitement incrémental, mais sans
# risque de double comptage, et le volume d'une plateforme comme celle-ci le
# permet largement.
#
# Le fichier produit n'est pas dans un dossier servi publiquement : Nginx le
# sert depuis un emplacement protégé par mot de passe (cf. nginx-statistiques.conf).
# ---------------------------------------------------------------------------
set -euo pipefail

JOURNAUX=${JOURNAUX:-/var/log/nginx/access.log}
SORTIE=${SORTIE:-/var/lib/goaccess/rapport.html}
TITRE=${TITRE:-Travail Collaboratif — fréquentation}

# GoAccess refuse tout fichier de sortie dont l'extension n'est ni .html, ni
# .json, ni .csv — un « rapport.html.tmp » le fait échouer avant même de lire
# le journal. Le fichier de travail garde donc l'extension, et c'est son nom
# qui le distingue.
TRAVAIL="${SORTIE%.html}.en-cours.html"

# Les requêtes d'assets noieraient les pages réellement consultées : un
# affichage de page tire des dizaines de fichiers. Trois familles sont
# écartées avant l'analyse plutôt que triées après.
#
#   — les chemins techniques : /_next/, favicon, icônes, robots.txt ;
#   — TOUT fichier reconnaissable à son extension, où qu'il soit servi. Les
#     logos de réseaux vivent à la racine (/segec-logo-cropped.png…) et
#     comptaient pour un millier de « pages vues » ;
#   — les requêtes ?_rsc=…, préchargements internes de Next.js : le navigateur
#     les émet sans que personne n'ait rien consulté.
FILTRE='"[A-Z]+ /(_next/|favicon|icon|apple-icon|robots\.txt|sitemap)|"[A-Z]+ [^" ]+\.(png|jpe?g|svg|gif|webp|ico|css|js|mjs|map|woff2?|ttf|eot)([?" ]|$)|[?&]_rsc='

# Adresses à ne pas compter, séparées par des virgules — la vôtre en premier
# lieu. Sur ce serveur, un cinquième des requêtes venait du réseau depuis
# lequel la plateforme est administrée : à ce compte-là, on mesure surtout son
# propre travail. GoAccess accepte une IP seule ou un intervalle
# (192.168.0.1-192.168.0.255).
EXCLUSIONS_IP=${EXCLUSIONS_IP:-}

# --no-global-config ignore /etc/goaccess/goaccess.conf : le paquet de la
# distribution y pose ses propres réglages, hors de notre contrôle et
# susceptibles de changer à une mise à jour. Un rapport statique qui hérite du
# mode temps réel affiche un message d'attente de connexion à la place des
# données. Seules les options ci-dessous s'appliquent désormais.
#
# zcat -f lit indifféremment les journaux courants et les archives .gz, ce qui
# donne autant d'historique que logrotate en conserve.
# shellcheck disable=SC2086
zcat -f ${JOURNAUX}* 2>/dev/null \
  | grep -Ev "$FILTRE" \
  | goaccess - \
      --no-global-config \
      ${EXCLUSIONS_IP:+--exclude-ip="$EXCLUSIONS_IP"} \
      --log-format=COMBINED \
      --output="$TRAVAIL" \
      --html-report-title="$TITRE" \
      --anonymize-ip \
      --ignore-crawlers \
      --http-protocol=no \
      --no-progress \
      --tz=Europe/Brussels

# Renommé en dernier : une consultation pendant la régénération lit l'ancien
# rapport, jamais un fichier à moitié écrit.
mv "$TRAVAIL" "$SORTIE"
# Le fichier naît root:root — Nginx, qui tourne en www-data, ne pourrait pas le
# lire. Le dossier est déjà au bon groupe, mais un fichier n'en hérite pas.
chown root:www-data "$SORTIE"
chmod 640 "$SORTIE"
