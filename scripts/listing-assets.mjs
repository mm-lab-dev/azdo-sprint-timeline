import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { URL } from "node:url";
process.env.PLAYWRIGHT_BROWSERS_PATH = resolve(".cache/ms-playwright");
process.env.TEMP = resolve(".cache/tmp");
process.env.TMP = process.env.TEMP;
const { chromium } = await import("@playwright/test");
mkdirSync("resources/readme", { recursive: true });
mkdirSync(".cache/tmp", { recursive: true });
const browser = await chromium.launch();
try {
  const icon = await browser.newPage({
    viewport: { width: 128, height: 128 },
    deviceScaleFactor: 1,
  });
  await icon.setContent(readFileSync("resources/icon.svg", "utf8"));
  await icon.addStyleTag({
    content:
      "html,body{margin:0;width:128px;height:128px;background:transparent}svg{display:block}",
  });
  await icon.screenshot({ path: "resources/icon.png", omitBackground: true });
  await icon.close();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1200 },
    deviceScaleFactor: 1,
    colorScheme: "light",
  });
  await page.goto(
    new URL(
      "?scenario=epic",
      process.env.LISTING_BASE_URL || "http://127.0.0.1:4200",
    ).href,
  );
  await page.getByRole("table").waitFor();
  await page.getByLabel("開始 Sprint", { exact: true }).selectOption("1");
  await page.getByLabel("終了 Sprint", { exact: true }).selectOption("3");
  await page.getByRole("checkbox", { name: "種類 Epic", exact: true }).check();
  await page.locator('[data-item-id="900"]').waitFor();
  await page.getByRole("table").waitFor();
  await page.getByRole("button", { name: "すべて展開", exact: true }).click();
  await page.locator('[data-item-id="205"]').waitFor();
  await page.locator("h1").click();
  await page.screenshot({
    path: "resources/readme/overview.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.screenshot({
    path: "resources/readme/dark.png",
    fullPage: true,
    animations: "disabled",
  });
} finally {
  await browser.close();
}
