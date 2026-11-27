# Verification record

Local verification: 2026-11-27, version 0.2.0, Windows, Node.js 22.23.4, npm 10, Chromium.

Marketplace rejected version 0.2.1 because bundled SVG files are unsupported. Version 0.2.2 replaces mock avatar assets with PNG and keeps SVG source artwork outside the package. Unit/E2E tests, static checks, production build, and VSIX contents were checked again; the package preflight was also verified to reject an SVG file. Marketplace validation of 0.2.2 remains pending.

- 46 unit tests: extraction, Sprint aggregation, hierarchy projection, row grouping, effort calculations, REST response mapping, batching, and retries.
- 23 Playwright tests: mock UI, checkbox filters, merged rows, avatars, completion percentages, Task-free Story hatching, themes, errors, response races, performance, and real-SDK iframe startup with synthetic host/API responses.
- ESLint, Prettier, strict production build, and local VSIX inspection.

Commands: see [Development](docs/development.md). Acceptance mapping: [Acceptance](docs/acceptance.md). Packaging: [Publishing](PUBLISHING.md).

The user reported successful Team selection and timeline display in Azure DevOps after the Team discovery fix. The full [manual smoke checklist](docs/manual-smoke.md), including the 0.2.0 changes, has not been completed. Local tests use synthetic data and do not establish full real-organization compatibility.
