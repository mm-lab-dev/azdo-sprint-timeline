# Verification record

Local verification was performed on 2026-11-27 with Node.js 22.23.4, npm 10, and Chromium on Windows. Publication metadata and package paths use the extension ID `azdo-sprint-timeline`.

The application has 28 unit tests covering extraction, Sprint ordering, aggregation, clipping, hierarchy handling, REST response formats, batching, and retry behavior. Fourteen Playwright tests cover the mock UI, filters, range changes, errors, response races, equal-width columns, keyboard input, dark mode, a 10-Sprint / 1000-row dataset, and real-SDK iframe startup with browser-native fetch.

The 0.1.0 browser fetch failure was reproduced locally: calling a captured native fetch as a client object's method throws `Illegal invocation` before sending HTTP. Version 0.1.1 preserves the browser receiver through a wrapper. The real-SDK iframe regression test failed before the fix and passed after it. Empty-Team recovery and a Team-list 403 are covered through the same SDK/HTTP/UI path. Host services and API responses in these tests are synthetic; no customer organization details are stored.

Run the checks described in [Development](docs/development.md). The detailed acceptance mapping and measurements are recorded in [Acceptance](docs/acceptance.md). Release packaging is described in [Publishing](PUBLISHING.md).

Local test success does not establish real-organization compatibility. SDK startup, host theme changes, permissions, and Work Item form navigation still require the [manual smoke test](docs/manual-smoke.md). A14 is awaiting verification with the updated VSIX in a real organization.
