#!/usr/bin/env bash
#
# Publie la dernière release GitHub de LADS dans le dossier servi par api.harkhenon.dev.
# À exécuter sur le serveur (cron, timer systemd ou à la main). Sans effet si rien n'a changé.
#
# Usage :
#   GITHUB_TOKEN=... ./sync-updates.sh /var/www/api.harkhenon.dev/lads
#
# GITHUB_TOKEN : jeton à accès fin, limité à ce dépôt, en lecture seule sur « Contents »
#                (obligatoire tant que le dépôt est privé). Ne le mettez pas dans la crontab :
#                voir docs/RELEASE.md.
# Prérequis : bash, curl, jq, openssl, flock

set -euo pipefail

REPO="Harkhenon/lads"
DEST="${1:-/var/www/api.harkhenon.dev/lads}"
API="https://api.github.com/repos/$REPO"

for tool in curl jq openssl flock; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "$tool est requis (ex. : apt install $tool)" >&2
    exit 1
  fi
done

CURL_ARGS=(-fsSL --retry 3 --retry-delay 5 --max-time 1800 -H "X-GitHub-Api-Version: 2022-11-28")
if [ -n "${GITHUB_TOKEN:-}" ]; then
  CURL_ARGS+=(-H "Authorization: Bearer $GITHUB_TOKEN")
fi

mkdir -p "$DEST"

# Évite deux synchronisations simultanées.
exec 9>"$DEST/.sync.lock"
if ! flock -n 9; then
  echo "Une synchronisation est déjà en cours." >&2
  exit 0
fi

WORK=$(mktemp -d "$DEST/.sync.XXXXXX")
trap 'rm -rf "$WORK"' EXIT

RELEASE=$(curl "${CURL_ARGS[@]}" -H "Accept: application/vnd.github+json" "$API/releases/latest")
TAG=$(jq -er '.tag_name' <<<"$RELEASE")

if [ "$(cat "$DEST/.synced-tag" 2>/dev/null || true)" = "$TAG" ]; then
  echo "Déjà à jour : $TAG"
  exit 0
fi

echo "Nouvelle release : $TAG"

while IFS=$'\t' read -r ASSET_ID ASSET_NAME; do
  case "$ASSET_NAME" in
    */* | .*)
      echo "Nom d'asset refusé : $ASSET_NAME" >&2
      exit 1
      ;;
  esac
  echo "Téléchargement : $ASSET_NAME"
  curl "${CURL_ARGS[@]}" -H "Accept: application/octet-stream" \
    -o "$WORK/$ASSET_NAME" "$API/releases/assets/$ASSET_ID"
done < <(jq -r '.assets[] | [.id, .name] | @tsv' <<<"$RELEASE")

if [ ! -f "$WORK/latest.yml" ]; then
  echo "latest.yml absent de la release $TAG : rien n'est publié." >&2
  exit 1
fi

# Contrôle chaque installeur annoncé par un manifeste avant d'exposer quoi que ce soit.
verify_manifest() {
  local manifest="$1" file expected actual
  file=$(sed -n 's/^path: *//p' "$manifest" | tr -d "\"'\r")
  expected=$(sed -n 's/^sha512: *//p' "$manifest" | tr -d "\"'\r")
  if [ -z "$file" ] || [ -z "$expected" ] || [ ! -f "$WORK/$file" ]; then
    echo "Manifeste $(basename "$manifest") incohérent : rien n'est publié." >&2
    return 1
  fi
  actual=$(openssl dgst -sha512 -binary "$WORK/$file" | openssl base64 -A)
  if [ "$actual" != "$expected" ]; then
    echo "Empreinte invalide pour $file : rien n'est publié." >&2
    return 1
  fi
  echo "Empreinte vérifiée : $file"
}

for manifest in "$WORK"/latest*.yml; do
  verify_manifest "$manifest"
done

# Les installeurs d'abord, les manifestes ensuite : une application qui lit latest.yml
# trouve toujours un fichier complet (mv est atomique dans un même système de fichiers).
chmod 644 "$WORK"/*
for file in "$WORK"/*; do
  case "$(basename "$file")" in
    latest*.yml) ;;
    *) mv -f "$file" "$DEST/" ;;
  esac
done
for manifest in "$WORK"/latest*.yml; do
  mv -f "$manifest" "$DEST/"
done

echo "$TAG" >"$DEST/.synced-tag"
echo "Terminé : $TAG servie depuis $DEST"
