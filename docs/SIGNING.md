# Signature Windows — SignPath Foundation

Ce document décrit la signature de code des installeurs Windows de
LADS via **SignPath Foundation** (programme gratuit pour les projets
open source). Sans signature, Windows Defender/SmartScreen bloque le
téléchargement et l'installation de l'application.

> **Historique** : Azure Trusted Signing a d'abord été envisagé, mais
> le service est réservé (depuis avril 2025) aux organisations
> US/Canada avec 3 ans d'historique — inaccessible depuis la France.
> SignPath Foundation a été retenu à la place.

## Comment ça fonctionne

La signature s'active **automatiquement** si les secrets SignPath sont
présents dans le repo, et uniquement dans ce cas :

- le workflow `release.yaml` build l'installeur Windows, l'uploade
  comme artifact GitHub, puis soumet une requête de signature à
  SignPath (`signpath/github-action-submit-signing-request@v3`) ;
- SignPath vérifie l'origine (trusted build GitHub Actions), signe
  avec son certificat OV, et renvoie l'installeur signé ;
- selon la signing policy, **chaque signature peut nécessiter une
  approbation manuelle** dans l'interface SignPath (contrainte du
  programme OSS) — le workflow attend (wait-for-completion) ;
- sans les secrets, le build sort un installeur **non signé**
  (comportement historique, aucun échec).

## 1. Candidater au programme SignPath Foundation

1. Créer un compte sur [signpath.io](https://signpath.io).
2. Postuler au programme Open Source :
   <https://signpath.io/solutions/open-source-community> — la
   candidature est **par projet** (repo LADS).
3. Prérequis (déjà en place dans ce repo) :
   - licence open source OSI : **MIT** (fichier `LICENSE`,
     champ `license` du `package.json`) ;
   - politique de signature publique : **`CODE_SIGNING.md`** à la
     racine du repo ;
   - MFA activée sur le compte GitHub (et SignPath).
4. Review manuelle : **1 à 2 semaines** en général, possibles
   questions de suivi par email.

## 2. Configurer le projet SignPath (après approbation)

Sur app.signpath.io, pour le projet LADS :

1. **Authorizations → Trusted build systems → GitHub** : installer
   l'app GitHub SignPath sur le repo `Harkhenon/LADS`.
2. **Artifact configuration** : décrire le contenu — un ZIP contenant
   l'installeur NSIS `lads-<version>-setup.exe` (type PE file).
   SignPath signe l'exe Authenticode.
3. **Signing policy** (ex: slug `release-signing`) : liée au
   certificat de la SignPath Foundation, origine vérifiée GitHub
   Actions, restriction aux tags/branches de release
   (ex: `v*` / `main`), approbation manuelle activée.
4. **CI user + API token** : créer un utilisateur CI avec le rôle
   *Submitter* sur la signing policy, générer un API token.

## 3. Renseigner les secrets GitHub

Dans le repo : *Settings → Secrets and variables → Actions* :

| Secret | Valeur |
|---|---|
| `SIGNPATH_API_TOKEN` | API token du CI user SignPath |
| `SIGNPATH_ORGANIZATION_ID` | ID de l'organisation SignPath (UUID, visible en haut à droite de l'interface) |
| `SIGNPATH_PROJECT_SLUG` | slug du projet (ex: `lads`) |
| `SIGNPATH_SIGNING_POLICY_SLUG` | slug de la signing policy (ex: `release-signing`) |

## 4. Builder une release signée

Pousser un tag `v*` comme d'habitude. Le workflow :

1. build l'installeur Windows (non signé) ;
2. l'uploade comme artifact GitHub ;
3. soumet la requête de signature à SignPath ;
4. **attend l'approbation manuelle** (si la policy l'exige — penser à
   aller sur app.signpath.io pour approuver) ;
5. télécharge l'installeur signé et le publie dans la GitHub Release.

Aucun coût. L'horodatage (timestamp) est géré par SignPath.

## Vérifier une signature

Sur Windows, après téléchargement d'un installeur signé :

```powershell
Get-AuthenticodeSignature .\lads-0.2.0-setup.exe | Format-List
```

Doit afficher `Status: Valid` et un signataire de type
« SignPath Foundation ».

## Notes

- Les builds locaux (`npm run build:win`) restent non signés : la
  signature ne se fait que via GitHub Actions.
- Le certificat est **OV** : SmartScreen peut encore afficher un
  avertissement au tout premier téléchargement, le temps que la
  réputation se construise (plus rapide que sans signature, mais pas
  instantané).
- Chaque signature nécessite une **approbation manuelle** dans
  SignPath : prévoir d'aller valider la requête à chaque release.
