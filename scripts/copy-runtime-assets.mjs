import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const desktopDir = path.join(workspaceRoot, "apps", "desktop");

const assetCopies = [
  {
    from: path.join(desktopDir, "src", "backend", "db", "migrations"),
    to: path.join(desktopDir, "dist", "electron", "migrations")
  }
];

for (const assetCopy of assetCopies) {
  fs.rmSync(assetCopy.to, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(assetCopy.to), { recursive: true });
  fs.cpSync(assetCopy.from, assetCopy.to, { recursive: true });
}
