# Installs LADS for the current user, without administrator rights.
# Run once per PC: see docs/RELEASE.md. Placeholder values are filled in for each release.
# ASCII only on purpose: Windows PowerShell 5.1 misreads accents in a file without a BOM.
#
# Everything downloaded is checked by hash before use.
param(
  [string]$InstallDir = (Join-Path $env:LOCALAPPDATA 'Programs\LADS'),
  [string]$AppBaseUrl = '@@APP_BASE_URL@@',
  [string]$NodeBaseUrl = '@@NODE_BASE_URL@@',
  [string]$ShortcutPath = (Join-Path ([Environment]::GetFolderPath('Desktop')) 'LADS.lnk')
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$version = '@@VERSION@@'
$appFile = '@@APP_FILE@@'
$appSha256 = '@@APP_SHA256@@'
$nodeVersion = '@@NODE_VERSION@@'
$nodeFile = '@@NODE_FILE@@'
$nodeSha256 = '@@NODE_SHA256@@'

function Get-Verified([string]$Url, [string]$Destination, [string]$Expected) {
  Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $Destination
  $actual = (Get-FileHash -LiteralPath $Destination -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $Expected) {
    throw "Empreinte invalide pour $Url : installation annulee."
  }
}

$temp = Join-Path ([IO.Path]::GetTempPath()) ("lads-install-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $temp | Out-Null
try {
  Write-Host "Installation de LADS $version dans $InstallDir"

  $runtimeDir = Join-Path $InstallDir "runtimes\$nodeVersion"
  $nodeExe = Join-Path $runtimeDir 'node.exe'
  if (-not (Test-Path -LiteralPath $nodeExe)) {
    Write-Host "Telechargement de Node.js $nodeVersion..."
    $nodeZip = Join-Path $temp $nodeFile
    Get-Verified "$NodeBaseUrl/$nodeFile" $nodeZip $nodeSha256
    $extracted = Join-Path $temp 'node'
    Expand-Archive -LiteralPath $nodeZip -DestinationPath $extracted
    New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
    Copy-Item -LiteralPath (Get-ChildItem -LiteralPath $extracted -Recurse -Filter node.exe | Select-Object -First 1).FullName -Destination $nodeExe
  }

  Write-Host "Telechargement de LADS..."
  $appZip = Join-Path $temp $appFile
  Get-Verified "$AppBaseUrl/$appFile" $appZip $appSha256
  $versionDir = Join-Path $InstallDir "versions\$version"
  if (Test-Path -LiteralPath $versionDir) { Remove-Item -LiteralPath $versionDir -Recurse -Force }
  New-Item -ItemType Directory -Force -Path $versionDir | Out-Null
  Expand-Archive -LiteralPath $appZip -DestinationPath $versionDir

  $launcher = Join-Path $InstallDir 'launcher.mjs'
  Copy-Item -LiteralPath (Join-Path $versionDir 'launcher.mjs') -Destination $launcher -Force
  Copy-Item -LiteralPath (Join-Path $versionDir 'icon.ico') -Destination (Join-Path $InstallDir 'icon.ico') -Force

  $state = @{ version = $version; runtime = $nodeExe; pendingConfirm = $false } | ConvertTo-Json
  [IO.File]::WriteAllText((Join-Path $InstallDir 'state.json'), $state, (New-Object Text.UTF8Encoding($false)))

  $shortcut = (New-Object -ComObject WScript.Shell).CreateShortcut($ShortcutPath)
  $shortcut.TargetPath = $nodeExe
  $shortcut.Arguments = "`"$launcher`""
  $shortcut.WorkingDirectory = $InstallDir
  $shortcut.IconLocation = Join-Path $InstallDir 'icon.ico'
  $shortcut.Description = 'LADS - Les Animations De Sybille'
  $shortcut.WindowStyle = 7
  $shortcut.Save()

  Write-Host "LADS est installe : utilisez l'icone LADS sur le Bureau."
} finally {
  Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue
}
