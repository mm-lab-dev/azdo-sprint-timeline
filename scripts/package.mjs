import { mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
const manifest = JSON.parse(readFileSync("vss-extension.json", "utf8"));
const publisher = process.env.AZDO_PUBLISHER || manifest.publisher;
if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(publisher))
  throw new Error("Invalid publisher ID");
// Marketplace rejects SVG files anywhere in an Azure DevOps extension package.
function checkFiles(path) {
  if (statSync(path).isDirectory()) {
    for (const entry of readdirSync(path)) checkFiles(join(path, entry));
  } else if (/\.svg$/i.test(path)) {
    throw new Error(`Marketplace does not support packaged SVG files: ${path}`);
  }
}
for (const file of manifest.files) checkFiles(file.path);
mkdirSync("artifacts", { recursive: true });
mkdirSync(".cache/tmp", { recursive: true });
const result = spawnSync(
  process.execPath,
  [
    "node_modules/tfx-cli/_build/tfx-cli.js",
    "extension",
    "create",
    "--manifest-globs",
    "vss-extension.json",
    "--publisher",
    publisher,
    "--output-path",
    resolve("artifacts"),
    "--no-prompt",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      TEMP: resolve(".cache/tmp"),
      TMP: resolve(".cache/tmp"),
      TF_BUILD: "True",
    },
  },
);
process.exitCode = result.status ?? 1;
