import {
  aggregateEffort,
  completionPercent,
  emptyEffort,
  sumEffort,
} from "./effort";
import { buildPlan, visibleRows } from "./plan";
import { items, sprints } from "../../../fixtures/mock";
const task = items.find((i) => i.id === 201)!;
test("完了率はOriginalからRemainingを引く。負数・100%超も丸め込まない", () => {
  for (const [remainingWork, expected] of [
    [5, 50],
    [0, 100],
    [15, -50],
    [-2, 120],
  ]) {
    expect(
      completionPercent(
        aggregateEffort({ ...task, originalEstimate: 10, remainingWork }, []),
      ),
    ).toBe(expected);
  }
});
test("Originalが0・未設定、片方だけ設定なら割合を捏造しない", () => {
  expect(completionPercent(emptyEffort())).toBeNull();
  expect(
    completionPercent(
      aggregateEffort({ ...task, originalEstimate: 0, remainingWork: 0 }, []),
    ),
  ).toBeNull();
  expect(
    completionPercent(
      aggregateEffort({ ...task, originalEstimate: undefined }, []),
    ),
  ).toBeNull();
  expect(
    completionPercent(
      aggregateEffort({ ...task, remainingWork: undefined }, []),
    ),
  ).toBeNull();
  expect(
    completionPercent(aggregateEffort({ ...task, originalEstimate: -1 }, [])),
  ).toBeNull();
});
test("親は子Taskの値を加算し、割合の単純平均や親フィールドの二重計上をしない", () => {
  const one = aggregateEffort(
    { ...task, originalEstimate: 10, remainingWork: 5 },
    [],
  );
  const two = aggregateEffort(
    { ...task, id: 207, originalEstimate: 30, remainingWork: 0 },
    [],
  );
  const story = aggregateEffort(
    { ...items[1], originalEstimate: 1000, remainingWork: 999 },
    [one, two],
  );
  expect(story).toEqual({
    original: 40,
    remaining: 5,
    estimatedCount: 2,
    missingCount: 0,
  });
  expect(completionPercent(story)).toBe(87.5);
  expect(completionPercent(sumEffort([one, two]))).toBe(87.5);
});
test("見積なしTaskを数え、計算できる項目だけの参考値と区別する", () => {
  const effort = aggregateEffort(items[1], [
    aggregateEffort({ ...task, originalEstimate: 10, remainingWork: 5 }, []),
    aggregateEffort({ ...task, id: 207, originalEstimate: undefined }, []),
  ]);
  expect(effort).toMatchObject({ estimatedCount: 1, missingCount: 1 });
  expect(completionPercent(effort)).toBe(50);
});
test("表示種類・状態フィルター・行統合は元の期間と親の工数集約を変えない", () => {
  const story = items[1];
  const feature = items[0];
  const children = [
    { ...task, originalEstimate: 10, remainingWork: 5 },
    {
      ...task,
      id: 207,
      iterationPath: sprints[2].path,
      state: "Closed",
      originalEstimate: 30,
      remainingWork: 0,
    },
  ];
  const plan = buildPlan(
    { items: [feature, story, ...children], seedIds: [201, 207], warnings: [] },
    sprints,
    [1, 3],
  );
  const before = JSON.stringify(plan);
  visibleRows(
    plan,
    { search: "", types: ["Task"], states: ["Closed"], assignees: null },
    new Set(),
  );
  expect(completionPercent(plan.roots[0].effort)).toBe(87.5);
  expect(plan.roots[0].interval).toEqual([1, 2]);
  expect(JSON.stringify(plan)).toBe(before);
});
