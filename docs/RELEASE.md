# Publier et installer LADS

LADS n'est plus un programme Electron. C'est un petit serveur local, exécuté par `node.exe` (signé par OpenJS), dont l'interface s'ouvre dans Edge ou Chrome.

```
npm run release -- minor
        │  contrôles, commit de version, tag, push
        ▼
GitHub Actions (.github/workflows/release.yaml)
        │  construit l'application et crée un BROUILLON de release
        ▼
Votre PC (scripts/sign-release.mjs)
        │  vérifie le brouillon, le signe avec votre clé, le publie
        ▼
Releases de Harkhenon/LADS ──▶ LADS se met à jour seul sur les postes
```

Le dépôt doit rester **public** : LADS lit les releases sans s'authentifier.

## Première mise en place (une seule fois)

1. Dans un terminal, créez la clé de signature des mises à jour :

   ```bash
   npm run release:keygen
   ```

   La clé privée va dans `%USERPROFILE%\.lads\update-signing-key.pem`, chiffrée par une phrase secrète que vous choisissez. La clé publique va dans `update-public-key.pem`.

2. **Sauvegardez la clé privée et sa phrase secrète hors de ce PC**, par exemple dans un gestionnaire de mots de passe. Sans elles, plus aucune mise à jour ne peut être publiée : il faudrait réinstaller LADS à la main sur chaque poste.
3. Commitez `update-public-key.pem`. Ne commitez jamais la clé privée.

## Publier une version

Depuis `main`, à jour et sans modification en cours, **dans un terminal** (la phrase secrète est demandée à la fin) :

```bash
npm run release -- patch
```

Remplacez `patch` par `minor`, `major` ou un numéro précis. Pour lancer les contrôles sans rien modifier :

```bash
npm run release -- patch --dry-run
```

Si la publication s'interrompt après le build, reprenez-la sans tout relancer :

```bash
npm run release:sign -- vX.Y.Z
```

Une version comme `1.2.3-beta.1` reste une préversion : les postes ne la reçoivent pas.

## Installer LADS sur un PC (une seule fois)

Dans PowerShell, sur le PC concerné, sans droits administrateur :

```powershell
$f = "$env:TEMP\lads-install.ps1"; Invoke-WebRequest -UseBasicParsing https://github.com/Harkhenon/LADS/releases/latest/download/install.ps1 -OutFile $f; powershell -NoProfile -ExecutionPolicy Bypass -File $f
```

Une icône **LADS** apparaît sur le Bureau, et c'est tout ce que l'utilisateur aura à connaître.

**Ne téléchargez pas `install.ps1` avec un navigateur, et ne déplacez pas LADS via un zip téléchargé :** Windows marquerait les fichiers comme venant d'Internet, et Smart App Control refuserait alors le raccourci. La commande ci-dessus n'ajoute pas cette marque.

Les playlists de `%APPDATA%\lads` sont reprises. Si une ancienne version Electron (0.4.x) est installée, désinstallez-la depuis les Paramètres de Windows : elle ne recevra plus de mise à jour.

Pour désinstaller, supprimez l'icône et le dossier `%LOCALAPPDATA%\Programs\LADS`. Les playlists restent dans `%APPDATA%\lads`.

## Comment fonctionnent les mises à jour

- **Quand :** vérification 5 secondes après le lancement, puis toutes les 6 heures. Rien n'est affiché si le réseau est absent.
- **Application :** tout se prépare en arrière-plan et s'applique au lancement suivant, jamais pendant une animation.
- **Vérification :** seul un manifeste signé par votre clé est accepté. Il fixe les empreintes de l'application et de Node. Une version plus ancienne, même bien signée, est refusée.
- **En cas de panne :** si la nouvelle version ne démarre pas ou que l'interface ne s'affiche pas en 90 secondes, LADS revient seul à la précédente et ne retente plus cette version.
- **Compte GitHub compromis :** la clé n'étant ni sur GitHub ni dans la CI, un attaquant ne peut pas pousser de code sur les postes par les mises à jour.

## Dépannage à distance

Le journal se trouve dans `%APPDATA%\lads\lads.log`. Il indique les versions lancées, les mises à jour, les retours arrière et les erreurs de téléchargement.

## Sécurité du poste

LADS est conçu pour fonctionner avec Smart App Control actif, mais il ne le satisfait pas au sens strict : seul `node.exe` est vérifié, pas le code JavaScript qu'il exécute. C'est pourquoi les mises à jour sont signées séparément.

**Limites :**

- `yt-dlp.exe` et `ffmpeg.exe` restent des exécutables non signés. Windows les juge fichier par fichier : ils ont été acceptés lors des tests, mais une nouvelle version de yt-dlp pourrait être refusée, ou l'un de ses composants internes. La lecture continuerait, pas le téléchargement. Le journal en garde la trace.
- Microsoft peut faire évoluer Smart App Control et bloquer ce fonctionnement.
- La première installation repose sur une commande à lancer et sur `install.ps1`, dont l'authenticité dépend de GitHub : lancez-la vous-même.
- Certains antivirus, dont Kaspersky, analysent aussi le trafic local et réécrivent les pages : ils peuvent ajouter des messages dans la console du navigateur, et leur comportement peut varier d'un poste à l'autre. La CSP est donc envoyée par un en-tête HTTP plutôt que dans le HTML.

## Mettre à jour Node.js et les outils

Node.js et ffmpeg sont épinglés par version et empreinte dans [`src/server/lib/toolPins.mjs`](../src/server/lib/toolPins.mjs). Après modification de Node.js, la release suivante le déploie sur les postes, en même temps que l'application.

- **Node.js :** l'empreinte se trouve dans `https://nodejs.org/dist/vX.Y.Z/SHASUMS256.txt`, ligne `node-vX.Y.Z-win-x64.zip`.
- **ffmpeg :** calculez-la :

  ```bash
  curl -fsSL https://github.com/eugeneware/ffmpeg-static/releases/download/VERSION/ffmpeg-win32-x64 | sha256sum
  ```

yt-dlp n'est pas épinglé : LADS vérifie la dernière version à chaque session et la contrôle avec le fichier `SHA2-256SUMS` de la release. Cela protège d'un fichier corrompu, mais pas d'une release yt-dlp compromise.

## Dépendances

Dependabot propose les mises à jour chaque semaine. La clé `allowScripts` de `package.json` liste, pour npm 12, les paquets autorisés à lancer un script d'installation, version par version : ajustez-la si `npm install` signale un script bloqué.
