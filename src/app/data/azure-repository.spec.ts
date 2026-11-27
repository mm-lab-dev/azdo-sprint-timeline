import type { WorkItem } from "azure-devops-extension-api/WorkItemTracking";
import {
  AzureRepository,
  literal,
  mapItem,
  parentId,
  Reader,
  wiql,
} from "./azure-repository";
import { sprints } from "../../../fixtures/mock";
import { ReadOnlyHttp } from "../core/azure-devops/http";
function raw(
  id: number,
  type = "Task",
  parent?: number,
  project = "Demo",
): WorkItem {
  return {
    id,
    fields: {
      "System.WorkItemType": type,
      "System.Title": "Item " + id,
      "System.State": "Closed",
      "System.IterationPath": "Demo\\Sprint 2",
      "System.AreaPath": "Demo\\Platform",
      "System.TeamProject": project,
      "System.AssignedTo": { displayName: "Aki" },
    },
    relations: parent
      ? [
          {
            rel: "System.LinkTypes.Hierarchy-Reverse",
            url: `https://dev.azure.com/org/_apis/wit/workItems/${parent}`,
          },
        ]
      : [],
  } as unknown as WorkItem;
}
function fixture(seedCount = 201) {
  const requests: { path: string; body?: unknown }[] = [];
  const request = jest.fn(
    async (path: string, body?: unknown): Promise<unknown> => {
      requests.push({ path, body });
      if (path.includes("/teams?"))
        return { value: [{ id: "team", name: "Team" }] };
      if (path.endsWith("/iterations"))
        return {
          value: sprints.map((s) => ({
            ...s,
            attributes: { startDate: s.start, finishDate: s.finish },
          })),
        };
      if (path.endsWith("/teamfieldvalues"))
        return {
          field: { referenceName: "System.AreaPath" },
          values: [{ value: "Demo\\Platform", includeChildren: true }],
        };
      if (path.includes("/wiql"))
        return {
          workItems: Array.from({ length: seedCount }, (_, i) => ({
            id: i + 1,
          })),
        };
      if (path.endsWith("/workitemsbatch")) {
        const ids = (body as { ids: number[] }).ids;
        return {
          value: ids.map((id) =>
            id <= seedCount
              ? raw(id, "Task", 9001)
              : id === 9001
                ? raw(id, "User Story", 9002)
                : raw(id, "Feature"),
          ),
        };
      }
      throw new Error("Unexpected endpoint");
    },
  );
  const repository = new AzureRepository(
    { request } as Reader,
    { id: "project-id", name: "Demo" },
    async () => {},
  );
  return { repository, request, requests };
}
describe("Azure DevOps読み取り専用repository", () => {
  test("BugをWIQLの起点に含め、未計画Bugの祖先もTaskから取得する", async () => {
    const f = fixture(2);
    const original = f.request.getMockImplementation()!;
    f.request.mockImplementation(async (path, body) => {
      if (path.endsWith("/workitemsbatch"))
        return {
          value: (body as { ids: number[] }).ids.map((id) => {
            if (id === 1) return raw(id, "Bug", 9002);
            if (id === 2) return raw(id, "Task", 9001);
            if (id === 9001) {
              const bug = raw(id, "Bug", 9002);
              bug.fields["System.IterationPath"] = "Demo";
              return bug;
            }
            return raw(id, "Feature");
          }),
        };
      return original(path, body);
    });
    const result = await f.repository.load("team", [sprints[2]]);
    expect(result.seedIds).toEqual([1, 2]);
    expect(result.items.find((i) => i.id === 9001)).toMatchObject({
      type: "Bug",
      iterationPath: "Demo",
      parentId: 9002,
    });
    const query = f.requests.find((r) => r.path.includes("/wiql"))?.body as {
      query: string;
    };
    expect(query.query).toContain("IN ('User Story', 'Bug', 'Task')");
    expect(result.warnings).toEqual([]);
  });
  test("標準のRemaining WorkとOriginal Estimateを数値として保持する", () => {
    const item = raw(1);
    item.fields["Microsoft.VSTS.Scheduling.OriginalEstimate"] = 10;
    item.fields["Microsoft.VSTS.Scheduling.RemainingWork"] = -2;
    expect(mapItem(item)).toMatchObject({
      originalEstimate: 10,
      remainingWork: -2,
    });
    item.fields["Microsoft.VSTS.Scheduling.OriginalEstimate"] = null;
    expect(mapItem(item).originalEstimate).toBeUndefined();
  });
  test("Epic選択時だけFeature上位を取得し、Epicより上は辿らない", async () => {
    const f = fixture(1);
    const original = f.request.getMockImplementation()!;
    f.request.mockImplementation(async (path, body) => {
      if (path.endsWith("/workitemsbatch")) {
        const ids = (body as { ids: number[] }).ids;
        if (ids.includes(9002)) return { value: [raw(9002, "Feature", 9003)] };
        if (ids.includes(9003)) return { value: [raw(9003, "Epic", 9004)] };
        if (ids.includes(9004)) throw new Error("Above display boundary");
      }
      return original(path, body);
    });
    const result = await f.repository.load("team", [sprints[2]], {
      includeEpics: true,
    });
    expect(result.items.map((i) => i.id)).toEqual([1, 9001, 9002, 9003]);
    expect(result.warnings).toEqual([]);
  });
  test("担当者のID・画像URLを保持し、不正スキームは取り込まない", () => {
    const item = raw(1);
    item.fields["System.AssignedTo"] = {
      id: "person-a",
      displayName: "Aki",
      imageUrl: "https://avatar.example.test/aki.png",
    };
    expect(mapItem(item)).toMatchObject({
      assignedToId: "person-a",
      assignedTo: "Aki",
      assignedToAvatar: "https://avatar.example.test/aki.png",
    });
    item.fields["System.AssignedTo"] = {
      displayName: "Aki",
      _links: { avatar: { href: "https://avatar.example.test/link.png" } },
    };
    expect(mapItem(item).assignedToAvatar).toBe(
      "https://avatar.example.test/link.png",
    );
    item.fields["System.AssignedTo"] = {
      displayName: "Aki",
      imageUrl: "javascript:invalid",
    };
    expect(mapItem(item).assignedToAvatar).toBeUndefined();
  });
  test("Featureで祖先取得を止め、上位Epicの権限エラーも発生させない", async () => {
    const f = fixture(1);
    const original = f.request.getMockImplementation()!;
    f.request.mockImplementation(async (path, body) => {
      if (path.endsWith("/workitemsbatch")) {
        const ids = (body as { ids: number[] }).ids;
        if (ids.includes(9003)) throw { status: 403 };
        if (ids.includes(9002)) return { value: [raw(9002, "Feature", 9003)] };
      }
      return original(path, body);
    });
    const result = await f.repository.load("team", [sprints[2]]);
    expect(result.items.map((i) => i.id)).toEqual([1, 9001, 9002]);
    expect(result.warnings).toEqual([]);
    const requestedIds = f.request.mock.calls
      .filter(([path]) => path.endsWith("/workitemsbatch"))
      .flatMap(([, body]) => (body as { ids: number[] }).ids);
    expect(requestedIds).not.toContain(9003);
  });
  test("Featureに到達しない想定外階層でもTaskと取得できる親を保持", async () => {
    const f = fixture(1);
    const original = f.request.getMockImplementation()!;
    f.request.mockImplementation(async (path, body) => {
      if (path.endsWith("/workitemsbatch"))
        return {
          value: (body as { ids: number[] }).ids.map((id) =>
            id === 1 ? raw(1, "Task", 99) : raw(99, "Epic"),
          ),
        };
      return original(path, body);
    });
    const result = await f.repository.load("team", [sprints[2]]);
    expect(result.seedIds).toEqual([1]);
    expect(result.items.map((i) => i.id)).toEqual([1, 99]);
  });
  test("REST JSON envelopeからHTTP・repositoryを通して計画データを取得", async () => {
    const f = fixture(1);
    const fetcher = jest.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        const url = new URL(String(input));
        expect(url.searchParams.get("api-version")).toBe("7.1");
        expect((init?.headers as Record<string, string>)["Authorization"]).toBe(
          "Bearer test-token",
        );
        url.searchParams.delete("api-version");
        const query = url.searchParams.toString();
        const result = await f.request(
          url.pathname + (query ? "?" + query : ""),
          init?.body ? JSON.parse(String(init.body)) : undefined,
        );
        return new Response(JSON.stringify(result));
      },
    );
    const http = new ReadOnlyHttp(
      "https://dev.azure.com",
      async () => "test-token",
      fetcher as typeof fetch,
    );
    const repo = new AzureRepository(
      http,
      { id: "project-id", name: "Demo" },
      async () => {},
    );
    expect(await repo.teams()).toHaveLength(1);
    const settings = await repo.settings("team");
    const result = await repo.load("team", [settings.sprints[2]]);
    expect(result.items.map((i) => i.id)).toEqual([1, 9001, 9002]);
    expect(result.seedIds).toEqual([1]);
    expect(result.warnings).toEqual([]);
  });
  test("A10 201件を200/1に分割、共通祖先のバッチ取得・重複防止", async () => {
    const f = fixture();
    const settings = await f.repository.settings("team");
    const result = await f.repository.load("team", [settings.sprints[2]]);
    const batches = f.requests
      .filter((r) => r.path.endsWith("/workitemsbatch"))
      .map((r) => (r.body as { ids: number[] }).ids);
    expect(batches.map((b) => b.length)).toEqual([200, 1, 1, 1]);
    expect(result.seedIds).toHaveLength(201);
    expect(result.items).toHaveLength(203);
    expect(result.warnings).toEqual([]);
  });
  test("A09 WIQL quoteエスケープ・includeChildren、単一バックスラッシュ、状態除外なし", () => {
    const q = wiql(
      "P'Name",
      [
        { path: "P\\A", includeChildren: false },
        { path: "P\\B", includeChildren: true },
      ],
      sprints[2],
    );
    expect(literal("a'b")).toBe("'a''b'");
    expect(q).toContain("'P''Name'");
    expect(q).toContain("[System.AreaPath] = 'P\\A'");
    expect(q).not.toContain("UNDER 'P\\A'");
    expect(q).toContain("UNDER 'P\\B'");
    expect(q).not.toContain("[System.State]");
  });
  test("チームのページング", async () => {
    const request = jest
      .fn()
      .mockResolvedValueOnce({
        value: Array.from({ length: 100 }, (_, i) => ({
          id: String(i),
          name: "Team",
        })),
      })
      .mockResolvedValueOnce({ value: [{ id: "100", name: "Last" }] });
    const repo = new AzureRepository(
      { request },
      { id: "p", name: "P" },
      async () => {},
    );
    expect(await repo.teams()).toHaveLength(101);
    expect(request.mock.calls[1][0]).toContain("$skip=100");
  });
  test("親URLのID抽出と危険/不正URL拒否、System.Parent fallback", () => {
    expect(parentId(raw(1, "Task", 42))).toBe(42);
    for (const url of [
      "javascript:42",
      "https://host/items/42",
      "https://host/_apis/wit/workitems/nope",
      "bad",
    ])
      expect(
        parentId({
          relations: [{ rel: "System.LinkTypes.Hierarchy-Reverse", url }],
        } as WorkItem),
      ).toBeUndefined();
    expect(parentId({ ...raw(1), fields: { "System.Parent": 12 } })).toBe(12);
    expect(mapItem(raw(1)).assignedTo).toBe("Aki");
  });
  test("欠損親・循環・別プロジェクトでも探索終了しseed保持", async () => {
    const f = fixture(1);
    const original = f.request.getMockImplementation()!;
    f.request.mockImplementation(async (path, body) => {
      if (path.endsWith("/workitemsbatch")) {
        const id = (body as { ids: number[] }).ids[0];
        return id === 1
          ? [raw(1, "Task", 2)]
          : id === 2
            ? [raw(2, "User Story", 1)]
            : [];
      }
      return original(path, body);
    });
    const result = await f.repository.load("team", [sprints[2]]);
    expect(result.items).toHaveLength(2);
    expect(result.seedIds).toEqual([1]);
    f.request.mockImplementation(async (path, body) =>
      path.endsWith("/workitemsbatch")
        ? (body as { ids: number[] }).ids[0] === 1
          ? [raw(1, "Task", 99)]
          : [raw(99, "Feature", undefined, "Other")]
        : original(path, body),
    );
    const cross = await f.repository.load("team", [sprints[2]]);
    expect(cross.items).toHaveLength(1);
    expect(cross.warnings.join()).toMatch(/別プロジェクト/);
  });
  test("親取得403を警告しseedは失わない", async () => {
    const f = fixture(1);
    const original = f.request.getMockImplementation()!;
    f.request.mockImplementation(async (path, body) => {
      if (
        path.endsWith("/workitemsbatch") &&
        (body as { ids: number[] }).ids.includes(9001)
      )
        throw { status: 403 };
      return original(path, body);
    });
    const result = await f.repository.load("team", [sprints[2]]);
    expect(result.seedIds).toEqual([1]);
    expect(result.warnings.join()).toMatch(/部分取得/);
  });
  test("WIQLをSprintで分割し上限到達を警告、読み取りendpointのみ", async () => {
    const f = fixture(20000);
    const result = await f.repository.load("team", [sprints[1], sprints[2]]);
    expect(f.requests.filter((r) => r.path.includes("/wiql"))).toHaveLength(2);
    expect(result.warnings.join()).toMatch(/WIQL上限/);
    expect(
      f.requests
        .filter((r) => r.body)
        .every((r) => /\/(wiql\?|workitemsbatch)/.test(r.path)),
    ).toBe(true);
  });
  test("WIQL失敗400は部分取得、403は呼出元に伝播", async () => {
    const f = fixture(1);
    const original = f.request.getMockImplementation()!;
    for (const status of [400, 403]) {
      f.request.mockImplementation(async (path, body) => {
        if (path.includes("/wiql")) throw { status };
        return original(path, body);
      });
      if (status === 400)
        expect(
          (await f.repository.load("team", [sprints[2]])).warnings.join(),
        ).toMatch(/検索失敗/);
      else
        await expect(f.repository.load("team", [sprints[2]])).rejects.toEqual({
          status: 403,
        });
    }
  });
});
