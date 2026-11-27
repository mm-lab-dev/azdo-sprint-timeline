# Sprint Timeline

View your Azure Boards work across Sprints. Sprint Timeline brings Epics, Features, User Stories, and Tasks into one read-only timeline, with one equal-width column per Sprint.

A Story's period includes its child Tasks' Sprints, even when the Story itself is unplanned or assigned to a different Sprint.

![Sprint Timeline with synthetic demo data](https://raw.githubusercontent.com/mm-lab-dev/azdo-sprint-timeline/main/resources/readme/overview.png)

## Install and open

Install [Sprint Timeline from Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=mm-lab.azdo-sprint-timeline) into your Azure DevOps organization. Installation requires an authorized administrator.

Open an Agile project and choose **Boards → Sprint Timeline**. Select a **Team**, a start Sprint, and an end Sprint.

## Explore your plan

- Choose any combination of **Epic / Feature / US / Task**. Hidden levels are skipped in the tree; their work still contributes to parent periods.
- Search by ID or title, and select multiple states or assignees with the checkbox filters.
- Items of the same type, with the same actual parent and exactly the same title, share a row. Select the row or bar to choose an original Work Item and open its Azure DevOps form.
- Bars show assignee avatars and a small completion percentage: **(Original Estimate − Remaining Work) / Original Estimate × 100**. Parent percentages use summed estimates and remaining work. Values below 0% or above 100% are shown as calculated. Missing or zero estimates produce no percentage; an asterisk marks a partial estimate.

The timeline follows Azure DevOps light and dark themes. The interface currently uses Japanese labels.

![Sprint Timeline in dark mode](https://raw.githubusercontent.com/mm-lab-dev/azdo-sprint-timeline/main/resources/readme/dark.png)

## Read the bars

A Task occupies its assigned Sprint. A Story spans its own valid Sprint and the Sprints of its fetched child Tasks. Features and Epics inherit their descendants' periods; their own Iteration Paths do not determine their bars.

Hatching marks Sprints without fetched Tasks within an aggregated period. A Story with no fetched Tasks still appears in its own Sprint, with a hatched bar. Arrows indicate known continuation beyond the selected range. Each Sprint has the same column width, regardless of its duration.

The plan covers the selected team's Areas and Sprint range. Tasks outside that range and unplanned siblings are not fetched. Filtering or collapsing rows does not recalculate the periods. If some data cannot be retrieved, available items remain visible with a warning.

## Compatibility and privacy

Supports **Azure DevOps Services**, one project and team at a time, and the standard **Agile** Epic → Feature → User Story → Task hierarchy. Scrum, Basic, and custom work item types are not supported.

The extension requests read-only Work Item and project access. It does not modify Work Items, require a PAT, persist Work Item data or tokens, send work data to an external backend, or collect telemetry.

For help, [report an issue](https://github.com/mm-lab-dev/azdo-sprint-timeline/issues). See the [changelog](https://github.com/mm-lab-dev/azdo-sprint-timeline/blob/main/CHANGELOG.md) for updates.

Independent project; not affiliated with or endorsed by Microsoft. [MIT License](https://github.com/mm-lab-dev/azdo-sprint-timeline/blob/main/LICENSE).
