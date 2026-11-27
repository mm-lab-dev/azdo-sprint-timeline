# Changelog

## 0.1.1 — Unreleased

- Fix browser-native fetch calls failing with `Illegal invocation` before the Team request was sent.
- Retry Team discovery when refreshing an empty or failed Team selection.
- Distinguish an empty Team list from an empty execution plan, and show the failing retrieval stage and HTTP status.
- Add real-SDK iframe tests using browser-native fetch, including empty-list recovery and permission failures.

## 0.1.0

- Add an Azure Boards hub with equal-width Sprint columns and a Feature / User Story / Task hierarchy.
- Aggregate execution periods from child Tasks, including Stories whose own Iteration Path is unplanned or outside the selected range.
- Add range selection, search, state and assignee filters, display modes, and hierarchy controls.
- Distinguish Sprints without Tasks, known continuation beyond the range, and unavailable parents.
- Add read-only Azure DevOps integration, a mock preview, automated tests, and local VSIX packaging.

Extension ID: `azdo-sprint-timeline`. Display name: **Sprint Timeline**. Initial organization testing exposed the Team discovery failure fixed in 0.1.1; complete real-organization verification remains pending.

The release package is prepared for a public Marketplace listing without a recipient organization.
