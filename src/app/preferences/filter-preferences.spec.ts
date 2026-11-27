import { Filters } from "../domain/model";
import { unassignedId } from "../domain/assignee";
import {
  defaultFilters,
  FilterPreferences,
  filterStorageKey,
  parseFilters,
} from "./filter-preferences";

const scope = { hostId: "host", projectId: "project", userId: "user" };
function storage() {
  const values = new Map<string, string>();
  return {
    values,
    api: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    },
  };
}
const filters: Filters = {
  search: "not saved",
  types: ["Epic", "Bug", "Task"],
  states: ["Closed"],
  assignees: ["person-a", unassignedId],
};

test("再起動後に選択を復元し、選択した担当者名だけ保存する", () => {
  const data = storage();
  new FilterPreferences(scope, () => data.api).save("team", filters, [
    {
      id: "person-a",
      name: "Aki",
      imageUrl: "https://example.test/avatar.png",
    },
    { id: "person-b", name: "Other person" },
    { id: unassignedId, name: "Unassigned" },
  ]);
  expect(new FilterPreferences(scope, () => data.api).read("team")).toEqual({
    types: filters.types,
    states: filters.states,
    assignees: filters.assignees,
    assigneeNames: { "person-a": "Aki" },
  });
  const raw = data.values.get(filterStorageKey(scope, "team"))!;
  expect(raw).not.toMatch(/not saved|avatar|Other person|Unassigned/);
});

test("全選択nullと全解除[]を区別して復元する", () => {
  const data = storage();
  const preferences = new FilterPreferences(scope, () => data.api);
  preferences.save("all", { search: "", ...defaultFilters() }, []);
  preferences.save(
    "none",
    { search: "", types: [], states: [], assignees: [] },
    [],
  );
  const restored = new FilterPreferences(scope, () => data.api);
  expect(restored.read("all")).toEqual(defaultFilters());
  expect(restored.read("none")).toEqual({
    types: [],
    states: [],
    assignees: [],
    assigneeNames: {},
  });
});

test("組織・プロジェクト・利用者・Teamの設定が混ざらない", () => {
  const data = storage();
  new FilterPreferences(scope, () => data.api).save("team", filters, []);
  for (const separate of [
    { ...scope, hostId: "other" },
    { ...scope, projectId: "other" },
    { ...scope, userId: "other" },
  ]) {
    expect(
      new FilterPreferences(separate, () => data.api).read("team"),
    ).toEqual(defaultFilters());
  }
  expect(
    new FilterPreferences(scope, () => data.api).read("other-team"),
  ).toEqual(defaultFilters());
});

test.each([null, "{broken", "[]", "null", '{"version":9,"types":[]}'])(
  "保存値が不正でも初期値へ戻る: %s",
  (raw) => {
    expect(parseFilters(raw)).toEqual(defaultFilters());
  },
);

test("不正フィールドだけ初期化し、重複・不要な担当者名を除く", () => {
  expect(
    parseFilters(
      JSON.stringify({
        version: 1,
        types: ["Future type"],
        states: ["Closed", "Closed"],
        assignees: ["person-a"],
        assigneeNames: {
          "person-a": "Aki",
          "person-b": "Other",
          [unassignedId]: "未割当",
        },
      }),
    ),
  ).toEqual({
    types: defaultFilters().types,
    states: ["Closed"],
    assignees: ["person-a"],
    assigneeNames: { "person-a": "Aki" },
  });
  expect(
    parseFilters(
      JSON.stringify({
        version: 1,
        types: null,
        states: [3],
        assignees: "bad",
      }),
    ),
  ).toEqual(defaultFilters());
});

test("ストレージ拒否・容量超過でも同じタブのTeam間で選択を維持する", () => {
  const preferences = new FilterPreferences(scope, () => {
    throw new Error("Blocked");
  });
  expect(preferences.read("team")).toEqual(defaultFilters());
  expect(() => preferences.save("team", filters, [])).not.toThrow();
  expect(preferences.read("other-team")).toEqual(defaultFilters());
  expect(preferences.read("team").states).toEqual(["Closed"]);
  const quota = new FilterPreferences(scope, () => ({
    getItem: () => null,
    setItem: () => {
      throw new Error("Quota exceeded");
    },
  }));
  expect(() => quota.save("team", filters, [])).not.toThrow();
  expect(quota.read("team").types).toEqual(filters.types);
});
