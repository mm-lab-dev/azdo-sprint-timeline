import { expect, Page, test } from "@playwright/test";
import { sprints } from "../fixtures/mock";

async function openSdkHost(
  page: Page,
  mode: "success" | "empty-once" | "forbidden" | "no-project" = "success",
  culture = "ja-JP",
  identity = { hostId: "host-id", userId: "user-id" },
) {
  let teamRequests = 0;
  await page.route("**/__api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/__api/_apis/projects/project-id/teams") {
      teamRequests++;
      if (mode === "forbidden") return route.fulfill({ status: 403, json: {} });
      const value =
        mode === "empty-once" && teamRequests === 1
          ? []
          : [{ id: "alpha", name: "Platform Team" }];
      return route.fulfill({ json: { count: value.length, value } });
    }
    if (path === "/__api/project-id/alpha/_apis/work/teamsettings/iterations")
      return route.fulfill({
        json: {
          value: sprints.map((s) => ({
            ...s,
            attributes: { startDate: s.start, finishDate: s.finish },
          })),
        },
      });
    if (
      path === "/__api/project-id/alpha/_apis/work/teamsettings/teamfieldvalues"
    )
      return route.fulfill({
        json: {
          field: { referenceName: "System.AreaPath" },
          values: [{ value: "Demo\\Platform", includeChildren: true }],
        },
      });
    if (path === "/__api/project-id/_apis/wit/wiql")
      return route.fulfill({ json: { workItems: [] } });
    return route.fulfill({ status: 404, json: {} });
  });
  await page.route("**/__sdk-host", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><html><body></body></html>",
    }),
  );
  await page.goto("/__sdk-host");
  await page.evaluate(
    ({ culture, mode, identity }) => {
      const proxy = (id: number) => ({ __proxyFunctionId: id });
      window.addEventListener("message", (event) => {
        if (typeof event.data !== "string") return;
        let request: {
          id: number;
          methodName?: string;
          params?: unknown[];
          handshakeToken?: string;
        };
        try {
          request = JSON.parse(event.data);
        } catch {
          return;
        }
        if (!request.methodName) return;
        let result: unknown = null;
        if (request.methodName === "initialHandshake")
          result = {
            contributionId:
              "mm-lab.azdo-sprint-timeline.azdo-sprint-timeline-hub",
            context: {
              pageContext: {
                globalization: { culture },
                webContext: { project: { id: "project-id", name: "Demo" } },
              },
              extension: {
                id: "mm-lab.azdo-sprint-timeline",
                publisherId: "mm-lab",
                extensionId: "azdo-sprint-timeline",
                version: "0.1.1",
              },
              host: {
                id: identity.hostId,
                name: "Demo",
                type: 4,
                isHosted: true,
              },
              user: { id: identity.userId, displayName: "Demo user" },
            },
          };
        else if (request.methodName === "getService") {
          if (request.params?.[0] === "ms.vss-tfs-web.tfs-page-data-service")
            result = { getProject: proxy(1) };
          else if (request.params?.[0] === "ms.vss-features.location-service")
            result = { getResourceAreaLocation: proxy(2) };
          else result = { openWorkItem: proxy(3) };
        } else if (request.methodName === "proxy1")
          result =
            mode === "no-project" ? null : { id: "project-id", name: "Demo" };
        else if (request.methodName === "proxy2") {
          result = location.origin + "/__api/";
        } else if (request.methodName === "getAccessToken")
          result = { token: "test-token" };
        (event.source as Window).postMessage(
          JSON.stringify({
            id: request.id,
            result,
            handshakeToken: request.handshakeToken,
          }),
          event.origin,
        );
      });
      const frame = document.createElement("iframe");
      frame.src = "/";
      frame.title = "Extension";
      frame.style.cssText = "width:100%;height:900px;border:0";
      document.body.appendChild(frame);
    },
    { culture, mode, identity },
  );
  return { app: page.frameLocator("iframe"), teamRequests: () => teamRequests };
}

test("実SDKのiframeとブラウザー標準fetchでTeamとSprintを取得する", async ({
  page,
}) => {
  const host = await openSdkHost(page);
  await expect(host.app.getByLabel("Team", { exact: true })).toHaveValue(
    "alpha",
  );
  await expect(
    host.app.getByLabel("Team", { exact: true }).locator("option"),
  ).toHaveText(["Platform Team"]);
  await expect(
    host.app.getByLabel("開始 Sprint", { exact: true }).locator("option"),
  ).toHaveCount(sprints.length);
  await expect(host.app.getByText("READ ONLY", { exact: true })).toBeVisible();
  expect(host.teamRequests()).toBe(1);
});

test("Team一覧0件の表示と更新による再取得", async ({ page }) => {
  const host = await openSdkHost(page, "empty-once");
  await expect(
    host.app.getByText("チーム一覧が0件でした。", { exact: false }),
  ).toBeVisible();
  await host.app.getByRole("button", { name: "更新", exact: false }).click();
  await expect(host.app.getByLabel("Team", { exact: true })).toHaveValue(
    "alpha",
  );
  expect(host.teamRequests()).toBe(2);
});

test("Team取得403を空の計画として扱わない", async ({ page }) => {
  const host = await openSdkHost(page, "forbidden");
  await expect(host.app.getByRole("alert")).toContainText("チーム一覧");
  await expect(host.app.getByRole("alert")).toContainText("HTTP 403");
  await host.app.getByRole("button", { name: "更新", exact: false }).click();
  await expect.poll(host.teamRequests).toBe(2);
  await expect(host.app.getByRole("alert")).toContainText("HTTP 403");
});

test("ブラウザーよりホストの言語を優先し、手動選択と自動への復帰を保持する", async ({
  page,
}) => {
  let host = await openSdkHost(page, "success", "en-US");
  await expect(
    host.app.getByLabel("Start Sprint", { exact: true }),
  ).toBeVisible();
  await expect(host.app.locator("html")).toHaveAttribute("lang", "en");
  await host.app
    .getByLabel("Language / 言語", { exact: true })
    .selectOption("ja");
  await expect(
    host.app.getByLabel("開始 Sprint", { exact: true }),
  ).toBeVisible();
  expect(host.teamRequests()).toBe(1);
  host = await openSdkHost(page, "success", "en-US");
  await expect(
    host.app.getByLabel("開始 Sprint", { exact: true }),
  ).toBeVisible();
  await host.app
    .getByLabel("Language / 言語", { exact: true })
    .selectOption("auto");
  await expect(
    host.app.getByLabel("Start Sprint", { exact: true }),
  ).toBeVisible();
  expect(host.teamRequests()).toBe(1);
});

test("ホスト言語で取得エラーを表示し、再取得せず翻訳を切り替える", async ({
  page,
}) => {
  const host = await openSdkHost(page, "forbidden", "en-US");
  await expect(host.app.getByRole("alert")).toContainText(
    "Team list: Access denied",
  );
  await expect(host.app.getByRole("alert")).toContainText("HTTP 403");
  await host.app
    .getByLabel("Language / 言語", { exact: true })
    .selectOption("ja");
  await expect(host.app.getByRole("alert")).toContainText(
    "チーム一覧: 権限不足",
  );
  expect(host.teamRequests()).toBe(1);
});

test("SDK接続中の初期化失敗もホスト言語で表示する", async ({ page }) => {
  const host = await openSdkHost(page, "no-project", "en-US");
  await expect(host.app.locator("body")).toHaveText(
    "Initialization failed. Reload this extension from its Azure DevOps hub.",
  );
  await expect(host.app.locator("html")).toHaveAttribute("lang", "en");
});

test("実SDKの利用者・組織情報ごとにフィルター設定を分離する", async ({
  page,
}) => {
  let host = await openSdkHost(page);
  await expect(
    host.app.getByLabel("開始 Sprint", { exact: true }),
  ).toBeVisible();
  await host.app
    .getByRole("checkbox", { name: "種類 Feature", exact: true })
    .uncheck();
  host = await openSdkHost(page, "success", "ja-JP", {
    hostId: "host-id",
    userId: "other-user",
  });
  await expect(
    host.app.getByRole("checkbox", { name: "種類 Feature", exact: true }),
  ).toBeChecked();
  host = await openSdkHost(page, "success", "ja-JP", {
    hostId: "other-host",
    userId: "user-id",
  });
  await expect(
    host.app.getByRole("checkbox", { name: "種類 Feature", exact: true }),
  ).toBeChecked();
  host = await openSdkHost(page);
  await expect(
    host.app.getByRole("checkbox", { name: "種類 Feature", exact: true }),
  ).not.toBeChecked();
});
