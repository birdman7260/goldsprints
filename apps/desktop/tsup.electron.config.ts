import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/electron/main.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  outDir: "dist/electron",
  external: ["electron"],
  // Workspace packages export source TypeScript for Vite/dev mode, so the Electron bundle must
  // inline them instead of leaving runtime imports that Electron cannot load after `pnpm build`.
  noExternal: [/^@goldsprints\/shared(\/.*)?$/]
});
