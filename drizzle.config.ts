import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://menu_user:menu_pass@localhost:5432/elsa3d_menu",
  },
  strict: false,
  verbose: false,
});
