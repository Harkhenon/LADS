#!/usr/bin/env bash
#
# Synchronise les artefacts de mise à jour LADS depuis GitHub vers le serveur.
# À exécuter sur harkhenon.dev (par cron, systemd timer ou manuellement).
#
# Usage :
#   ./sync-updates.sh /var/www/api.harkhenon.dev/lads
#
# Prérequis : curl, jq, bash

set -euo pipefail

REPO="Harkhenon/LADS"
DEST="${1:-/var/www/api.harkhenon.dev/lads}"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq est requis : apt install jq" >&2
  exit 1
fi

mkdir -p "$DEST"

LATEST=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest")
TAG=$(echo "$LATEST" | jq -r '.tag_name')

echo "Dernière release : $TAG"

for ASSET_URL in $(echo "$LATEST" | jq -r '.assets[].browser_download_url'); do
  FILENAME=$(basename "$ASSET_URL")
  echo "Téléchargement : $FILENAME"
  curl -fsSL -o "$DEST/$FILENAME" "$ASSET_URL"
done

echo "Terminé. Artefacts servis depuis $DEST"
