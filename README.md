# LADS

**Application de gestion de playlists et de téléchargement YouTube** pour les animations de l'association **"Regards étoilés"**. Elle tourne sur le PC de l'utilisateur, sans serveur distant, et se met à jour toute seule.

> **Auteur** : [Harkhenon](https://harkhenon.dev) (isoka33@gmail.com)
> **Licence** : MIT

---

## 📋 À propos du projet

LADS permet de :

- Créer et organiser des playlists.
- Télécharger des vidéos YouTube pour une utilisation hors ligne.
- Animer une séance avec un lecteur en plein écran.

---

## 🛠 Fonctionnement

| Élément                | Rôle                                                        |
| ---------------------- | ----------------------------------------------------------- |
| **Node.js**            | Exécute un petit serveur accessible uniquement depuis le PC |
| **React**, **Mantine** | Interface, ouverte dans Edge ou Chrome                      |
| **yt-dlp**, **ffmpeg** | Téléchargement, installés au premier usage                  |

Windows uniquement. Détails sur la sécurité et les mises à jour : **[docs/RELEASE.md](docs/RELEASE.md)**.

---

## 📥 Installation

Voir [Installer LADS sur un PC](docs/RELEASE.md#installer-lads-sur-un-pc-une-seule-fois).

---

## 💻 Développement

Prérequis : Node.js 24 (voir `.nvmrc`).

```bash
npm install
```

```bash
npm run dev
```

Puis ouvrez `http://localhost:5173`. La recherche et les téléchargements sont réels, les mises à jour automatiques sont désactivées.

| Commande                   | Rôle                        |
| -------------------------- | --------------------------- |
| `npm run check`            | Lint et tests               |
| `npm run format`           | Mise en forme du code       |
| `npm run build`            | Compile l'application       |
| `npm run release -- patch` | Publie une nouvelle version |

---

## 📧 Support

Pour toute question ou problème, contactez :

- **Email** : [isoka33@gmail.com](mailto:isoka33@gmail.com)
- **Site web** : [https://harkhenon.dev](https://harkhenon.dev)
