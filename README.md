# LADS

**Application de gestion de playlists et téléchargement YouTube** – Une application desktop cross-platform construite avec **Electron**, **React** et **Mantine UI**.

> **Version** : 0.0.1
> **Auteur** : [Harkhenon](https://harkhenon.dev) (isoka33@gmail.com)
> **Licence** : MIT

---

## 📋 À propos du projet

LADS est une application de **gestion de playlists et de téléchargement YouTube**, conçue spécifiquement pour les animations de l'association **"Regards étoilés"**. Elle permet de :
- Créer et organiser des playlists.
- Télécharger des vidéos YouTube pour une utilisation hors ligne.
- Gérer les médias de manière intuitive.

---

## 🛠 Stack Technique

| Technologie       | Version   | Description                                  |
|-------------------|-----------|----------------------------------------------|
| **Electron**      | 32.0.0    | Framework pour applications desktop.        |
| **React**         | 19.2.1    | Bibliothèque pour les interfaces utilisateur.|
| **Vite**          | 7.2.6     | Outil de build rapide pour le frontend.     |
| **electron-vite** | 5.0.0     | Intégration de Vite avec Electron.           |
| **Mantine UI**    | 9.6.0     | Composants UI modernes et accessibles.    |

---

## 📥 Installation
Téléchargez la dernière version de LADS depuis les **[releases GitHub](https://github.com/Harkhenon/LADS/releases)** et installez le fichier `.exe`.

---

## 📧 Support
Pour toute question ou problème, contactez :
- **Email** : [isoka33@gmail.com](mailto:isoka33@gmail.com)
- **Site web** : [https://harkhenon.dev](https://harkhenon.dev)

---

## 🔄 Mises à jour automatiques

LADS vérifie les mises à jour depuis `https://api.harkhenon.dev/lads` (provider generic d'electron-updater).

### Chaîne de publication

```
tag git (v*) ──▶ GitHub Actions ──▶ GitHub Release (exe + latest.yml)
                        │
                        ▼
        scripts/sync-updates.sh (sur harkhenon.dev)
                        │
                        ▼
        https://api.harkhenon.dev/lads ──▶ electron-updater (app)
```

1. **CI** : à chaque push d'un tag `v*`, le workflow `.github/workflows/release.yaml` build l'installeur Windows et publie `lads-<version>-setup.exe` + `latest.yml` sur une GitHub Release.
2. **Serveur** : `scripts/sync-updates.sh` télécharge les assets de la dernière release GitHub vers le dossier servi par le serveur web (cron recommandé).
3. **App** : au démarrage (et via l'onglet Accueil), l'app interroge `https://api.harkhenon.dev/lads/latest.yml` et propose le téléchargement/la mise à jour.

### Publier une nouvelle version

```bash
# 1. Mettre à jour la version dans package.json
npm version patch   # ou minor / major

# 2. Pousser le tag (déclenche le build + la release)
git push origin main --tags   # depuis dev : git push origin dev --tags

# 3. Sur harkhenon.dev, synchroniser le serveur
./scripts/sync-updates.sh /var/www/api.harkhenon.dev/lads
```
