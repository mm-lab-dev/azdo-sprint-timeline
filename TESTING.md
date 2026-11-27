# Verification record

Local verification was performed on 2026-11-27 with Node.js 22.23.4, npm 10, and Chromium on Windows. Publication metadata and package paths use the extension ID `azdo-sprint-timeline`.

The application has 28 unit tests covering extraction, Sprint ordering, aggregation, clipping, hierarchy handling, REST response formats, batching, and retry behavior. Eleven Playwright tests cover the mock UI, filters, range changes, errors, response races, equal-width columns, keyboard input, dark mode, and a 10-Sprint / 1000-row dataset.

Run the checks described in [Development](docs/development.md). The detailed acceptance mapping and measurements are recorded in [Acceptance](docs/acceptance.md). Release packaging is described in [Publishing](PUBLISHING.md).

Local test success does not establish real-organization compatibility. SDK startup, host theme changes, permissions, and Work Item form navigation still require the [manual smoke test](docs/manual-smoke.md). A14 remains unverified.
