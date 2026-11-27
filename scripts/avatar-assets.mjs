import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

process.env.PLAYWRIGHT_BROWSERS_PATH = resolve(".cache/ms-playwright");
process.env.TEMP = resolve(".cache/tmp");
process.env.TMP = process.env.TEMP;
process.env.TMPDIR = process.env.TEMP;
mkdirSync(process.env.TEMP, { recursive: true });
mkdirSync("src/assets/avatars", { recursive: true });

const { chromium } = await import("@playwright/test");
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 40, height: 40 },
    deviceScaleFactor: 1,
  });
  for (const name of ["aki", "ren", "mina"]) {
    await page.setContent(
      readFileSync(`resources/avatar-sources/${name}.svg`, "utf8"),
    );
    await page.addStyleTag({
      content: "html,body{margin:0;background:transparent}svg{display:block}",
    });
    await page.screenshot({
      path: `src/assets/avatars/${name}.png`,
      omitBackground: true,
    });
  }
} finally {
  await browser.close();
}
