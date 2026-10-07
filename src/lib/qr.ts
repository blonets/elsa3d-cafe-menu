import "server-only";
import QRCode from "qrcode";
import sharp from "sharp";
import path from "path";
import JSZip from "jszip";

const LOGO_PATH = path.join(process.cwd(), "public", "brand", "logo-mark.png");

type QrOptions = {
  size?: number;
  dark?: string;
  light?: string;
  withLogo?: boolean;
};

async function renderQrPng(text: string, opts: QrOptions): Promise<Buffer> {
  const size = opts.size ?? 1024;
  const dark = opts.dark ?? "#1c1917";
  const light = opts.light ?? "#ffffff";
  const withLogo = opts.withLogo !== false;

  let buf = await QRCode.toBuffer(text, {
    type: "png",
    width: size,
    margin: 2,
    errorCorrectionLevel: withLogo ? "H" : "M",
    color: { dark, light },
  });

  if (withLogo) {
    try {
      const logoSize = Math.round(size * 0.22);
      const logo = await sharp(LOGO_PATH).resize(logoSize, logoSize).png().toBuffer();
      buf = await sharp(buf)
        .composite([{ input: logo, left: Math.round((size - logoSize) / 2), top: Math.round((size - logoSize) / 2) }])
        .png()
        .toBuffer();
    } catch {
      // logo asset missing → plain QR
    }
  }
  return buf;
}

async function renderQrSvg(text: string, opts: QrOptions): Promise<string> {
  const dark = opts.dark ?? "#1c1917";
  const light = opts.light ?? "#ffffff";
  const withLogo = opts.withLogo !== false;

  let svg = await QRCode.toString(text, {
    type: "svg",
    margin: 2,
    errorCorrectionLevel: withLogo ? "H" : "M",
    color: { dark, light },
  });

  if (withLogo) {
    try {
      const logoB64 = (await sharp(LOGO_PATH).resize(240, 240).png().toBuffer()).toString("base64");
      const image = `<image x="39%" y="39%" width="22%" height="22%" href="data:image/png;base64,${logoB64}" preserveAspectRatio="xMidYMid meet"/>`;
      svg = svg.replace("</svg>", `${image}</svg>`);
    } catch {
      // logo asset missing → plain SVG
    }
  }
  return svg;
}

export async function qrPng(text: string, opts: QrOptions = {}): Promise<Buffer> {
  return renderQrPng(text, opts);
}

export async function qrSvg(text: string, opts: QrOptions = {}): Promise<string> {
  return renderQrSvg(text, opts);
}

/** Batch table QRs (t=1..count) as a ZIP of 1024px PNGs. */
export async function tableQrZip(baseUrl: string, count: number): Promise<Buffer> {
  const zip = new JSZip();
  for (let t = 1; t <= count; t++) {
    const buf = await renderQrPng(`${baseUrl}/?t=${t}`, { size: 1024 });
    zip.file(`table-${String(t).padStart(3, "0")}.png`, buf);
  }
  zip.file(
    "README.txt",
    "رموز QR للترابيزات — كافيه السعد\nكل صورة تفتح المنيو مع رقم التربيزة (؟t=N) لتتبع الطلبات والإحصائيات.\nاطبع كل صورة بحجم 5×5 سم على الأقل وضعها في مكان واضح على كل تربيزة.\n",
  );
  const content = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return content;
}
