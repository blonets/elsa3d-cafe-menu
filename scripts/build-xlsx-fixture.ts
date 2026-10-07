/** Generates sample-import.xlsx (test fixture) into the repo root. Run: npm run fixture */
import path from "node:path";
import fs from "node:fs";
import { buildFixtureWorkbook, workbookToBuffer } from "../src/lib/import/template";

async function main() {
  const wb = await buildFixtureWorkbook();
  const buf = await workbookToBuffer(wb);
  const out = path.join(process.cwd(), "sample-import.xlsx");
  fs.writeFileSync(out, buf);
  console.log(`✓ fixture written → ${out} (${(buf.length / 1024).toFixed(0)}KB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
