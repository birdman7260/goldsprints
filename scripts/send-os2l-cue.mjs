import net from "node:net";
import { parseArgs } from "node:util";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 9996;
const DEFAULT_TIMEOUT_MS = 2_000;

const forwardedArgs = process.argv.slice(2);
if (forwardedArgs[0] === "--") {
  forwardedArgs.shift();
}

const { values } = parseArgs({
  args: forwardedArgs,
  options: {
    action: {
      type: "string",
      default: "start"
    },
    countdownMs: {
      type: "string"
    },
    dryRun: {
      type: "boolean",
      default: false
    },
    event: {
      type: "string",
      default: "cue"
    },
    host: {
      type: "string",
      default: DEFAULT_HOST
    },
    id: {
      type: "string",
      default: "roller-rumble-start"
    },
    message: {
      type: "string"
    },
    port: {
      type: "string",
      default: String(DEFAULT_PORT)
    },
    timeoutMs: {
      type: "string",
      default: String(DEFAULT_TIMEOUT_MS)
    }
  }
});

const port = Number(values.port);
const timeoutMs = Number(values.timeoutMs);
const countdownMs = values.countdownMs == null ? undefined : Number(values.countdownMs);

if (!Number.isInteger(port) || port <= 0) {
  console.error(`Invalid port: ${values.port}`);
  process.exit(1);
}

if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
  console.error(`Invalid timeoutMs: ${values.timeoutMs}`);
  process.exit(1);
}

if (values.countdownMs != null && (!Number.isFinite(countdownMs) || countdownMs < 0)) {
  console.error(`Invalid countdownMs: ${values.countdownMs}`);
  process.exit(1);
}

// The default JSON payload mirrors a simple start cue without requiring the full
// real-world OS2L sender format from VirtualDJ.
const payload =
  values.message ??
  JSON.stringify({
    action: values.action,
    ...(countdownMs == null ? {} : { countdownMs: Math.round(countdownMs) }),
    evt: values.event,
    id: values.id,
    sentAt: new Date().toISOString(),
    source: "roller-rumble-os2l-simulator"
  });

if (values.dryRun) {
  console.log(payload);
  process.exit(0);
}

const socket = net.createConnection(
  {
    host: values.host,
    port
  },
  () => {
    socket.write(`${payload}\n`);
    socket.end();
  }
);

socket.setTimeout(timeoutMs, () => {
  console.error(
    `Timed out connecting to ${values.host}:${port}. Is the app running with OS2L enabled?`
  );
  socket.destroy();
  process.exitCode = 1;
});

socket.on("close", (hadError) => {
  if (!hadError && process.exitCode !== 1) {
    console.log(`Sent OS2L simulator cue to ${values.host}:${port}`);
    console.log(payload);
  }
});

socket.on("error", (error) => {
  console.error(`Failed to send OS2L simulator cue: ${error.message}`);
  process.exitCode = 1;
});
