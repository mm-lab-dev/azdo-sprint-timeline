import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
const root = resolve(import.meta.dirname, "..");
const temporary = resolve(root, ".cache/tmp");
mkdirSync(temporary, { recursive: true });
const result = spawnSync(
  process.execPath,
  [
    resolve(root, "node_modules/@angular/cli/bin/ng.js"),
    ...process.argv.slice(2),
  ],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, TEMP: temporary, TMP: temporary, TMPDIR: temporary },
  },
);
process.exitCode = result.status ?? 1;
