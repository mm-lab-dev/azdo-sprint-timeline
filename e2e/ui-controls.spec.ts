import { expect, Page, test } from "@playwright/test";

async function range(page: Page) {
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByLabel("開始 Sprint", { exact: true }).selectOption("1");
  await page.getByLabel("終了 Sprint", { exact: true }).selectOption("3");
  await page.getByRole("button", { name: "すべて展開", exact: true }).click();
}
async function selectFilter(
  page: Page,
  kind: "状態" | "担当者",
  values: string[] | null,
) {
  const panel = page
    .locator("details.multi-filter")
    .nth(kind === "状態" ? 0 : 1);
  if ((await panel.getAttribute("open")) === null)
    await panel.locator("summary").click();
  await panel
    .getByRole("button", {
      name: values === null ? "全選択" : "全解除",
      exact: true,
    })
    .click();
  if (values)
    for (const value of values) {
      const checkbox = panel.getByRole("checkbox", {
        name: kind + " " + value,
        exact: true,
      });
      await expect(checkbox).not.toBeChecked();
      await checkbox.check();
    }
  await panel.locator("summary").click();
}

test("TaskのないUSと親は斜線。統合行・非表示階層でも子孫Taskの有無を維持する", async ({
  page,
}) => {
  await page.goto("/?scenario=grouped");
  await range(page);
  await page.getByRole("checkbox", { name: "種類 Epic", exact: true }).check();
  await page.getByRole("button", { name: "すべて展開", exact: true }).click();
  const taskless = page.locator(
    '[data-member-ids~="401"][data-member-ids~="402"]',
  );
  await expect(taskless.locator(".bar")).toHaveCount(2);
  await expect(taskless.locator(".bar.gap")).toHaveCount(2);
  await expect(page.locator('[data-item-id="104"] .bar.gap')).toHaveCount(1);
  await expect(page.locator('[data-item-id="2"] .bar.gap')).toHaveCount(2);
  await expect(page.locator('[data-item-id="900"] .bar.gap')).toHaveCount(0);
  await expect(page.locator('[data-item-id="403"] .bar.gap')).toHaveCount(0);
  await page
    .getByRole("checkbox", { name: "種類 Task", exact: true })
    .uncheck();
  await page
    .getByRole("checkbox", { name: "種類 Feature", exact: true })
    .uncheck();
  await expect(taskless.locator(".bar.gap")).toHaveCount(2);
  await expect(page.locator('[data-item-id="900"] .bar.gap')).toHaveCount(0);
  await expect(page.locator('[data-item-id="104"] .bar.gap')).toHaveCount(1);
});

test("EpicはEで表示し、FeatureやUSを飛ばして任意の階層を構成する", async ({
  page,
}) => {
  await page.goto("/?scenario=epic");
  await range(page);
  await page.getByRole("checkbox", { name: "種類 Epic", exact: true }).check();
  await expect(page.locator('[data-item-id="900"] .type-mark')).toHaveText("E");
  await expect(page.locator('[data-item-id="900"] .bar')).toHaveCount(3);
  await page
    .getByRole("checkbox", { name: "種類 Feature", exact: true })
    .uncheck();
  await expect(page.locator('[data-item-id="1"]')).toHaveCount(0);
  await expect(page.locator('[data-item-id="101"] .item-cell')).toHaveCSS(
    "padding-left",
    "32px",
  );
  await page.getByRole("checkbox", { name: "種類 US", exact: true }).uncheck();
  await expect(page.locator('[data-item-id="101"]')).toHaveCount(0);
  await expect(page.locator('[data-item-id="202"]')).toBeVisible();
  await page
    .getByRole("checkbox", { name: "種類 Epic", exact: true })
    .uncheck();
  await expect(page.locator('[data-item-id="202"] .item-cell')).toHaveCSS(
    "padding-left",
    "12px",
  );
  await page
    .getByRole("checkbox", { name: "種類 Task", exact: true })
    .uncheck();
  await expect(
    page.getByText("表示対象がありません。", { exact: false }),
  ).toBeVisible();
});

test("同種・同親・同タイトルを1行にまとめ、個別IDとSprintごとの担当者を保持する", async ({
  page,
}) => {
  await page.goto("/?scenario=grouped");
  await range(page);
  const tasks = page.locator(
    '[data-member-ids~="201"][data-member-ids~="207"]',
  );
  await expect(tasks).toHaveCount(1);
  await expect(tasks.locator(".bar")).toHaveCount(2);
  await expect(
    tasks.getByRole("img", { name: "Aki", exact: true }),
  ).toHaveCount(1);
  await expect(
    tasks.getByRole("img", { name: "Ren", exact: true }),
  ).toHaveCount(1);
  await expect(page.locator('[data-member-ids~="208"]')).toHaveCount(1);
  await expect(
    page.locator('[data-member-ids~="101"][data-member-ids~="107"] .bar'),
  ).toHaveCount(3);
  const roots = page.locator(
    '[data-member-ids~="401"][data-member-ids~="402"]',
  );
  await expect(roots).toHaveCount(1);
  await expect(roots.locator(".bar")).toHaveCount(2);
  await expect(page.locator('[data-member-ids="403"]')).toHaveCount(1);
  await tasks.locator(".item-link").click();
  const dialog = page.getByRole("dialog", { name: "Work Itemを選択" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /#207 / }).click();
  await expect(
    page.getByText("モック: Work Item #207 を開きました。"),
  ).toBeVisible();
  await roots.locator(".bar").last().click();
  await expect(
    page.getByText("モック: Work Item #402 を開きました。"),
  ).toBeVisible();
});

test("複数状態・複数担当者のチェック、全解除、全選択を適用する", async ({
  page,
}) => {
  await page.goto("/?scenario=grouped");
  await range(page);
  await selectFilter(page, "状態", ["Closed", "New"]);
  await selectFilter(page, "担当者", ["Ren", "Mina"]);
  await expect(page.locator('[data-member-ids~="207"]')).toBeVisible();
  await expect(page.locator('[data-member-ids~="205"]')).toBeVisible();
  await expect(page.locator('[data-member-ids~="107"]')).toBeVisible();
  await expect(page.locator('[data-member-ids~="201"]')).toHaveCount(0);
  await expect(
    page.locator('[data-member-ids~="101"][data-member-ids~="107"] .bar'),
  ).toHaveCount(3);
  await selectFilter(page, "状態", []);
  await expect(
    page.getByText("表示対象がありません。", { exact: false }),
  ).toBeVisible();
  await selectFilter(page, "状態", null);
  await selectFilter(page, "担当者", null);
  await expect(page.locator('[data-member-ids~="201"]')).toBeVisible();
});

test("担当者画像を表示し、取得失敗時は頭文字へ切り替える", async ({ page }) => {
  await page.route("**/assets/avatars/ren.svg", (route) => route.abort());
  await page.goto("/");
  await range(page);
  const aki = page
    .locator('[data-item-id="201"]')
    .getByRole("img", { name: "Aki", exact: true });
  await expect
    .poll(() =>
      aki.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBe(40);
  const ren = page
    .locator('[data-item-id="202"]')
    .getByRole("img", { name: "Ren", exact: true });
  await expect(ren).toHaveText("R");
  await expect(ren.locator("img")).toHaveCount(0);
});

test("検索欄をテーマに合わせ、種類と状態を指定の色で表示する", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await range(page);
  for (const theme of ["light", "dark"]) {
    await page.evaluate((value) => {
      document.documentElement.dataset["hostTheme"] = value;
    }, theme);
    const selectColor = await page
      .getByLabel("Team", { exact: true })
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    await expect(page.getByLabel("検索", { exact: true })).toHaveCSS(
      "background-color",
      selectColor,
    );
  }
  await page.evaluate(() => {
    document.documentElement.dataset["hostTheme"] = "light";
  });
  await expect(page.getByLabel("検索", { exact: true })).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await expect(page.locator(".type-dot.epic")).toHaveCSS(
    "background-color",
    "rgb(255, 123, 0)",
  );
  await expect(page.locator(".type-dot.feature")).toHaveCSS(
    "background-color",
    "rgb(119, 59, 147)",
  );
  await expect(page.locator(".type-dot.story")).toHaveCSS(
    "background-color",
    "rgb(0, 156, 204)",
  );
  await expect(page.locator(".type-dot.task")).toHaveCSS(
    "background-color",
    "rgb(200, 173, 85)",
  );
  await expect(page.locator('[data-item-id="202"] .state-active')).toHaveCSS(
    "color",
    "rgb(0, 106, 189)",
  );
  await expect(page.locator('[data-item-id="205"] .state-closed')).toHaveCSS(
    "color",
    "rgb(16, 124, 16)",
  );
  await page.screenshot({
    path: "artifacts/ui-controls-light.png",
    fullPage: true,
  });
  await page.evaluate(() => {
    document.documentElement.dataset["hostTheme"] = "dark";
  });
  await expect(page.getByLabel("検索", { exact: true })).toHaveCSS(
    "background-color",
    "rgb(32, 41, 56)",
  );
  await page.screenshot({
    path: "artifacts/ui-controls-dark.png",
    fullPage: true,
  });
});

test("完了率を表示し、100%超・負値を維持。見積0や未設定を誤って0%にしない", async ({
  page,
}) => {
  await page.goto("/?scenario=progress");
  await range(page);
  await expect(page.locator('[data-item-id="201"] .progress-value')).toHaveText(
    "50%",
  );
  await expect(page.locator('[data-item-id="201"] .progress-value')).toHaveCSS(
    "font-size",
    "9px",
  );
  await expect(page.locator('[data-item-id="201"] .progress-value')).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await expect(page.locator('[data-item-id="202"] .progress-value')).toHaveText(
    "120%",
  );
  await expect(
    page.locator('[data-item-id="202"] .progress-fill'),
  ).toHaveAttribute("style", /width: 100%/);
  await expect(page.locator('[data-item-id="204"] .progress-value')).toHaveText(
    "-50%",
  );
  await expect(
    page.locator('[data-item-id="205"] .progress-value'),
  ).toHaveCount(0);
  await expect(page.locator('[data-item-id="101"] .progress-value')).toHaveText(
    ["85%", "85%"],
  );
  await expect(
    page.locator('[data-item-id="2"] .progress-value').first(),
  ).toHaveText("50%*");
  await expect(
    page.locator('[data-item-id="2"] .progress-value').first(),
  ).toHaveAttribute("title", /未設定 1件/);
});
