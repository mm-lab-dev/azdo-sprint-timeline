import { mkdirSync, writeFileSync } from "node:fs";
import { largeItems, largeSprints } from "../../../fixtures/large";
import { buildPlan, visibleRows } from "./plan";
test("10Sprint / 1000行の集約・可視行変換を実測", () => {
  const graph = {
    items: largeItems,
    seedIds: largeItems.filter((i) => i.type === "Task").map((i) => i.id),
    warnings: [],
  };
  const expanded = new Set(largeItems.map((i) => i.id));
  const timings: number[] = [];
  for (let i = 0; i < 20; i++) {
    const start = performance.now();
    const p = buildPlan(graph, largeSprints, [0, 9]);
    const rows = visibleRows(
      p,
      {
        search: "",
        types: ["Feature", "User Story", "Task"],
        states: null,
        assignees: null,
      },
      expanded,
    );
    timings.push(performance.now() - start);
    expect(rows).toHaveLength(1000);
  }
  mkdirSync("artifacts", { recursive: true });
  writeFileSync(
    "artifacts/performance-domain.json",
    JSON.stringify(
      {
        sprints: 10,
        rows: 1000,
        iterations: 20,
        meanMs: timings.reduce((a, b) => a + b, 0) / timings.length,
        maxMs: Math.max(...timings),
      },
      null,
      2,
    ),
  );
});
