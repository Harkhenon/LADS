// Versions et empreintes SHA-256 des outils téléchargés au premier lancement.
// Un fichier dont l'empreinte diffère est refusé : même une release GitHub compromise ne passe pas.
// Mise à jour : voir docs/RELEASE.md (section « Mettre à jour les outils embarqués »).
//
// yt-dlp n'est volontairement pas épinglé : YouTube casse régulièrement les anciennes versions.
// Il suit la dernière release, vérifiée contre le fichier SHA2-256SUMS qu'elle publie.

export const DENO = {
  version: '2.9.8',
  baseUrl: 'https://github.com/denoland/deno/releases/download/v2.9.8',
  assets: {
    'win32-x64': {
      name: 'deno-x86_64-pc-windows-msvc.zip',
      sha256: 'cba84b26e0df5ae7f74fc66b86a95b866872a86292ebd84fa1e959927edd93bf'
    },
    'win32-arm64': {
      name: 'deno-aarch64-pc-windows-msvc.zip',
      sha256: 'b413b92b735b50c198e8fe3b85af1aa50e29d5f72e229aab701d132286e14cef'
    },
    'linux-x64': {
      name: 'deno-x86_64-unknown-linux-gnu.zip',
      sha256: 'e890975bc2549807bbcc0b584ffafda72cc7c93349dd99c80483dd784f6c4609'
    },
    'linux-arm64': {
      name: 'deno-aarch64-unknown-linux-gnu.zip',
      sha256: 'd49596c20b9788cf8f5d8ddf644103d4bde56ed239753f0bdb92ba9361d51905'
    },
    'darwin-x64': {
      name: 'deno-x86_64-apple-darwin.zip',
      sha256: '4b2f5edd2639b7470f034238b321d7002d8dfb4726d8558f52c17afac370eb2c'
    },
    'darwin-arm64': {
      name: 'deno-aarch64-apple-darwin.zip',
      sha256: '9f0bf660393da2eaff044cdc7444cb08c73f235849b61d224d825a194ce7c98e'
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
    },
    // Pas de build arm64 pour Windows : le binaire x64 tourne via l'émulation intégrée.
    'win32-arm64': {
      name: 'ffmpeg-win32-x64',
      sha256: '04e1307997530f9cf2fe35cba2ca7e8875ca91da02f89d6c7243df819c94ad00'
    },
    'linux-x64': {
      name: 'ffmpeg-linux-x64',
      sha256: 'e7e7fb30477f717e6f55f9180a70386c62677ef8a4d4d1a5d948f4098aa3eb99'
    },
    'linux-arm64': {
      name: 'ffmpeg-linux-arm64',
      sha256: '6bb182d0d75d23028db82e9e4f723ca69b853d055698486e6984ddb2c06fb8ce'
    },
    'darwin-x64': {
      name: 'ffmpeg-darwin-x64',
      sha256: 'ebdddc936f61e14049a2d4b549a412b8a40deeff6540e58a9f2a2da9e6b18894'
    },
    'darwin-arm64': {
      name: 'ffmpeg-darwin-arm64',
      sha256: 'a90e3db6a3fd35f6074b013f948b1aa45b31c6375489d39e572bea3f18336584'
    }
  }
}

export const YT_DLP = {
  baseUrl: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download',
  sumsFile: 'SHA2-256SUMS',
  assets: {
    'win32-x64': 'yt-dlp.exe',
    'win32-arm64': 'yt-dlp_arm64.exe',
    'linux-x64': 'yt-dlp_linux',
    'linux-arm64': 'yt-dlp_linux_aarch64',
    'darwin-x64': 'yt-dlp_macos',
    'darwin-arm64': 'yt-dlp_macos'
  }
}

export function platformKey(platform = process.platform, arch = process.arch) {
  return `${platform}-${arch}`
}
