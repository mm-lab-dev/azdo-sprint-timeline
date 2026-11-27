import {
  Area,
  Filters,
  GraphResult,
  Interval,
  Item,
  Plan,
  PlanNode,
  Row,
  Sprint,
} from "./model";

export const day = (value: string): string => value.slice(0, 10);
export function todayDay(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
export function sortSprints(sprints: Sprint[]): Sprint[] {
  const ids = new Set<string>();
  return sprints
    .filter((s) => {
      if (
        ids.has(s.id) ||
        !/^\d{4}-\d{2}-\d{2}/.test(s.start) ||
        !/^\d{4}-\d{2}-\d{2}/.test(s.finish) ||
        day(s.start) > day(s.finish) ||
        !s.path.includes("\\")
      )
        return false;
      ids.add(s.id);
      return true;
    })
    .sort(
      (a, b) =>
        compare(day(a.start), day(b.start)) ||
        compare(day(a.finish), day(b.finish)) ||
        compare(a.path, b.path) ||
        compare(a.id, b.id),
    );
}
export function initialRange(sprints: Sprint[], today = todayDay()): Interval {
  let start = sprints.findIndex(
    (s) => day(s.start) <= today && today <= day(s.finish),
  );
  if (start < 0) start = sprints.findIndex((s) => day(s.start) > today);
  if (start < 0) start = Math.max(0, sprints.length - 1);
  return [start, Math.min(start + 3, sprints.length - 1)];
}
const pathKey = (s: string) => s.toLocaleLowerCase("en-US");
export function inAreas(path: string, areas: Area[]): boolean {
  return areas.some(
    (a) =>
      pathKey(path) === pathKey(a.path) ||
      (a.includeChildren && pathKey(path).startsWith(pathKey(a.path) + "\\")),
  );
}
export function seedItems(
  items: Item[],
  project: string,
  areas: Area[],
  sprints: Sprint[],
): Item[] {
  const paths = new Set(sprints.map((s) => pathKey(s.path)));
  return items.filter(
    (i) =>
      i.project === project &&
      ["User Story", "Task"].includes(i.type) &&
      inAreas(i.areaPath, areas) &&
      paths.has(pathKey(i.iterationPath)),
  );
}
const bounds = (values: number[]): Interval | null =>
  values.length ? [values[0], values[values.length - 1]] : null;
const union = (values: number[]) => [...new Set(values)].sort((a, b) => a - b);
export function buildPlan(
  graph: GraphResult,
  sprints: Sprint[],
  range: Interval,
): Plan {
  const warnings = [...graph.warnings];
  const all = new Map(graph.items.map((i) => [i.id, i]));
  const retained = new Map<number, Item>();
  for (const id of graph.seedIds) {
    let item = all.get(id);
    const seen = new Set<number>();
    const project = item?.project;
    while (item && item.project === project && !retained.has(item.id)) {
      if (seen.has(item.id)) break;
      seen.add(item.id);
      retained.set(item.id, item);
      item = item.parentId ? all.get(item.parentId) : undefined;
    }
  }
  const nodes = new Map<number, PlanNode>(
    [...retained].map(([id, item]) => [
      id,
      {
        item,
        children: [],
        activeSprints: [],
        taskSprints: [],
        interval: null,
        visibleInterval: null,
        orphan: false,
      },
    ]),
  );
  const roots: PlanNode[] = [];
  // Parent-first traversal detects cycles in linear time before attaching edges.
  const done = new Set<number>();
  const broken = new Set<number>();
  for (const id of nodes.keys()) {
    const chain = new Set<number>();
    let cursor: number | undefined = id;
    while (cursor !== undefined && nodes.has(cursor) && !done.has(cursor)) {
      if (chain.has(cursor)) {
        broken.add(cursor);
        warnings.push(`親子循環: #${cursor} の親リンクを切断しました。`);
        break;
      }
      chain.add(cursor);
      cursor = nodes.get(cursor)?.item.parentId;
    }
    chain.forEach((n) => done.add(n));
  }
  for (const node of nodes.values()) {
    const parent = node.item.parentId
      ? nodes.get(node.item.parentId)
      : undefined;
    if (
      parent &&
      parent.item.project === node.item.project &&
      !broken.has(node.item.id)
    ) {
      parent.children.push(node);
      if (!(
        (parent.item.type === "Feature" && node.item.type === "User Story") ||
        (parent.item.type === "User Story" && node.item.type === "Task")
      ))
        warnings.push(`想定外の階層: #${parent.item.id} → #${node.item.id}`);
    } else {
      node.orphan = !!node.item.parentId;
      if (node.orphan)
        warnings.push(
          `親未取得: #${node.item.id}（欠損・権限・別プロジェクト・循環）`,
        );
      roots.push(node);
    }
    if (!["Feature", "User Story", "Task"].includes(node.item.type))
      warnings.push(
        `対象外タイプを祖先として保持: #${node.item.id} ${node.item.type}`,
      );
  }
  const sprintIndex = new Map(
    sprints.map((s, index) => [pathKey(s.path), index]),
  );
  const order: PlanNode[] = [];
  const pending = [...roots];
  while (pending.length) {
    const n = pending.pop()!;
    order.push(n);
    pending.push(...n.children);
  }
  for (const n of order.reverse()) {
    const ownIndex = sprintIndex.get(pathKey(n.item.iterationPath));
    const own =
      n.item.type !== "Feature" && ownIndex !== undefined ? [ownIndex] : [];
    n.activeSprints = union([
      ...own,
      ...n.children.flatMap((c) => c.activeSprints),
    ]);
    n.taskSprints = union([
      ...(n.item.type === "Task" ? own : []),
      ...n.children.flatMap((c) => c.taskSprints),
    ]);
    n.interval = bounds(n.activeSprints);
    if (n.interval) {
      const start = Math.max(n.interval[0], range[0]),
        end = Math.min(n.interval[1], range[1]);
      n.visibleInterval = start <= end ? [start, end] : null;
    }
  }
  return { roots, warnings: [...new Set(warnings)] };
}
export function visibleRows(
  plan: Plan,
  filters: Filters,
  expanded: ReadonlySet<number>,
): Row[] {
  const matches = (n: PlanNode) =>
    (!filters.search ||
      `${n.item.id} ${n.item.title}`
        .toLocaleLowerCase()
        .includes(filters.search.toLocaleLowerCase())) &&
    (!filters.state || n.item.state === filters.state) &&
    (!filters.assignee || n.item.assignedTo === filters.assignee);
  const filtering = !!(filters.search || filters.state || filters.assignee);
  const keep = new Set<number>();
  const visit = (n: PlanNode): boolean => {
    const child = n.children.map(visit).some(Boolean);
    if (!filtering || matches(n) || child) {
      keep.add(n.item.id);
      return true;
    }
    return false;
  };
  plan.roots.forEach(visit);
  const rows: Row[] = [];
  const walk = (n: PlanNode, depth: number) => {
    if (!keep.has(n.item.id)) return;
    const shown =
      filters.mode === "stories"
        ? n.item.type === "User Story"
        : !(filters.mode === "noTasks" && n.item.type === "Task");
    if (shown)
      rows.push({
        node: n,
        depth: filters.mode === "stories" ? 0 : depth,
        hasChildren: n.children.some(
          (c) =>
            keep.has(c.item.id) &&
            !(filters.mode === "noTasks" && c.item.type === "Task"),
        ),
      });
    if (!shown || filtering || expanded.has(n.item.id))
      n.children.forEach((c) => walk(c, depth + (shown ? 1 : 0)));
  };
  plan.roots.filter((n) => !n.orphan).forEach((n) => walk(n, 0));
  const orphanStart = rows.length;
  plan.roots.filter((n) => n.orphan).forEach((n) => walk(n, 0));
  if (rows[orphanStart]) rows[orphanStart].orphanGroupStart = true;
  return rows;
}
