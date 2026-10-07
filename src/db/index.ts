import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL || "postgresql://menu_user:menu_pass@localhost:5432/elsa3d_menu";

const client = postgres(connectionString, {
  max: 10,
  prepare: false,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
export { schema };
