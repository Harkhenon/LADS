# Publier une version de LADS

```
npm run release -- minor
        │  contrôles (lint, tests, build, audit), commit de version, tag, push
        ▼
GitHub Actions (.github/workflows/release.yaml)
        │  vérifie, construit Windows et Linux, signe si configuré,
        │  puis publie la GitHub Release d'un seul coup
        ▼
scripts/sync-updates.sh (sur le serveur)
        │  télécharge, vérifie les empreintes, publie les installeurs puis latest.yml
        ▼
https://api.harkhenon.dev/lads ──▶ electron-updater (dans l'application)
```

## Publier

Depuis `main`, à jour et sans modification en cours :

```bash
npm run release -- patch
```

Remplacez `patch` par `minor`, `major` ou un numéro précis. Un numéro comme `1.2.3-beta.1` crée une préversion, que le serveur de mises à jour ignore. Pour lancer les contrôles sans rien modifier :

```bash
npm run release -- patch --dry-run
```

Suivre le build :

```bash
gh run list --workflow=release.yaml
```

## Mise en place sur le serveur (une seule fois)

Le dépôt étant privé, le serveur a besoin d'un jeton pour lire les releases.

1. Créez un [jeton à accès fin](https://github.com/settings/personal-access-tokens/new) : dépôt `Harkhenon/lads` uniquement, permission **Contents : Read-only**.
2. Sur le serveur, installez les prérequis et le script :

   ```bash
   sudo apt install jq curl openssl util-linux
   sudo install -m 755 sync-updates.sh /usr/local/bin/lads-sync-updates
   ```

3. Enregistrez le jeton dans un fichier lisible par le seul compte qui lance la synchronisation :

   ```bash
   sudo install -m 600 -o www-data /dev/null /etc/lads-sync.env
   sudoedit /etc/lads-sync.env
   ```

   Contenu du fichier :

   ```
   export GITHUB_TOKEN=github_pat_...
   ```

4. Planifiez la synchronisation (`sudo crontab -u www-data -e`), en adaptant le compte et le dossier servi :

   ```
   */15 * * * * . /etc/lads-sync.env && /usr/local/bin/lads-sync-updates /var/www/api.harkhenon.dev/lads
   ```

Sans nouvelle release, le script s'arrête aussitôt. En cas d'empreinte invalide, il ne publie rien et l'ancienne version reste servie.

## Avant la première release de cette branche

- **Testez la mise à jour depuis la 0.3.0** sur une machine ou une VM de test : installez la 0.3.0, publiez une préversion vers un flux de test, vérifiez que vos playlists sont conservées. Ce passage (Electron 32 vers 45) n'a pas pu être testé sans modifier une installation réelle.
- Supprimez le secret GitHub `GH_TOKEN` : aucun workflow ne l'utilise, le workflow se sert du jeton temporaire fourni par GitHub.

## Signer le .exe

### Ce que la signature change, et ne change pas

| Protection Windows | Sans signature                                                                | Avec signature                                                                                    |
| ------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| SmartScreen        | « Windows a protégé votre PC », la réputation repart de zéro à chaque version | Avertissement possible au début, avec votre nom ; la réputation se cumule d'une version à l'autre |
| Smart App Control  | Exécution bloquée sauf bonne réputation                                       | Exécution autorisée avec un certificat reconnu                                                    |

Aucun certificat ne supprime l'avertissement SmartScreen dès le premier jour : d'après Microsoft, les certificats EV n'offrent plus ce passe-droit depuis 2024, et la réputation peut demander plusieurs semaines et des centaines d'installations. Inutile de payer un EV pour cela. Seul le Microsoft Store évite tout avertissement.

**À savoir :**

- LADS télécharge `yt-dlp.exe`, `ffmpeg.exe` et parfois `deno.exe`. Ils ne sont pas couverts par votre signature. Ils ont bien démarré sur un poste avec Smart App Control actif lors des tests, mais rien ne le garantit dans la durée.
- Microsoft déconseille de signer ce qui peut être classé « application potentiellement indésirable », sous peine de réputation négative du certificat. Un téléchargeur YouTube peut être concerné : surveillez cela après les premières releases signées.
- **Après la première version signée, chaque mise à jour doit être signée par le même éditeur** (`publisherName`), sinon electron-updater la refusera. Si le nom change, publiez d'abord une version intermédiaire qui accepte les deux noms.

### Quelle option choisir

| Option                               | Coût indicatif                                         | Pour qui                                                                         | Dans ce projet                                                                               |
| ------------------------------------ | ------------------------------------------------------ | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Azure Artifact Signing**           | environ 9,99 $/mois                                    | Organisations US, Canada, UE, Royaume-Uni. Particuliers : US et Canada seulement | **Déjà câblé dans la CI**                                                                    |
| **Certificat OV** (Certum, Sectigo…) | 150 à 300 $/an (Certum : dès 109 €/an selon revendeur) | Tout le monde, particuliers compris selon l'autorité                             | À adapter : clé sur jeton ou HSM                                                             |
| Certum Open Source                   | 69 €, avec carte et lecteur                            | Logiciels libres ; acceptation par Microsoft à vérifier                          | Déconseillé tant que le dépôt est privé                                                      |
| SignPath Foundation                  | Gratuit                                                | Projets open source éligibles                                                    | Impose un dépôt public                                                                       |
| Microsoft Store (MSIX)               | Gratuit                                                | Tous ; validation par Microsoft                                                  | Empaquetage et mises à jour à refaire ; un téléchargeur YouTube risque le refus (à vérifier) |

**Recommandation :** Azure Artifact Signing si l'association « Regards étoilés » ou une autre structure légale peut être le titulaire. Sa fiche d'éligibilité doit être vérifiée au préalable : une source mentionne un historique d'au moins 3 ans. Sinon, un certificat OV au nom d'un particulier.

### Activer Azure Artifact Signing

1. Sur le [portail Azure](https://portal.azure.com) (abonnement payant, pas d'essai gratuit), créez un compte **Artifact Signing**, puis faites valider l'identité de la structure (comptez quelques jours ouvrés).
2. Créez un **profil de certificat** de type _Public Trust_.
3. Créez une **inscription d'application** dans Microsoft Entra ID avec un secret client, et donnez-lui le rôle **Artifact Signing Certificate Profile Signer** sur le compte.
4. Ajoutez ces secrets au dépôt (Settings → Secrets and variables → Actions) :

   | Secret                                 | Valeur                                                                 |
   | -------------------------------------- | ---------------------------------------------------------------------- |
   | `AZURE_TENANT_ID`                      | ID du locataire                                                        |
   | `AZURE_CLIENT_ID`                      | ID de l'application                                                    |
   | `AZURE_CLIENT_SECRET`                  | Secret client                                                          |
   | `AZURE_CODE_SIGNING_ENDPOINT`          | Ex. `https://weu.codesigning.azure.net/`                               |
   | `AZURE_CODE_SIGNING_ACCOUNT_NAME`      | Nom du compte                                                          |
   | `AZURE_CODE_SIGNING_CERT_PROFILE_NAME` | Nom du profil                                                          |
   | `AZURE_CODE_SIGNING_PUBLISHER_NAME`    | Nom commun (CN) **exact** du certificat, utilisé pour les mises à jour |

5. Publiez une préversion : le workflow contrôle la signature et échoue si elle est absente ou invalide. Sans ces secrets, il produit un installeur non signé et affiche un avertissement.

### Signer avec un certificat OV

La clé étant sur un jeton ou un HSM, la signature se fait sur le poste où il est branché. Le certificat doit y être visible dans le magasin Windows :

```bash
npm run build
```

```bash
npx electron-builder --win --publish never -c.win.signtoolOptions.certificateSha1=EMPREINTE -c.win.signtoolOptions.publisherName="NOM DU CERTIFICAT"
```

Le workflow actuel publierait un `.exe` non signé : si vous choisissez cette voie, il faudra l'adapter pour que seul l'installeur signé soit publié.

### En attendant

Prévenez vos utilisateurs. Avec SmartScreen : « Informations complémentaires », puis « Exécuter quand même ». Avec Smart App Control actif, l'installeur peut être bloqué sans exception possible. C'est ce qui s'est produit lors des tests sur un poste de développement, où un build local non signé a été refusé. Ne désactivez ce réglage qu'en connaissance de cause.

## Mettre à jour les outils embarqués

Deno et ffmpeg sont épinglés par version et empreinte dans [`src/main/lib/toolPins.mjs`](../src/main/lib/toolPins.mjs). Pour changer de version :

1. Modifiez la version et les URL.
2. Récupérez les empreintes : Deno publie un fichier `.sha256sum` par archive. Pour ffmpeg, calculez-la :

   ```bash
   curl -fsSL https://github.com/eugeneware/ffmpeg-static/releases/download/VERSION/ffmpeg-win32-x64 | sha256sum
   ```

3. Testez une installation à neuf, puis un téléchargement réel.

yt-dlp n'est pas épinglé : l'application vérifie la dernière version à chaque session et la contrôle avec le fichier `SHA2-256SUMS` de la release. Cela protège d'un fichier corrompu, mais pas d'une release GitHub compromise.

## Dépendances

Dependabot propose les mises à jour chaque semaine. La clé `allowScripts` de `package.json` liste, pour npm 12, les paquets autorisés à lancer un script d'installation, version par version : ajustez-la si `npm install` signale un script bloqué.
