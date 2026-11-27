# Verification record

Local verification: 2026-11-27, version 0.2.0, Windows, Node.js 22.23.4, npm 10, Chromium.

Version 0.2.1 repackages the same application with updated release metadata. Production build and VSIX version consistency were checked again.

- 46 unit tests: extraction, Sprint aggregation, hierarchy projection, row grouping, effort calculations, REST response mapping, batching, and retries.
- 23 Playwright tests: mock UI, checkbox filters, merged rows, avatars, completion percentages, Task-free Story hatching, themes, errors, response races, performance, and real-SDK iframe startup with synthetic host/API responses.
- ESLint, Prettier, strict production build, and local VSIX inspection.

Commands: see [Development](docs/development.md). Acceptance mapping: [Acceptance](docs/acceptance.md). Packaging: [Publishing](PUBLISHING.md).

The user reported successful Team selection and timeline display in Azure DevOps after the Team discovery fix. The full [manual smoke checklist](docs/manual-smoke.md), including the 0.2.0 changes, has not been completed. Local tests use synthetic data and do not establish full real-organization compatibility.
