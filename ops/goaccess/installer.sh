#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# ops/goaccess/installer.sh
# Installe le suivi de fréquentation sur le VPS. À lancer une seule fois :
#
#     sudo bash ops/goaccess/installer.sh
#
# Idempotent : relancé, il met à jour les fichiers sans redemander le mot de
# passe ni écraser celui qui existe.
# ---------------------------------------------------------------------------
set -euo pipefail

RACINE=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
HTPASSWD=/etc/nginx/.htpasswd-statistiques
SNIPPET=/etc/nginx/snippets/statistiques.conf

if [ "$EUID" -ne 0 ]; then
  echo "À lancer avec sudo." >&2
  exit 1
fi

echo "1/5  Paquets"
apt-get update -qq
apt-get install -y -qq goaccess apache2-utils

echo "2/5  Dossier du rapport"
install -d -m 750 -o root -g www-data /var/lib/goaccess

echo "3/5  Mot de passe d'accès"
if [ -f "$HTPASSWD" ]; then
  echo "     $HTPASSWD existe déjà — conservé."
else
  read -rp "     Nom d'utilisateur pour /statistiques : " UTILISATEUR
  # -B : bcrypt. Le mot de passe est demandé en interactif, jamais en argument,
  # pour qu'il ne finisse pas dans l'historique du shell.
  htpasswd -B -c "$HTPASSWD" "$UTILISATEUR"
  chown root:www-data "$HTPASSWD"
  chmod 640 "$HTPASSWD"
fi

echo "4/5  Configuration Nginx"
install -d -m 755 /etc/nginx/snippets
install -m 644 "$RACINE/ops/goaccess/nginx-statistiques.conf" "$SNIPPET"
if ! grep -rq "snippets/statistiques.conf" /etc/nginx/sites-enabled/ 2>/dev/null; then
  echo
  echo "     ⚠ Il reste UNE ligne à ajouter à la main, dans le bloc server HTTPS"
  echo "       de /etc/nginx/sites-available/ (avant le location / qui relaie Next.js) :"
  echo
  echo "           include $SNIPPET;"
  echo
  echo "       Puis : sudo nginx -t && sudo systemctl reload nginx"
fi

echo "5/5  Génération périodique"
install -m 644 "$RACINE/ops/goaccess/goaccess-rapport.service" /etc/systemd/system/
install -m 644 "$RACINE/ops/goaccess/goaccess-rapport.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now goaccess-rapport.timer
systemctl start goaccess-rapport.service

echo
echo "Terminé. Premier rapport :"
ls -l /var/lib/goaccess/rapport.html 2>/dev/null || echo "  (pas encore produit — voir : journalctl -u goaccess-rapport.service)"
echo "Prochaine régénération : $(systemctl list-timers goaccess-rapport.timer --no-pager --no-legend | awk '{print $1, $2}')"
