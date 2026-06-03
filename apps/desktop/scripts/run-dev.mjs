#!/usr/bin/env node

import { spawn } from "node:child_process";

const mode = process.argv[2] ?? "dev";

const electronCommands = {
  dev: "wait-on tcp:5173 && cross-env NODE_OPTIONS=--import=tsx ELECTRON_RENDERER_URL=http://127.0.0.1:5173 electron src/electron/main.ts",
  debug:
    "wait-on tcp:5173 && cross-env ROLLER_RUMBLE_DEBUG=1 ROLLER_RUMBLE_OPEN_DEVTOOLS=1 NODE_OPTIONS=--import=tsx ELECTRON_RENDERER_URL=http://127.0.0.1:5173 electron --inspect=9229 --remote-debugging-port=9223 src/electron/main.ts",
  "debug:break":
    "wait-on tcp:5173 && cross-env ROLLER_RUMBLE_DEBUG=1 ROLLER_RUMBLE_OPEN_DEVTOOLS=1 NODE_OPTIONS=--import=tsx ELECTRON_RENDERER_URL=http://127.0.0.1:5173 electron --inspect-brk=9229 --remote-debugging-port=9223 src/electron/main.ts"
};

const electronCommand = electronCommands[mode];

if (!electronCommand) {
  console.error(
    `Unknown dev mode "${mode}". Expected one of: ${Object.keys(electronCommands).join(", ")}`
  );
  process.exit(1);
}

const concurrentlyBin = process.platform === "win32" ? "concurrently.cmd" : "concurrently";
let receivedShutdownSignal = false;

const child = spawn(
  concurrentlyBin,
  ["-k", "--success", "first", "vite --strictPort", electronCommand],
  {
    stdio: "inherit"
  }
);

const shutdown = (signal) => {
  if (receivedShutdownSignal) {
    process.exit(signal === "SIGINT" ? 130 : 143);
  }

  receivedShutdownSignal = true;
  child.kill(signal);
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

child.on("close", (code, signal) => {
  if (receivedShutdownSignal || signal === "SIGINT" || signal === "SIGTERM") {
    process.exit(0);
  }

  process.exit(code ?? 1);
});
