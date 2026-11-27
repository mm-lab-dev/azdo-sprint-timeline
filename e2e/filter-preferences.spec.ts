import { expect, Page, test } from "@playwright/test";

async function selectFilter(
  page: Page,
  index: number,
  values: string[] | null,
) {
  const panel = page.locator("details.multi-filter").nth(index);
  if ((await panel.getAttribute("open")) === null)
    await panel.locator("summary").click();
  await panel
    .getByRole("button", {
      name: values === null ? "全選択" : "全解除",
      exact: true,
    })
    .click();
  for (const value of values ?? []) {
    const checkbox = panel.getByRole("checkbox", {
      name: (index === 0 ? "状態 " : "担当者 ") + value,
      exact: true,
    });
    await expect(checkbox).not.toBeChecked();
    await checkbox.check();
    await expect(checkbox).toBeChecked();
  }
  await panel.locator("summary").click();
}
async function ready(page: Page) {
  await expect(
    page.getByRole("button", { name: "更新", exact: true }),
  ).toBeEnabled();
  await expect(page.getByLabel("Team", { exact: true })).toHaveValue("alpha");
}

test("種類・状態・担当者を復元し、Epicを初回から表示。検索は保存しない", async ({
  page,
}) => {
  await page.goto("/?scenario=bugs");
  await ready(page);
  await page.getByRole("checkbox", { name: "種類 Epic", exact: true }).check();
  await page
    .getByRole("checkbox", { name: "種類 Feature", exact: true })
    .uncheck();
  await selectFilter(page, 0, ["Active"]);
  await selectFilter(page, 1, ["Ren", "未割当"]);
  await page.getByLabel("検索", { exact: true }).fill("通知");
  await page.reload();
  await ready(page);
  await expect(
    page.getByRole("checkbox", { name: "種類 Epic", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "種類 Feature", exact: true }),
  ).not.toBeChecked();
  await expect(page.locator('[data-item-id="900"]')).toBeVisible();
  await expect(page.locator('[data-item-id="1"]')).toHaveCount(0);
  await expect(page.getByLabel("検索", { exact: true })).toHaveValue("");
  const states = page.locator("details.multi-filter").first();
  await states.locator("summary").click();
  await expect(
    states.getByRole("checkbox", { name: "状態 Active", exact: true }),
  ).toBeChecked();
  await expect(
    states.getByRole("checkbox", { name: "状態 Closed", exact: true }),
  ).not.toBeChecked();
  await states.locator("summary").click();
  const owners = page.locator("details.multi-filter").nth(1);
  await owners.locator("summary").click();
  await expect(
    owners.getByRole("checkbox", { name: "担当者 Ren", exact: true }),
  ).toBeChecked();
  await expect(
    owners.getByRole("checkbox", { name: "担当者 未割当", exact: true }),
  ).toBeChecked();
  await expect(
    owners.getByRole("checkbox", { name: "担当者 Aki", exact: true }),
  ).not.toBeChecked();
});

test("Teamを切り替えるとそれぞれの選択を復元する", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  await page
    .getByRole("checkbox", { name: "種類 Feature", exact: true })
    .uncheck();
  await selectFilter(page, 0, ["Closed"]);
  await selectFilter(page, 1, ["Ren"]);
  await page.getByLabel("Team", { exact: true }).selectOption("beta");
  await expect(
    page.getByRole("checkbox", { name: "種類 Feature", exact: true }),
  ).toBeChecked();
  await expect(page.locator('[data-item-id="301"]')).toBeVisible();
  await page
    .getByRole("checkbox", { name: "種類 Task", exact: true })
    .uncheck();
  await selectFilter(page, 0, []);
  await page.getByLabel("Team", { exact: true }).selectOption("alpha");
  await expect(page.locator('[data-item-id="205"]')).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "種類 Feature", exact: true }),
  ).not.toBeChecked();
  await expect(
    page.locator("details.multi-filter").first().locator("summary"),
  ).toContainText("1件選択");
  await page.getByLabel("Team", { exact: true }).selectOption("beta");
  await expect(
    page.getByRole("checkbox", { name: "種類 Task", exact: true }),
  ).not.toBeChecked();
  await expect(
    page.locator("details.multi-filter").first().locator("summary"),
  ).toContainText("選択なし");
  await expect(
    page.getByText("表示対象がありません。", { exact: false }),
  ).toBeVisible();
});

test("全解除を復元でき、全選択で戻した状態も記録する", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  for (const type of ["Epic", "Feature", "US", "Bug", "Task"])
    await page
      .getByRole("checkbox", { name: "種類 " + type, exact: true })
      .uncheck();
  await selectFilter(page, 0, []);
  await selectFilter(page, 1, []);
  await page.reload();
  await ready(page);
  for (const type of ["Epic", "Feature", "US", "Bug", "Task"])
    await expect(
      page.getByRole("checkbox", { name: "種類 " + type, exact: true }),
    ).not.toBeChecked();
  for (const panel of await page.locator("details.multi-filter").all())
    await expect(panel.locator("summary")).toContainText("選択なし");
  await page.getByRole("checkbox", { name: "種類 Task", exact: true }).check();
  await selectFilter(page, 0, null);
  await selectFilter(page, 1, null);
  await page.reload();
  await ready(page);
  for (const panel of await page.locator("details.multi-filter").all())
    await expect(panel.locator("summary")).toContainText("すべて");
  await expect(page.getByRole("table")).toBeVisible();
});

test("範囲内にいなくなった状態と担当者も選択したまま保持する", async ({
  page,
}) => {
  await page.goto("/");
  await ready(page);
  await selectFilter(page, 0, ["Closed"]);
  await page.getByLabel("開始 Sprint", { exact: true }).selectOption("1");
  await page.getByLabel("終了 Sprint", { exact: true }).selectOption("1");
  await expect(
    page.getByText("表示対象がありません。", { exact: false }),
  ).toBeVisible();
  const states = page.locator("details.multi-filter").first();
  await states.locator("summary").click();
  await expect(
    states.getByRole("checkbox", { name: "状態 Closed", exact: true }),
  ).toBeChecked();
  await states.locator("summary").click();
  await page.getByLabel("終了 Sprint", { exact: true }).selectOption("3");
  await selectFilter(page, 0, null);
  await selectFilter(page, 1, ["Mina"]);
  await page.getByLabel("終了 Sprint", { exact: true }).selectOption("1");
  const owners = page.locator("details.multi-filter").nth(1);
  await owners.locator("summary").click();
  await expect(
    owners.getByRole("checkbox", { name: "担当者 Mina", exact: true }),
  ).toBeChecked();
  await owners.locator("summary").click();
  await page.reload();
  await ready(page);
  await expect(owners.locator("summary")).toContainText("1件選択");
  await expect(page.locator('[data-item-id="302"]')).toBeVisible();
});

test("ストレージ無効でも操作でき、同じタブのTeam切替では記憶する", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, "getItem", {
      value: () => {
        throw new Error("Blocked");
      },
    });
    Object.defineProperty(Storage.prototype, "setItem", {
      value: () => {
        throw new Error("Blocked");
      },
    });
  });
  await page.goto("/");
  await ready(page);
  await page
    .getByRole("checkbox", { name: "種類 Feature", exact: true })
    .uncheck();
  await page.getByLabel("Team", { exact: true }).selectOption("beta");
  await expect(
    page.getByRole("checkbox", { name: "種類 Feature", exact: true }),
  ).toBeChecked();
  await page.getByLabel("Team", { exact: true }).selectOption("alpha");
  await expect(
    page.getByRole("checkbox", { name: "種類 Feature", exact: true }),
  ).not.toBeChecked();
  await page.reload();
  await ready(page);
  await expect(
    page.getByRole("checkbox", { name: "種類 Feature", exact: true }),
  ).toBeChecked();
});
