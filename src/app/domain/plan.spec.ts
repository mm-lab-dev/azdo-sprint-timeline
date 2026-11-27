import { formatMessage } from "../i18n/messages";
import { items, sprints } from "../../../fixtures/mock";
import {
  buildPlan,
  initialRange,
  inAreas,
  seedItems,
  sortSprints,
  visibleRows,
} from "./plan";
import { Filters, GraphResult, Item, Plan, PlanNode } from "./model";
const filters: Filters = {
  search: "",
  types: ["Feature", "User Story", "Task"],
  states: null,
  assignees: null,
};
function graph(start = 1, end = 3): GraphResult {
  return {
    items,
    seedIds: seedItems(
      items,
      "Demo",
      [{ path: "Demo\\Platform", includeChildren: true }],
      sprints.slice(start, end + 1),
    ).map((i) => i.id),
    warnings: [],
  };
}
function find(plan: Plan, id: number): PlanNode {
  const stack = [...plan.roots];
  while (stack.length) {
    const n = stack.pop()!;
    if (n.item.id === id) return n;
    stack.push(...n.children);
  }
  throw new Error(`Missing ${id}`);
}
describe("受け入れ条件: Sprint期間集約", () => {
  test("BugをUSと同じ階層で取得・集約し、未計画Bugも子Taskから保持する", () => {
    const bug: Item = {
      ...items[1],
      id: 501,
      type: "Bug",
      iterationPath: "Demo",
    };
    const data: Item[] = [
      items[0],
      bug,
      { ...items[2], id: 601, parentId: 501 },
      {
        ...items[2],
        id: 602,
        title: "別Sprintの修正Task",
        parentId: 501,
        iterationPath: sprints[3].path,
      },
      { ...bug, id: 502, title: "単独のBug", iterationPath: sprints[2].path },
      { ...bug, id: 503 },
      { ...bug, id: 504, iterationPath: sprints[4].path },
      {
        ...bug,
        id: 505,
        iterationPath: sprints[2].path,
        areaPath: "Demo\\Experience",
      },
    ];
    const seeds = seedItems(
      data,
      "Demo",
      [{ path: "Demo\\Platform", includeChildren: true }],
      sprints.slice(1, 4),
    );
    expect(seeds.map((i) => i.id)).toEqual([601, 602, 502]);
    const plan = buildPlan(
      { items: data, seedIds: seeds.map((i) => i.id), warnings: [] },
      sprints,
      [1, 3],
    );
    expect(plan.warnings).toEqual([]);
    expect(find(plan, 501).interval).toEqual([1, 3]);
    expect(find(plan, 501).taskSprints).toEqual([1, 3]);
    expect(find(plan, 502).interval).toEqual([2, 2]);
    expect(find(plan, 502).taskSprints).toEqual([]);
    const rows = visibleRows(
      plan,
      { ...filters, types: ["Feature", "Task"] },
      new Set([1, 501]),
    );
    expect(rows.map((r) => [r.node.item.id, r.depth])).toEqual([
      [1, 0],
      [601, 1],
      [602, 1],
    ]);
    expect(find(plan, 1).interval).toEqual([1, 3]);
    expect(
      visibleRows(plan, { ...filters, types: ["Bug"] }, new Set()).map(
        (r) => r.node.item.id,
      ),
    ).toEqual([501, 502]);
  });
  test("Featureより上のEpicを除外し、各Featureを警告なしのルートにする", () => {
    const data = items.map((i) =>
      i.type === "Feature" ? { ...i, parentId: 900 } : i,
    );
    data.push({
      ...items[0],
      id: 900,
      type: "Epic",
      parentId: 999,
      iterationPath: sprints[5].path,
    });
    const plan = buildPlan(
      { items: data, seedIds: [201, 202, 302], warnings: [] },
      sprints,
      [1, 3],
    );
    expect(plan.roots.map((n) => n.item.id).sort()).toEqual([1, 2]);
    expect(plan.roots.every((n) => !n.orphan)).toBe(true);
    expect(plan.warnings).toEqual([]);
    expect(plan.hierarchyWarnings).toEqual([]);
    expect(() => find(plan, 900)).toThrow();
    expect(find(plan, 101).interval).toEqual([1, 2]);
    expect(find(plan, 2).interval).toEqual([2, 3]);
  });
  test("Featureの親が未取得でも表示範囲外なので警告しない", () => {
    const data = items.map((i) =>
      i.type === "Feature" ? { ...i, parentId: 999 } : i,
    );
    const plan = buildPlan(
      { items: data, seedIds: [202], warnings: [] },
      sprints,
      [2, 2],
    );
    expect(plan.roots.map((n) => n.item.id)).toEqual([1]);
    expect(plan.warnings).toEqual([]);
    expect(plan.roots[0].orphan).toBe(false);
    expect(find(plan, 101).interval).toEqual([1, 2]);
  });
  test("A01 TaskのSprintがUS自身のSprintを越えて集約される", () => {
    const p = buildPlan(graph(), sprints, [1, 3]);
    expect(find(p, 101).interval).toEqual([1, 2]);
    expect(find(p, 201).interval).toEqual([1, 1]);
    expect(find(p, 202).interval).toEqual([2, 2]);
  });
  test("USが未計画でもTaskだけで期間を算出する", () => {
    const p = buildPlan(graph(), sprints, [1, 3]);
    expect(find(p, 102).interval).toEqual([1, 3]);
  });
  test("A02 S2のみで範囲外親とFeatureを保持、S1 Taskは除外、継続をクリップ", () => {
    const p = buildPlan(graph(2, 2), sprints, [2, 2]);
    expect(find(p, 101).interval).toEqual([1, 2]);
    expect(find(p, 101).visibleInterval).toEqual([2, 2]);
    expect(find(p, 1)).toBeDefined();
    expect(() => find(p, 201)).toThrow();
  });
  test("A03 Feature自身のIterationは無視し未計画Featureも集約", () => {
    const p = buildPlan(graph(), sprints, [1, 3]);
    expect(find(p, 1).interval).toEqual([1, 3]);
    expect(find(p, 2).interval).toEqual([0, 3]);
  });
  test("A04 未計画兄弟を含めない", () => {
    const p = buildPlan(graph(), sprints, [1, 3]);
    expect(() => find(p, 103)).toThrow();
    expect(() => find(p, 203)).toThrow();
    expect(() => find(p, 301)).toThrow();
  });
  test("A05 子なしUSは自身のSprint", () => {
    const p = buildPlan(graph(2, 2), sprints, [2, 2]);
    expect(find(p, 104).interval).toEqual([2, 2]);
  });
  test("A06 連続包絡と実Task所在を区別", () => {
    const n = find(buildPlan(graph(), sprints, [1, 3]), 102);
    expect(n.interval).toEqual([1, 3]);
    expect(n.taskSprints).toEqual([1, 3]);
  });
  test("A07/A08 表示モード・フィルターは集約を変更せず祖先を保持", () => {
    const p = buildPlan(graph(), sprints, [1, 3]);
    const before = JSON.stringify(p);
    const expanded = new Set(items.map((i) => i.id));
    expect(
      visibleRows(p, { ...filters, types: ["User Story"] }, expanded).every(
        (r) => r.node.item.type === "User Story",
      ),
    ).toBe(true);
    expect(
      visibleRows(
        p,
        { ...filters, types: ["Feature", "User Story"] },
        expanded,
      ).some((r) => r.node.item.type === "Task"),
    ).toBe(false);
    expect(
      visibleRows(p, { ...filters, search: "認証API" }, new Set()).map(
        (r) => r.node.item.id,
      ),
    ).toEqual([1, 101, 202]);
    expect(
      visibleRows(
        p,
        { ...filters, assignees: ["Ren"], states: ["Closed"] },
        new Set(),
      ).map((r) => r.node.item.id),
    ).toEqual([1, 102, 205]);
    expect(JSON.stringify(p)).toBe(before);
  });
  test("A09 Areaの完全一致/境界付き配下判定", () => {
    expect(
      inAreas("P\\A\\Sub", [{ path: "P\\A", includeChildren: false }]),
    ).toBe(false);
    expect(
      inAreas("P\\A\\Sub", [{ path: "P\\A", includeChildren: true }]),
    ).toBe(true);
    expect(inAreas("P\\AB", [{ path: "P\\A", includeChildren: true }])).toBe(
      false,
    );
  });
  test("A10 欠損・循環・重複・対象外祖先でもseedを保持", () => {
    const base = items.find((i) => i.id === 101)!;
    const malformed: Item[] = [
      { ...base, id: 1, parentId: 2 },
      { ...base, id: 2, parentId: 1, type: "Custom Type" },
      { ...base, id: 3, parentId: 999 },
      { ...base, id: 3, parentId: 999 },
    ];
    const p = buildPlan(
      { items: malformed, seedIds: [1, 2, 3], warnings: [] },
      sprints,
      [1, 3],
    );
    expect(visibleRows(p, filters, new Set([1, 2, 3]))).toHaveLength(2);
    expect(find(p, 2)).toBeDefined();
    expect(p.warnings.map((w) => formatMessage(w)).join(" ")).toMatch(/循環/);
    expect(p.warnings.map((w) => formatMessage(w)).join(" ")).toMatch(
      /親未取得/,
    );
    expect(p.warnings.map((w) => formatMessage(w)).join(" ")).toMatch(/対象外/);
  });
  test("別プロジェクト親を保持しない", () => {
    const base = items[1];
    const p = buildPlan(
      {
        items: [
          { ...base, id: 10, parentId: 11 },
          { ...base, id: 11, project: "Other" },
        ],
        seedIds: [10],
        warnings: [],
      },
      sprints,
      [1, 3],
    );
    expect(p.roots.map((n) => n.item.id)).toEqual([10]);
    expect(p.warnings.map((w) => formatMessage(w)).join()).toMatch(/親未取得/);
  });
  test("A11 日数が異なっても絶対Sprintインデックスで集約", () => {
    expect(find(buildPlan(graph(), sprints, [1, 3]), 102).interval).toEqual([
      1, 3,
    ]);
  });
  test("同日開始・重複日程はfinish/path/idで整列、日付なしとrootを除外", () => {
    const s = sprints[1];
    expect(
      sortSprints([
        { ...s, id: "b" },
        { ...s, id: "a" },
        { ...s, id: "x", start: "" },
        { ...s, id: "root", path: "Demo" },
      ]).map((s) => s.id),
    ).toEqual(["a", "b"]);
  });
  test("現在/未来/最後の初期範囲、後続最大3Sprint", () => {
    expect(initialRange(sprints, "2026-11-27")).toEqual([2, 5]);
    expect(initialRange(sprints, "2026-10-01")).toEqual([0, 3]);
    expect(initialRange(sprints, "2028-01-01")).toEqual([5, 5]);
    expect(initialRange([], "2028-01-01")).toEqual([0, -1]);
  });
});
