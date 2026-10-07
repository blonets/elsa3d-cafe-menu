/**
 * Boot migration + settings seeding.
 * Runs inside the container before `node server.js`:
 *   node scripts/migrate.mjs && node server.js
 * Locally: DATABASE_URL=... node scripts/migrate.mjs
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL is not set");
  process.exit(1);
}

const client = postgres(url, { max: 1, prepare: false, connect_timeout: 15 });

try {
  console.log("[migrate] running migrations…");
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("[migrate] done");

  // Seed singleton settings row from env (idempotent — never overwrites owner edits)
  const nameAr = process.env.CAFE_NAME_AR || "كافيه السعد";
  const nameEn = process.env.CAFE_NAME_EN || "Elsa3d Cafe";
  const phone = process.env.CAFE_PHONE || "+201025617078";
  const whatsapp = process.env.CAFE_WHATSAPP || "201025617078";

  const existing = await client`SELECT admin_password_hash IS NOT NULL AS has_hash FROM settings WHERE id = 1`;
  if (existing.length === 0) {
    const envPass = process.env.ADMIN_PASSWORD;
    const hash = envPass ? await bcrypt.hash(envPass, 10) : null;
    await client`
      INSERT INTO settings (id, cafe_name_ar, cafe_name_en, phone, whatsapp, admin_password_hash)
      VALUES (1, ${nameAr}, ${nameEn}, ${phone}, ${whatsapp}, ${hash})
      ON CONFLICT (id) DO NOTHING`;
    console.log("[migrate] settings row seeded");
  } else if (existing[0].has_hash === false && process.env.ADMIN_PASSWORD) {
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    await client`UPDATE settings SET admin_password_hash = ${hash} WHERE id = 1 AND admin_password_hash IS NULL`;
    console.log("[migrate] admin password hash initialized");
  }
} catch (e) {
  console.error("[migrate] failed:", e);
  process.exit(1);
} finally {
  await client.end({ timeout: 5 });
}
