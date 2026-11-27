import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
const manifest = JSON.parse(readFileSync("vss-extension.json", "utf8"));
const publisher = process.env.AZDO_PUBLISHER || manifest.publisher;
if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(publisher))
  throw new Error("Invalid publisher ID");
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
