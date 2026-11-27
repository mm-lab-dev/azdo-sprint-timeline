# 0.1.1 public release preparation

Extension ID: `azdo-sprint-timeline`. Display name: **Sprint Timeline**. Publisher: `mm-lab`.

Source repository: https://github.com/mm-lab-dev/azdo-sprint-timeline

The manifest is prepared for a public Marketplace listing (`public:true`). No recipient Azure DevOps organization is specified. Packaging is local; uploading and making the extension available through Marketplace are separate operations and have not been performed.

## Build and review

```powershell
npm run package:vsix
```

This generates `artifacts/mm-lab.azdo-sprint-timeline-0.1.1.vsix`. The default publisher is taken from the manifest. Use `AZDO_PUBLISHER` only when building for a different authorized publisher.

Review the README, listing images, icon, MIT license, third-party notices, and [verification record](TESTING.md). The package contains production web assets and listing documentation. Tests, fixtures, dependency directories, caches, credentials, customer organization names, and local absolute paths are excluded.

Regenerate the icon and screenshots with synthetic data:

```powershell
npm run start:mock
# In another terminal:
npm run assets:listing
```

## Publish through Marketplace

1. Sign in to [Marketplace publisher management](https://marketplace.visualstudio.com/manage) using an account that can publish under `mm-lab`.
2. Select `mm-lab`, then **New extension → Azure DevOps**, and upload the reviewed VSIX. For an existing listing, use its update action instead.
3. Confirm the public listing settings and complete any Marketplace validation or additional review.
4. Once available, an authorized administrator can install the extension into their Azure DevOps organization from the public listing.

No recipient organization or private sharing step is needed. The previous 403 indicates that the publishing identity's permissions need to be resolved before upload. Publisher access is managed separately from an organization's extension-installation permissions.

An optional CLI alternative, when publishing has been explicitly authorized:

```powershell
npx tfx extension publish `
  --publisher mm-lab `
  --vsix artifacts/mm-lab.azdo-sprint-timeline-0.1.1.vsix `
  --auth-type pat
```

The PAT belongs to an identity with publishing rights under `mm-lab` and needs the Marketplace Publish scope. Never save it in repository files, scripts, command examples, or distributable packages.

## Release verification

- Confirm that the source repository, README/support links, package and lockfile names, publisher, version, and extension manifest match.
- Check the VSIX file list, public flag, Hub URI, local asset references, and SHA-256. A local package inspection record is stored under `artifacts/` and is excluded from Git.
- Complete the [real-organization smoke test](docs/manual-smoke.md) before declaring A14 passed. It remains unverified. If pre-release installation requires a separate private development extension, configure its recipient interactively outside tracked files.
- Increment the extension version for every Marketplace update.

Preparing this source commit does not push it to GitHub or upload the VSIX. Actual publication and installation remain pending.

Official instructions: [Package and publish extensions](https://learn.microsoft.com/en-us/azure/devops/extend/publish/overview?view=azure-devops).
