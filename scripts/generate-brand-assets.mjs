/**
 * Brand asset pipeline — Elsa3d Cafe
 * Source: elsa3dCafe_Brandimageforlogoandicoandmarkenting.jpeg (circular badge on brushed gold)
 *
 * Generates into public/brand/ + src/app/:
 *   logo.png          800×800 circular-cropped badge (transparent corners)
 *   logo-mark.png     512×512 tight circular mark (QR overlay + header)
 *   favicon.ico       16/32/48
 *   favicon-32.png
 *   apple-touch-icon.png  180×180
 *   icon-512.png      maskable (padded on dark disc)
 *   og-image.png      1200×630 brand card
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd());
const SRC = path.join(ROOT, "elsa3dCafe_Brandimageforlogoandicoandmarkenting.jpeg");
const OUT = path.join(ROOT, "public", "brand");
fs.mkdirSync(OUT, { recursive: true });

async function detectBadgeBox() {
  // Detect the dark circular badge on the light background.
  // Use column/row histograms of dark pixels — robust to speckles and vignetting.
  const { data, info } = await sharp(SRC).grayscale().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const THRESH = 90;
  const colCount = new Array(W).fill(0);
  const rowCount = new Array(H).fill(0);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[y * W + x] < THRESH) {
        colCount[x]++;
        rowCount[y]++;
      }
    }
  }
  const maxCol = Math.max(...colCount);
  const maxRow = Math.max(...rowCount);
  const CUT = 0.35; // columns/rows holding ≥35% of the peak dark count belong to the disc
  let minX = -1, maxX = -1, minY = -1, maxY = -1;
  for (let x = 0; x < W; x++) if (colCount[x] >= maxCol * CUT) { if (minX < 0) minX = x; maxX = x; }
  for (let y = 0; y < H; y++) if (rowCount[y] >= maxRow * CUT) { if (minY < 0) minY = y; maxY = y; }
  if (maxX <= minX || maxY <= minY) throw new Error("badge not detected");
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const r = Math.max(maxX - minX, maxY - minY) / 2;
  return { cx, cy, r, W, H };
}

function circleMask(size) {
  return Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
  );
}

function roundedDisc(size, bg) {
  return Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${bg}"/></svg>`,
  );
}

async function main() {
  const { cx, cy, r, W, H } = await detectBadgeBox();
  console.log(`badge center=(${cx.toFixed(0)},${cy.toFixed(0)}) r=${r.toFixed(0)} in ${W}x${H}`);

  // A little padding beyond the detected edge so the badge ring isn't clipped
  const pad = r * 0.06;
  const side = Math.min(Math.round((r + pad) * 2), W, H);

  const cropBase = {
    left: Math.max(0, Math.round(cx - side / 2)),
    top: Math.max(0, Math.round(cy - side / 2)),
    width: Math.min(side, W),
    height: Math.min(side, H),
  };

  /* logo.png — 800×800 circular */
  await sharp(SRC)
    .extract(cropBase)
    .resize(800, 800)
    .composite([{ input: circleMask(800), blend: "dest-in" }])
    .png()
    .toFile(path.join(OUT, "logo.png"));

  /* logo-mark.png — 512×512 tight circular mark */
  await sharp(SRC)
    .extract(cropBase)
    .resize(512, 512)
    .composite([{ input: circleMask(512), blend: "dest-in" }])
    .png()
    .toFile(path.join(OUT, "logo-mark.png"));

  /* favicon source: 256 mark for scaling down */
  const mark256 = await sharp(SRC)
    .extract(cropBase)
    .resize(256, 256)
    .composite([{ input: circleMask(256), blend: "dest-in" }])
    .png()
    .toBuffer();

  await sharp(mark256).resize(32, 32).png().toFile(path.join(OUT, "favicon-32.png"));
  await sharp(mark256).resize(180, 180).png().toFile(path.join(OUT, "apple-touch-icon.png"));

  /* icon-512 maskable: badge on dark disc with safe padding */
  const inner = await sharp(SRC)
    .extract(cropBase)
    .resize(380, 380)
    .composite([{ input: circleMask(380), blend: "dest-in" }])
    .png()
    .toBuffer();
  await sharp({ create: { width: 512, height: 512, channels: 4, background: "#1c1917" } })
    .composite([{ input: roundedDisc(512, "#1c1917"), blend: "over" }, { input: inner, left: 66, top: 66 }])
    .png()
    .toFile(path.join(OUT, "icon-512.png"));

  /* favicon.ico (16/32/48 — PNG-compressed entries) */
  const entries = [];
  for (const s of [16, 32, 48]) {
    const png = await sharp(mark256).resize(s, s).png().toBuffer();
    entries.push({ size: s, png });
  }
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  entries.forEach((e, i) => {
    const o = i * 16;
    dir[o] = e.size === 256 ? 0 : e.size;
    dir[o + 1] = e.size === 256 ? 0 : e.size;
    dir[o + 2] = 0;
    dir[o + 3] = 0;
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(e.png.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += e.png.length;
  });
  fs.writeFileSync(path.join(OUT, "favicon.ico"), Buffer.concat([header, dir, ...entries.map((e) => e.png)]));

  /* og-image.png 1200×630 */
  const ogLogo = await sharp(SRC)
    .extract(cropBase)
    .resize(400, 400)
    .composite([{ input: circleMask(400), blend: "dest-in" }])
    .png()
    .toBuffer();
  const ogBg = Buffer.from(
    `<svg width="1200" height="630">
       <defs>
         <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
           <stop offset="0" stop-color="#1c1917"/>
           <stop offset="1" stop-color="#292018"/>
         </linearGradient>
         <radialGradient id="glow" cx="0.5" cy="0.42" r="0.55">
           <stop offset="0" stop-color="#b8860b" stop-opacity="0.28"/>
           <stop offset="1" stop-color="#b8860b" stop-opacity="0"/>
         </radialGradient>
       </defs>
       <rect width="1200" height="630" fill="url(#g)"/>
       <rect width="1200" height="630" fill="url(#glow)"/>
       <rect x="28" y="28" width="1144" height="574" fill="none" stroke="#b8860b" stroke-opacity="0.55" stroke-width="2" rx="18"/>
       <circle cx="600" cy="252" r="238" fill="#b8860b" fill-opacity="0.10"/>
     </svg>`,
  );
  await sharp({ create: { width: 1200, height: 630, channels: 4, background: "#1c1917" } })
    .composite([{ input: ogBg }, { input: ogLogo, left: 400, top: 115 }])
    .png()
    .toFile(path.join(OUT, "og-image.png"));

  /* Palette-compress the web PNGs (photo-sourced crops are large) */
  for (const name of ["logo.png", "logo-mark.png"]) {
    const p = path.join(OUT, name);
    const q = await sharp(p).png({ palette: true, quality: 90, compressionLevel: 9 }).toBuffer();
    fs.writeFileSync(p, q);
  }

  /* Also expose favicon + icons at src/app for Next metadata */
  const appDir = path.join(ROOT, "src", "app");
  fs.mkdirSync(appDir, { recursive: true });
  fs.copyFileSync(path.join(OUT, "favicon.ico"), path.join(appDir, "favicon.ico"));
  fs.copyFileSync(path.join(OUT, "apple-touch-icon.png"), path.join(appDir, "apple-touch-icon.png"));
  fs.copyFileSync(path.join(OUT, "icon-512.png"), path.join(appDir, "icon-512.png"));

  console.log("✓ brand assets generated in public/brand/ + src/app/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
