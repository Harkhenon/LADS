# Signature Windows — Azure Trusted Signing

Ce document décrit la mise en place de la signature de code pour les
installeurs Windows de LADS via **Azure Trusted Signing** (maintenant
« Azure Artifact Signing »). Sans signature, Windows Defender/SmartScreen
bloque le téléchargement et l'installation de l'application.

## Comment ça fonctionne

La signature s'active **automatiquement** si les secrets GitHub sont
présents, et uniquement dans ce cas :

- `electron-builder.cjs` lit les variables d'environnement au build et
  construit `win.azureSignOptions` si elles sont toutes définies ;
- le workflow `.github/workflows/release.yaml` injecte les secrets
  GitHub en variables d'environnement à l'étape « Build installer » ;
- sans les secrets, le build produit un installeur **non signé**
  (comportement historique, aucun échec).

Une fois un installeur signé, la signature reste valide **pour
toujours**, même si l'abonnement Azure est résilié ensuite (l'horodatage
RFC3161 est appliqué par défaut). On ne paie que pour signer de
nouveaux builds.

## 1. Créer les ressources Azure (une seule fois)

1. Créer un compte Azure (abonnement pay-as-you-go suffit).
2. Dans le portail Azure, créer une ressource **Trusted Signing Account**
   (ou « Code Signing Account ») :
   - choisir une région (ex: `West Europe` → endpoint `weu`), noter
     l'**Account Name** ;
   - le **endpoint** a la forme `https://<region>.codesigning.tbs.azure.com`.
3. Dans ce compte, créer un **Certificate Profile** (ex:
   `lads-certificate-profile`) et lancer la **validation d'identité**
   (identity validation) : c'est l'étape la plus longue (1 à 3 semaines).
   Le **publisher name** doit correspondre au nom validé (ex:
   `Harkhenon`).
4. Créer une **application Entra ID** (App registration) pour la CI :
   - noter le **Client ID** et le **Tenant ID** ;
   - générer un **Client Secret** ;
   - dans le Trusted Signing Account, ajouter un **access control**
     (IAM) : rôle *Code Signing Signer* / contributor pour cette
     application.

## 2. Renseigner les secrets GitHub

Dans le repo : *Settings → Secrets and variables → Actions → New
repository secret* :

| Secret | Valeur (exemple) |
|---|---|
| `AZURE_CLIENT_ID` | Client ID de l'app Entra ID |
| `AZURE_TENANT_ID` | Tenant ID de l'app Entra ID |
| `AZURE_CLIENT_SECRET` | Secret de l'app Entra ID |
| `AZURE_CODE_SIGNING_ENDPOINT` | `https://weu.codesigning.tbs.azure.com` |
| `AZURE_CODE_SIGNING_ACCOUNT_NAME` | `lads-signing-account` |
| `AZURE_CODE_SIGNING_CERT_PROFILE_NAME` | `lads-certificate-profile` |
| `AZURE_CODE_SIGNING_PUBLISHER_NAME` | `Harkhenon` (nom validé chez Azure) |

## 3. Builder une release signée

Rien à faire de spécial : pousser un tag `v*` comme d'habitude. Le
workflow détecte les secrets, active `azureSignOptions`, et
electron-builder :

1. installe le module PowerShell `TrustedSigning` sur le runner ;
2. signe `lads.exe`, l'installeur NSIS et les fichiers de mise à jour
   (`.exe` du bloc `latest.yml`) ;
3. applique l'horodatage Microsoft (`timestamp.acs.microsoft.com`).

Le coût est d'environ **$9.99/mois** pour 5 000 signatures/mois — on
peut activer l'abonnement le mois d'une release puis le suspendre.

## Vérifier une signature

Sur Windows, après téléchargement d'un installeur signé :

```powershell
Get-AuthenticodeSignature .\lads-0.1.6-setup.exe | Format-List
```

Doit afficher `Status: Valid` et le signataire « Microsoft Trusted
Signing » au nom du publisher validé.

## Notes

- Les builds locaux (`npm run build:win`) restent non signés : les
  variables ne sont pas dans l'environnement local.
- La réputation SmartScreen d'un **nouveau** publisher met un certain
  temps à s'établir : les tout premiers téléchargements peuvent encore
  afficher un écran d'avertissement (moins fréquent qu'en non signé).
- Si un secret manque ou est erroné, le build de l'installeur échoue
  avec une erreur explicite côté Azure (403/401) — retirer le secret
  fautif ou tous les désactiver pour revenir au build non signé.
