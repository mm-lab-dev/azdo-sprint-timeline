import { items, sprints } from "../../../fixtures/mock";
import { buildPlan, visibleRows } from "./plan";
import { Filters, Item } from "./model";
import { unassignedId } from "./assignee";
const filters: Filters = {
  search: "",
  types: ["Feature", "User Story", "Task"],
  states: null,
  assignees: null,
};
function data() {
  const base = (id: number) => items.find((i) => i.id === id)!;
  const value: Item[] = [
    base(1),
    base(101),
    { ...base(101), id: 107 },
    {
      ...base(201),
      title: "共通Task",
      assignedTo: "同じ名前",
      assignedToId: "person-a",
    },
    {
      ...base(201),
      id: 207,
      title: "共通Task",
      iterationPath: sprints[3].path,
      state: "Closed",
      assignedTo: "同じ名前",
      assignedToId: "person-b",
    },
    {
      ...base(201),
      id: 208,
      title: "共通Task",
      parentId: 107,
      iterationPath: sprints[2].path,
    },
    { ...base(101), id: 401, title: "独立した計画", parentId: undefined },
    {
      ...base(101),
      id: 402,
      title: "独立した計画",
      parentId: undefined,
      state: "Closed",
      iterationPath: sprints[3].path,
    },
    { ...base(201), id: 403, title: "独立した計画", parentId: undefined },
    { ...base(101), id: 404, title: "独立した計画 ", parentId: undefined },
  ];
  const plan = buildPlan(
    {
      items: value,
      seedIds: [201, 207, 208, 401, 402, 403, 404],
      warnings: [],
    },
    sprints,
    [1, 3],
  );
  return { plan, expanded: new Set(value.map((i) => i.id)) };
}
test("同種・同じ実親・完全一致タイトルを統合し、元のIDと期間を保持", () => {
  const { plan, expanded } = data();
  const before = JSON.stringify(plan);
  const rows = visibleRows(plan, filters, expanded);
  expect(
    rows.find((r) => r.node.item.id === 101)?.members.map((n) => n.item.id),
  ).toEqual([101, 107]);
  const tasks = rows.filter((r) => r.node.item.title === "共通Task");
  expect(tasks.map((r) => r.members.map((n) => n.item.id))).toEqual([
    [201, 207],
    [208],
  ]);
  expect(tasks[0].members.map((n) => n.interval)).toEqual([
    [1, 1],
    [3, 3],
  ]);
  expect(
    rows.find((r) => r.node.item.id === 401)?.members.map((n) => n.item.id),
  ).toEqual([401, 402]);
  expect(rows.find((r) => r.node.item.id === 403)?.members).toHaveLength(1);
  expect(rows.find((r) => r.node.item.id === 404)?.members).toHaveLength(1);
  expect(
    rows.flatMap((r) => r.members.map((n) => n.item.id)).sort((a, b) => a - b),
  ).toEqual([1, 101, 107, 201, 207, 208, 401, 402, 403, 404]);
  expect(JSON.stringify(plan)).toBe(before);
});
test("中間の種類を省略しても、実際の親が違う同タイトルは統合しない", () => {
  const { plan, expanded } = data();
  const rows = visibleRows(
    plan,
    { ...filters, types: ["Feature", "Task"] },
    expanded,
  );
  expect(rows.find((r) => r.node.item.id === 201)?.depth).toBe(1);
  expect(rows.filter((r) => r.node.item.title === "共通Task")).toHaveLength(2);
  expect(rows.some((r) => r.node.item.type === "User Story")).toBe(false);
  expect(
    visibleRows(plan, { ...filters, types: ["Task"] }, new Set()).every(
      (r) => r.depth === 0 && !r.hasChildren,
    ),
  ).toBe(true);
  expect(visibleRows(plan, { ...filters, types: [] }, expanded)).toEqual([]);
});
test("複数状態はOR、状態と担当者はAND、同名担当者はIDで区別", () => {
  const { plan, expanded } = data();
  const before = JSON.stringify(plan);
  const rows = visibleRows(
    plan,
    { ...filters, states: ["Active", "Closed"], assignees: ["person-b"] },
    expanded,
  );
  expect(rows.flatMap((r) => r.members.map((n) => n.item.id))).toEqual([
    1, 101, 207,
  ]);
  expect(rows.find((r) => r.node.item.id === 101)?.members[0].interval).toEqual(
    [1, 3],
  );
  expect(visibleRows(plan, { ...filters, states: [] }, expanded)).toEqual([]);
  expect(visibleRows(plan, { ...filters, assignees: [] }, expanded)).toEqual(
    [],
  );
  expect(JSON.stringify(plan)).toBe(before);
});
test("未割当の担当者もフィルターで選択できる", () => {
  const item = {
    ...items[2],
    parentId: undefined,
    assignedTo: undefined,
    assignedToId: undefined,
  };
  const plan = buildPlan(
    { items: [item], seedIds: [item.id], warnings: [] },
    sprints,
    [1, 3],
  );
  expect(
    visibleRows(plan, { ...filters, assignees: [unassignedId] }, new Set()).map(
      (r) => r.node.item.id,
    ),
  ).toEqual([item.id]);
});
test("統合した親を一度展開すれば全メンバーの子を表示する", () => {
  const { plan } = data();
  const rows = visibleRows(plan, filters, new Set([1, 107]));
  expect(rows.filter((r) => r.node.item.title === "共通Task")).toHaveLength(2);
  expect(rows.filter((r) => r.node.item.id === 101)).toHaveLength(1);
});
test("Epic選択時に祖先を含め、Featureを飛ばしてUSへつなぐ", () => {
  const value = items.map((i) =>
    i.type === "Feature" ? { ...i, parentId: 900 } : i,
  );
  value.push({
    ...items[0],
    id: 900,
    type: "Epic",
    parentId: 999,
    iterationPath: sprints[5].path,
  });
  const plan = buildPlan(
    { items: value, seedIds: [202, 302], warnings: [] },
    sprints,
    [1, 3],
    { includeEpics: true },
  );
  const rows = visibleRows(
    plan,
    { ...filters, types: ["Epic", "User Story", "Task"] },
    new Set([900, 1, 2, 101, 104]),
  );
  expect(plan.roots.map((n) => n.item.id)).toEqual([900]);
  expect(plan.roots[0].interval).toEqual([1, 3]);
  expect(plan.warnings).toEqual([]);
  expect(rows.map((r) => [r.node.item.id, r.depth])).toEqual([
    [900, 0],
    [101, 1],
    [202, 2],
    [104, 1],
    [302, 2],
  ]);
});
