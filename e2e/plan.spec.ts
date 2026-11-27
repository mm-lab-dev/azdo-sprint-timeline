import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
test("Sprint等幅軸・階層・期間集約・表示設定・フォーム遷移", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByLabel("開始 Sprint", { exact: true }).selectOption("1");
  await page.getByLabel("終了 Sprint", { exact: true }).selectOption("3");
  await expect(page.locator('[data-item-id="101"] .bar')).toHaveCount(2);
  await page.getByRole("button", { name: "すべて展開", exact: true }).click();
  await expect(page.locator('[data-item-id="201"] .bar')).toHaveCount(1);
  await expect(page.locator('[data-item-id="202"] .bar')).toHaveCount(1);
  await expect(page.locator('[data-item-id="102"] .bar')).toHaveCount(3);
  await expect(page.locator('[data-item-id="102"] .bar.gap')).toHaveCount(1);
  await expect(page.locator('[data-item-id="203"]')).toHaveCount(0);
  await expect(page.locator('[data-item-id="103"]')).toHaveCount(0);
  const widths = await page
    .locator(".sprint-heading")
    .evaluateAll((elements) =>
      elements.map((e) => e.getBoundingClientRect().width),
    );
  expect(new Set(widths).size).toBe(1);
  expect(widths[0]).toBe(150);
  await page.getByLabel("表示", { exact: true }).selectOption("noTasks");
  await expect(page.locator('[data-item-id="201"]')).toHaveCount(0);
  await expect(page.locator('[data-item-id="101"] .bar')).toHaveCount(2);
  await page.getByLabel("表示", { exact: true }).selectOption("stories");
  await expect(page.locator('[data-item-id="1"]')).toHaveCount(0);
  await expect(page.locator('[data-item-id="102"] .bar')).toHaveCount(3);
  await page.getByLabel("表示", { exact: true }).selectOption("all");
  await page.getByLabel("検索", { exact: true }).fill("認証API");
  await expect(page.locator('[data-item-id="1"]')).toBeVisible();
  await expect(page.locator('[data-item-id="202"]')).toBeVisible();
  await expect(page.locator('[data-item-id="101"] .bar')).toHaveCount(2);
  await expect(
    page.getByText("非表示の子に由来する集約期間も維持しています。", {
      exact: false,
    }),
  ).toBeVisible();
  await page.locator('[data-item-id="202"] .item-link').click();
  await expect(
    page.getByText("モック: Work Item #202 を開きました。"),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await page.getByLabel("検索", { exact: true }).fill("");
  await page.screenshot({ path: "artifacts/mock-light.png", fullPage: true });
});
test("10Sprint / 1000行を描画しフィルター操作を実測", async ({ page }) => {
  await page.goto("/?scenario=large");
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByLabel("開始 Sprint", { exact: true }).selectOption("0");
  await page.getByLabel("終了 Sprint", { exact: true }).selectOption("9");
  await expect(page.getByRole("table")).toBeVisible();
  const start = Date.now();
  await page.getByRole("button", { name: "すべて展開", exact: true }).click();
  await expect(page.locator("[data-item-id]")).toHaveCount(1000);
  const expandMs = Date.now() - start;
  const filterStart = Date.now();
  await page.getByLabel("検索", { exact: true }).fill("Performance item 999");
  await expect(page.locator('[data-item-id="999"]')).toBeVisible();
  await expect(page.locator("[data-item-id]")).toHaveCount(3);
  mkdirSync("artifacts", { recursive: true });
  writeFileSync(
    "artifacts/performance-ui.json",
    JSON.stringify(
      {
        sprints: 10,
        rows: 1000,
        expandMs,
        filterMs: Date.now() - filterStart,
        browser: "Chromium",
      },
      null,
      2,
    ),
  );
});
test("S2のみでも祖先USとFeatureを保持し範囲外継続表示", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByLabel("終了 Sprint", { exact: true }).selectOption("2");
  await page.getByRole("button", { name: "すべて展開", exact: true }).click();
  await expect(page.locator('[data-item-id="101"]')).toBeVisible();
  await expect(page.locator('[data-item-id="101"] .bar')).toContainText("←");
  await expect(page.locator('[data-item-id="201"]')).toHaveCount(0);
  await expect(page.locator('[data-item-id="202"]')).toBeVisible();
});
test("フィルター・折りたたみ・チーム切替", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("table")).toBeVisible();
  await page
    .getByRole("button", { name: "すべて折りたたむ", exact: true })
    .click();
  await expect(page.locator('[data-item-id="101"]')).toHaveCount(0);
  await page.getByLabel("担当者", { exact: true }).selectOption("Ren");
  await expect(page.locator('[data-item-id="202"]')).toBeVisible();
  await expect(page.locator('[data-item-id="101"]')).toBeVisible();
  await page.getByLabel("状態", { exact: true }).selectOption("Closed");
  await expect(page.locator('[data-item-id="205"]')).toBeVisible();
  await page.getByLabel("担当者", { exact: true }).selectOption("");
  await page.getByLabel("状態", { exact: true }).selectOption("");
  await page.getByLabel("Team", { exact: true }).selectOption("beta");
  await expect(page.locator('[data-item-id="301"]')).toBeVisible();
  await expect(page.locator('[data-item-id="101"]')).toHaveCount(0);
  await expect(page.getByLabel("開始 Sprint", { exact: true })).toHaveValue(
    "2",
  );
});
for (const [scenario, text] of [
  ["403", "権限不足"],
  ["429", "アクセス集中"],
  ["network", "通信エラー"],
  ["empty", "表示対象がありません"],
  ["partial", "部分取得・データ警告"],
]) {
  test(`状態表示: ${scenario}`, async ({ page }) => {
    await page.goto(`/?scenario=${scenario}`);
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
    if (["403", "429", "network"].includes(scenario)) {
      await page.getByRole("button", { name: "再試行", exact: true }).click();
      await expect(page.getByRole("alert")).toContainText(text);
    }
  });
}
test("逆転範囲のエラーと回復、読み込み表示、古い応答を破棄", async ({
  page,
}) => {
  await page.goto("/?scenario=slow");
  await expect(page.getByText("実行計画を読み込み中…")).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByLabel("開始 Sprint", { exact: true }).selectOption("5");
  await page.getByLabel("終了 Sprint", { exact: true }).selectOption("2");
  await expect(page.getByRole("alert")).toContainText("範囲エラー");
  await page.getByLabel("開始 Sprint", { exact: true }).selectOption("1");
  await page.getByLabel("Team", { exact: true }).selectOption("beta");
  await expect(page.locator('[data-item-id="301"]')).toBeVisible();
  await expect(page.locator('[data-item-id="101"]')).toHaveCount(0);
});
test("キーボード・ダークテーマ・スクロール中の固定列", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByLabel("検索", { exact: true }).focus();
  await page.keyboard.type("監査");
  await expect(page.locator('[data-item-id="104"]')).toBeVisible();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Backspace");
  await page.setViewportSize({ width: 800, height: 700 });
  const fixed = page.locator(".timeline-header .item-cell");
  const before = await fixed.boundingBox();
  await page.locator(".timeline-scroll").evaluate((el) => {
    el.scrollLeft = 200;
  });
  const after = await fixed.boundingBox();
  expect(after?.x).toBe(before?.x);
  await page.screenshot({ path: "artifacts/mock-dark.png", fullPage: true });
});
