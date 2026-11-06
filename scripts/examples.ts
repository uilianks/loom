// Builds every example (examples/*.tx.js -> examples/out) and copies the preview sheets the README
// shows to docs/examples. Fails if any example has an error. Run: npm run examples (part of npm run check).
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { main } from "../src/node/cli.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "examples"), out = join(dir, "out"), media = join(root, "docs", "examples");
const log = console.log;
let failed = 0;
mkdirSync(media, { recursive: true });
for (const f of readdirSync(dir).filter((x) => x.endsWith(".tx.js")).sort()) {
  const lines: string[] = [];
  console.log = (s: string) => lines.push(s);
  const code = await main(["build", join(dir, f)]).finally(() => { console.log = log; });
  if (code !== 0) { failed++; console.log(`FAIL ${f}`); continue; }
  const names = lines.filter((l) => l.startsWith("material ")).map((l) => l.split(" ")[1].replace(/:$/, ""));
  for (const n of names) copyFileSync(join(out, "_preview", n + ".png"), join(media, n + ".png"));
  console.log(`ok   ${f}: ${lines.filter((l) => l.startsWith("material ")).join("; ")}`);
}
if (failed) { console.error(`${failed} example(s) failed`); process.exit(1); }
console.log(`README media -> ${media}`);
