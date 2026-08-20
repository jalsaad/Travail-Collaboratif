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

# Les requêtes d'assets noieraient les pages réellement consultées : sur une
# application Next.js, un affichage de page tire des dizaines de fichiers
# /_next/. On les écarte avant l'analyse plutôt que de les trier après.
FILTRE='"[A-Z]+ /(_next/|favicon|icon|apple-icon|robots\.txt|sitemap)'

# zcat -f lit indifféremment les journaux courants et les archives .gz, ce qui
# donne autant d'historique que logrotate en conserve.
# shellcheck disable=SC2086
zcat -f ${JOURNAUX}* 2>/dev/null \
  | grep -Ev "$FILTRE" \
  | goaccess - \
      --log-format=COMBINED \
      --output="$SORTIE.tmp" \
      --html-report-title="$TITRE" \
      --anonymize-ip \
      --ignore-crawlers \
      --http-protocol=no \
      --no-progress \
      --tz=Europe/Brussels

# Renommé en dernier : une consultation pendant la régénération lit l'ancien
# rapport, jamais un fichier à moitié écrit.
mv "$SORTIE.tmp" "$SORTIE"
chmod 640 "$SORTIE"
