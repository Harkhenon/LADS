// Versions et empreintes SHA-256 de ce que LADS télécharge.
// Un fichier dont l'empreinte diffère est refusé : même une release GitHub compromise ne passe pas.
// Mise à jour : voir docs/RELEASE.md (section « Mettre à jour les outils embarqués »).
//
// yt-dlp n'est volontairement pas épinglé : YouTube casse régulièrement les anciennes versions.
// Il suit la dernière release, vérifiée contre le fichier SHA2-256SUMS qu'elle publie.

// Exécute LADS. Le fichier signé par OpenJS passe Smart App Control.
export const NODE_RUNTIME = {
  version: '24.22.2',
  baseUrl: 'https://nodejs.org/dist/v24.22.2',
  assets: {
    'win32-x64': {
      name: 'node-v24.22.2-win-x64.zip',
      sha256: 'ca1bff5d8ead13c9f2ea404a176db46bd430704d5b5113734049fa365e7799e2'
    }
  }
}

export const FFMPEG = {
  version: 'b6.1.1',
  baseUrl: 'https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1',
  assets: {
    'win32-x64': {
      name: 'ffmpeg-win32-x64',
      sha256: '04e1307997530f9cf2fe35cba2ca7e8875ca91da02f89d6c7243df819c94ad00'
    }
  }
}

export const YT_DLP = {
  baseUrl: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download',
  sumsFile: 'SHA2-256SUMS',
  assets: {
    'win32-x64': 'yt-dlp.exe'
  }
}

export function platformKey(platform = process.platform, arch = process.arch) {
  return `${platform}-${arch}`
}
