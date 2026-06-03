import net from "node:net";
import { DEFAULT_OS2L_PORT } from "@roller-rumble/shared/constants";
import type { CountdownTriggerListener, RaceTriggerAdapter } from "./trigger";

const COUNTDOWN_ATTRIBUTE_NAMES = [
  "countdownMs",
  "countdownDurationMs",
  "countdownMilliseconds",
  "countdown_ms",
  "countdown_duration_ms",
  "countdown_milliseconds"
] as const;

function shouldTrigger(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("roller-rumble-start") ||
    normalized.includes("race-start") ||
    normalized.includes('"evt":"play"') ||
    normalized.includes('"evt":"cue"') ||
    normalized.includes('"action":"start"')
  );
}

function readCountdownDurationFromObject(value: unknown): number | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const name of COUNTDOWN_ATTRIBUTE_NAMES) {
    const durationMs = normalizeCountdownDuration(record[name]);
    if (durationMs != null) {
      return durationMs;
    }
  }

  for (const child of Object.values(record)) {
    const durationMs = readCountdownDurationFromObject(child);
    if (durationMs != null) {
      return durationMs;
    }
  }

  return null;
}

function normalizeCountdownDuration(value: unknown): number | null {
  const durationMs =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;

  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return null;
  }

  return Math.round(durationMs);
}

export function parseOs2lCountdownDurationMs(message: string): number | null {
  const trimmed = message.trim();
  try {
    const parsed: unknown = JSON.parse(trimmed);
    const durationMs = readCountdownDurationFromObject(parsed);
    if (durationMs != null) {
      return durationMs;
    }
  } catch {
    // VirtualDJ OS2L actions are often plain commands instead of JSON.
  }

  for (const name of COUNTDOWN_ATTRIBUTE_NAMES) {
    const attributePattern = new RegExp(`${name}\\s*[:=]\\s*"?([0-9]+(?:\\.[0-9]+)?)"?`, "i");
    const match = attributePattern.exec(message);
    if (match?.[1]) {
      const durationMs = normalizeCountdownDuration(match[1]);
      if (durationMs != null) {
        return durationMs;
      }
    }
  }

  return null;
}

export class Os2lRaceTriggerAdapter implements RaceTriggerAdapter {
  readonly id = "os2l";
  readonly label = "VirtualDJ OS2L";

  private server: net.Server | null = null;
  private listener: CountdownTriggerListener | null = null;
  private enabled = false;
  private armedRaceId: string | null = null;

  constructor(private readonly port = DEFAULT_OS2L_PORT) {}

  start(listener: CountdownTriggerListener): void {
    this.listener = listener;
    this.server = net.createServer((socket) => {
      socket.setEncoding("utf8");
      socket.on("data", (chunk) => {
        if (!this.enabled || !this.armedRaceId) {
          return;
        }

        const message = chunk.toString();
        if (shouldTrigger(message)) {
          this.listener?.("os2l", {
            countdownDurationMs: parseOs2lCountdownDurationMs(message) ?? undefined
          });
        }
      });
    });

    this.server.listen(this.port, "127.0.0.1");
  }

  stop(): void {
    this.disarmRace();
    this.listener = null;
    this.server?.close();
    this.server = null;
  }

  armRace(raceId: string): void {
    this.armedRaceId = raceId;
  }

  disarmRace(): void {
    this.armedRaceId = null;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}
