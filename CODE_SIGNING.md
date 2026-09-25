# Code signing policy

## Attribution

Free code signing provided by [SignPath.io](https://signpath.io),
certificate by [SignPath Foundation](https://signpath.org).

## Signed artifacts

- Windows installer packages (`*-setup.exe`) published on
  [GitHub Releases](https://github.com/Harkhenon/LADS/releases)
- Windows executables embedded in the installer (`lads.exe`) and the
  NSIS uninstaller

## Build and signing process

- Artifacts are built from this repository's source code by
  [GitHub Actions](https://github.com/Harkhenon/LADS/blob/main/.github/workflows/release.yaml)
  on GitHub-hosted runners — never on a local machine.
- Only CI-built artifacts are submitted to SignPath for signing.
- The private key of the certificate is held by SignPath (HSM-backed).
  This project never stores or handles the private key.
- Origin verification: the signing request references the GitHub
  workflow artifact, ensuring that only builds from the repository's
  CI can be signed.
- Each signing request is approved manually by a project member
  before SignPath signs the artifact.

## Team roles

- Committers and reviewers: [Harkhenon](https://github.com/Harkhenon)
- Approvers (signing requests): [Harkhenon](https://github.com/Harkhenon)
- All team members use multi-factor authentication for GitHub and
  SignPath access.

## Privacy

LADS does not collect, store or transmit any personal data. See the
application documentation for details about local data storage
(playlists are stored locally on the user's machine).
