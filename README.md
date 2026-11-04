# LADS

**Application de gestion de playlists et téléchargement YouTube** – Une application desktop cross-platform construite avec **Electron**, **React** et **Mantine UI**.

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

| Technologie       | Version | Description                                   |
| ----------------- | ------- | --------------------------------------------- |
| **Electron**      | 45      | Framework pour applications desktop.          |
| **React**         | 19      | Bibliothèque pour les interfaces utilisateur. |
| **Vite**          | 8       | Outil de build rapide pour le frontend.       |
| **electron-vite** | 6       | Intégration de Vite avec Electron.            |
| **Mantine UI**    | 9       | Composants UI modernes et accessibles.        |

---

## 📥 Installation

Téléchargez la dernière version de LADS depuis les **[releases GitHub](https://github.com/Harkhenon/LADS/releases)** et installez le fichier `.exe`.

---

## 💻 Développement

Prérequis : Node.js 24 (voir `.nvmrc`).

```bash
npm install
```

```bash
npm run dev
```

En mode développement, les téléchargements et les mises à jour sont simulés.

| Commande                   | Rôle                           |
| -------------------------- | ------------------------------ |
| `npm run check`            | Lint et tests                  |
| `npm run format`           | Mise en forme du code          |
| `npm run build:win`        | Construit l'installeur Windows |
| `npm run release -- patch` | Publie une nouvelle version    |

---

## 🔄 Publication et mises à jour

LADS vérifie les mises à jour sur les [releases GitHub](https://github.com/Harkhenon/LADS/releases). Pour publier une version ou signer l'exécutable, voir **[docs/RELEASE.md](docs/RELEASE.md)**.

---

## 📧 Support

Pour toute question ou problème, contactez :

- **Email** : [isoka33@gmail.com](mailto:isoka33@gmail.com)
- **Site web** : [https://harkhenon.dev](https://harkhenon.dev)
