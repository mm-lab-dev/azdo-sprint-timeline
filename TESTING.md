# Verification record

Local verification: 2026-11-27, version 0.3.1, Windows, Node.js 22.23.4, npm 10, Chromium.

- 67 unit tests: extraction, Sprint aggregation, Bug retrieval and hierarchy, row grouping, effort calculations, REST response mapping, batching, retries, bilingual dictionaries, and filter preference validation.
- 37 Playwright tests: checkbox filters, Bug periods and navigation, merged rows, assigned/unassigned avatars, Task-only progress, themes, errors, response races, performance, and real-SDK iframe startup with synthetic host/API responses. Language selection, reload persistence, filter restoration, unavailable selections, blocked storage, and organization/user isolation are also covered.
- ESLint, Prettier, strict production build, and local VSIX inspection, including no packaged SVG files and matching release metadata.
- Light/dark screenshots reviewed; layouts from 360 to 1920px checked with equal-width Sprint columns and horizontal scrolling confined to the chart.

Marketplace rejected 0.2.1 because of bundled SVG images. Avatars use PNG, source SVGs stay outside the package, and the package preflight rejects SVG files. Marketplace validation and the full real-organization smoke checklist for 0.3.1 remain pending.

The user previously reported successful Team selection and timeline display in Azure DevOps. Local tests use synthetic data and do not establish full real-organization compatibility.

[Development](docs/development.md) · [Acceptance](docs/acceptance.md) · [Publishing](PUBLISHING.md) · [Manual smoke test](docs/manual-smoke.md)
