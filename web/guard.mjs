/**
 * Refuses to build while any imported result file is still a placeholder.
 * Placeholders exist so the app can compile before a long sweep finishes; this
 * makes it impossible to accidentally publish one.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dirname, "src", "results");
const stubs = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .filter((f) => JSON.parse(readFileSync(join(dir, f), "utf8"))._stub === true);

if (stubs.length) {
  console.error(`\n  Refusing to build: placeholder results still present -> ${stubs.join(", ")}`);
  console.error("  Run the experiments, then `python sync_web.py`.\n");
  process.exit(1);
}
console.log(`  results ok (${readdirSync(dir).filter((f) => f.endsWith(".json")).length} files, no placeholders)`);
