import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(appDir, "../..");
const dataDir = path.resolve(
  workspaceRoot,
  process.env.GOLDSPRINTS_DATA_DIR ?? ".goldsprints-dev/runtime"
);

export default defineConfig({
  dialect: "sqlite",
  schema: path.join(appDir, "src/backend/db/schema.ts"),
  out: path.join(appDir, "src/backend/db/drizzle"),
  dbCredentials: {
    url: path.join(dataDir, "goldsprints.sqlite")
  }
});
