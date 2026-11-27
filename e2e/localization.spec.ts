import { expect, test } from "@playwright/test";

test.use({ locale: "en-US" });

test("英語で起動し、フィルター・表示種類・Sprint・バーを保って切り替える", async ({
  page,
}) => {
  await page.goto("/?scenario=bugs");
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByLabel("Start Sprint", { exact: true }).selectOption("1");
  await page.getByLabel("End Sprint", { exact: true }).selectOption("3");
  await page.getByRole("button", { name: "Expand all", exact: true }).click();
  await page.getByRole("checkbox", { name: "Type US", exact: true }).uncheck();
  const assignees = page.locator("details.multi-filter").nth(1);
  await assignees.locator("summary").click();
  await assignees
    .getByRole("button", { name: "Clear all", exact: true })
    .click();
  const ren = assignees.getByRole("checkbox", {
    name: "Assignee Ren",
    exact: true,
  });
  await expect(ren).not.toBeChecked();
  await ren.check();
  await expect(ren).toBeChecked();
  await assignees.locator("summary").click();
  await page.getByLabel("Search", { exact: true }).fill("通知");
  const snapshot = await page
    .locator("[data-item-id]")
    .evaluateAll((elements) =>
      elements.map((el) => ({
        ids: el.getAttribute("data-member-ids"),
        bars: el.querySelectorAll(".bar").length,
      })),
    );
  expect(snapshot.length).toBeGreaterThan(0);
  await page.getByLabel("Language / 言語", { exact: true }).selectOption("ja");
  await expect(page.getByLabel("検索", { exact: true })).toHaveValue("通知");
  await expect(page.getByLabel("開始 Sprint", { exact: true })).toHaveValue(
    "1",
  );
  await expect(page.getByLabel("終了 Sprint", { exact: true })).toHaveValue(
    "3",
  );
  await expect(
    page.getByRole("checkbox", { name: "種類 US", exact: true }),
  ).not.toBeChecked();
  await expect(assignees.locator("summary")).toContainText("1件選択");
  expect(
    await page.locator("[data-item-id]").evaluateAll((elements) =>
      elements.map((el) => ({
        ids: el.getAttribute("data-member-ids"),
        bars: el.querySelectorAll(".bar").length,
      })),
    ),
  ).toEqual(snapshot);
  await expect(page.locator('[data-item-id="602"] .bar')).toHaveAttribute(
    "title",
    /完了率 80%/,
  );
  await page.reload();
  await expect(page.getByLabel("開始 Sprint", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Language / 言語", { exact: true })).toHaveValue(
    "ja",
  );
  await expect(
    page.getByRole("checkbox", { name: "種類 US", exact: true }),
  ).not.toBeChecked();
  await expect(page.getByLabel("検索", { exact: true })).toHaveValue("");
  await page.getByRole("checkbox", { name: "種類 US", exact: true }).check();
  await assignees.locator("summary").click();
  await assignees.getByRole("button", { name: "全選択", exact: true }).click();
  await assignees.locator("summary").click();
  await page.getByRole("button", { name: "すべて展開", exact: true }).click();
  await page
    .getByRole("button", { name: "折りたたむ #101", exact: true })
    .click();
  await page.getByLabel("Language / 言語", { exact: true }).selectOption("en");
  await expect(
    page.getByRole("button", { name: "Expand #101", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
});

test("既に取得した警告・空表示・未割当ラベルも切り替わる", async ({ page }) => {
  await page.goto("/?scenario=partial");
  await expect(page.locator(".warning").first()).toContainText(
    "Some items could not be retrieved",
  );
  await page
    .locator(".warning")
    .first()
    .getByText("Show details", { exact: true })
    .click();
  await expect(page.locator(".warning").first()).toContainText(
    "Partial retrieval: some items could not be retrieved.",
  );
  await page
    .locator(".warning")
    .nth(1)
    .getByText("Show details", { exact: true })
    .click();
  await expect(page.locator(".warning").nth(1)).toContainText(
    "Parent unavailable: #106",
  );
  await page.getByLabel("Language / 言語", { exact: true }).selectOption("ja");
  await expect(page.locator(".warning").first()).toContainText(
    "部分取得: 一部の項目を取得できませんでした。",
  );
  await page.goto("/?scenario=empty");
  await expect(
    page.getByText("表示対象がありません。", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Language / 言語", { exact: true }).selectOption("en");
  await expect(
    page.getByText("No items to display.", { exact: false }),
  ).toBeVisible();
  await page.goto("/?scenario=bugs");
  await expect(page.getByRole("table")).toBeVisible();
  const panel = page.locator("details.multi-filter").nth(1);
  await panel.locator("summary").click();
  await expect(
    panel.getByRole("checkbox", { name: "Assignee Unassigned", exact: true }),
  ).toBeVisible();
});

test("ストレージが無効でも切替でき、英語の狭い画面でもページが横にはみ出さない", async ({
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
  await page.goto("/?scenario=bugs");
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByLabel("Language / 言語", { exact: true }).selectOption("ja");
  await expect(page.getByLabel("開始 Sprint", { exact: true })).toBeVisible();
  await page.getByLabel("Language / 言語", { exact: true }).selectOption("en");
  for (const width of [1440, 1280, 800, 390, 360]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await expect(
      page.getByLabel("Language / 言語", { exact: true }),
    ).toBeVisible();
  }
});
