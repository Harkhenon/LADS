// Configuration electron-builder pour LADS.
//
// La signature Windows (Azure Trusted Signing) s'active automatiquement
// si les variables d'environnement suivantes sont définies — voir docs/SIGNING.md :
//   AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_CLIENT_SECRET
//   AZURE_CODE_SIGNING_ENDPOINT, AZURE_CODE_SIGNING_ACCOUNT_NAME,
//   AZURE_CODE_SIGNING_CERT_PROFILE_NAME, AZURE_CODE_SIGNING_PUBLISHER_NAME
// Sans ces variables, le build Windows reste non signé (comportement historique).

const azureSignOptions =
  process.env.AZURE_CLIENT_ID &&
  process.env.AZURE_TENANT_ID &&
  process.env.AZURE_CLIENT_SECRET &&
  process.env.AZURE_CODE_SIGNING_ENDPOINT &&
  process.env.AZURE_CODE_SIGNING_ACCOUNT_NAME &&
  process.env.AZURE_CODE_SIGNING_CERT_PROFILE_NAME
    ? {
        publisherName: process.env.AZURE_CODE_SIGNING_PUBLISHER_NAME,
        endpoint: process.env.AZURE_CODE_SIGNING_ENDPOINT,
        certificateProfileName: process.env.AZURE_CODE_SIGNING_CERT_PROFILE_NAME,
        codeSigningAccountName: process.env.AZURE_CODE_SIGNING_ACCOUNT_NAME
      }
    : null

module.exports = {
  appId: 'com.electron.app',
  productName: 'lads',
  directories: {
    buildResources: 'build'
  },
  files: [
    '!**/.vscode/*',
    '!src/*',
    '!electron.vite.config.{js,ts,mjs,cjs}',
    '!{.eslintcache,eslint.config.mjs,.prettierignore,.prettierrc.yaml,dev-app-update.yml,CHANGELOG.md,README.md}',
    '!{.env,.env.*,.npmrc,pnpm-lock.yaml}'
  ],
  asarUnpack: ['resources/**'],
  win: {
    executableName: 'lads',
    ...(azureSignOptions ? { azureSignOptions } : {})
  },
  nsis: {
    artifactName: '${name}-${version}-setup.${ext}',
    shortcutName: '${productName}',
    uninstallDisplayName: '${productName}',
    createDesktopShortcut: 'always'
  },
  mac: {
    entitlementsInherit: 'build/entitlements.mac.plist',
    extendInfo: {
      NSCameraUsageDescription: "Application requests access to the device's camera.",
      NSMicrophoneUsageDescription: "Application requests access to the user's microphone.",
      NSDocumentsFolderUsageDescription:
        "Application requests access to the user's Documents folder.",
      NSDownloadsFolderUsageDescription:
        "Application requests access to the user's Downloads folder."
    },
    notarize: false
  },
  dmg: {
    artifactName: '${name}-${version}.${ext}'
  },
  linux: {
    target: ['AppImage'],
    maintainer: 'isoka33@gmail.com',
    category: 'Utility',
    artifactName: '${name}-${version}.${ext}',
    syncDesktopName: true
  },
  appImage: {
    artifactName: '${name}-${version}.${ext}'
  },
  npmRebuild: false,
  publish: [
    {
      provider: 'generic',
      url: 'https://api.harkhenon.dev/lads'
    }
  ]
}
