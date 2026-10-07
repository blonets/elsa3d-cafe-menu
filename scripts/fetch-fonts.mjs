/**
 * Downloads Google Fonts woff2 subsets (arabic + latin) for self-hosting.
 * Deterministic builds: no runtime dependency on fonts.googleapis.com.
 */
import fs from "node:fs";
import path from "node:path";

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const OUT = path.join(process.cwd(), "public", "fonts");
fs.mkdirSync(OUT, { recursive: true });

const FAMILIES = [
  { css: "https://fonts.googleapis.com/css2?family=Cairo:wght@400..900&display=swap", name: "cairo" },
  { css: "https://fonts.googleapis.com/css2?family=Inter:wght@400..700&display=swap", name: "inter" },
  { css: "https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap", name: "amiri" },
];

const WANTED_SUBSETS = ["arabic", "latin"];

for (const fam of FAMILIES) {
  const res = await fetch(fam.css, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`css fetch failed: ${fam.name} ${res.status}`);
  const css = await res.text();

  // Split into blocks: /* subset */ @font-face { ... }
  const blocks = [...css.matchAll(/\/\*\s*([a-z-]+)\s*\*\/\s*(@font-face\s*\{[^}]+\})/g)];
  const kept = [];
  for (const [, subset, block] of blocks) {
    if (!WANTED_SUBSETS.includes(subset)) continue;
    const url = block.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
    const weight = block.match(/font-weight:\s*([^;]+);/)?.[1]?.trim() ?? "400";
    const unicodeRange = block.match(/unicode-range:\s*([^;]+);/)?.[1]?.trim() ?? "";
    if (!url) continue;
    kept.push({ subset, weight, url, unicodeRange });
  }

  const cssOut = [];
  for (const k of kept) {
    const file = `${fam.name}-${k.weight.replace(/\s+/g, "")}-${k.subset}.woff2`;
    const bin = Buffer.from(await (await fetch(k.url, { headers: { "User-Agent": UA } })).arrayBuffer());
    fs.writeFileSync(path.join(OUT, file), bin);
    console.log(`${file}  ${(bin.length / 1024).toFixed(0)}KB  weight=${k.weight}`);
    cssOut.push(`@font-face {
  font-family: '${fam.name === "cairo" ? "Cairo" : fam.name === "inter" ? "Inter" : "Amiri"}';
  font-style: normal;
  font-weight: ${k.weight};
  font-display: swap;
  src: url(/fonts/${file}) format('woff2');
  unicode-range: ${k.unicodeRange};
}`);
  }
  fs.writeFileSync(path.join(OUT, `${fam.name}.css`), cssOut.join("\n") + "\n");
  console.log(`✓ ${fam.name}: ${kept.length} faces`);
}
console.log("fonts done → public/fonts/");
