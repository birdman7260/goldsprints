import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { loadDotenvFiles } from "../env";
import {
  createCloudflaredConfig,
  getPublicBackendHealthUrl,
  getPublicRacerPageUrl,
  getPublicWebSocketProbeUrl,
  installCloudflared,
  publicHostnameRoutingHint,
  resolveCloudflared
} from "./cloudflared-tools";

function findWorkspaceRoot(): string {
  let candidate = process.cwd();
  while (candidate !== path.dirname(candidate)) {
    if (fs.existsSync(path.join(candidate, "pnpm-workspace.yaml"))) {
      return candidate;
    }
    candidate = path.dirname(candidate);
  }

  return process.cwd();
}

function resolveDataDir(rootDir: string): string {
  const configuredDataDir = process.env.ROLLER_RUMBLE_DATA_DIR;
  if (configuredDataDir) {
    return path.isAbsolute(configuredDataDir)
      ? configuredDataDir
      : path.resolve(rootDir, configuredDataDir);
  }

  return path.resolve(rootDir, ".roller-rumble-dev/runtime");
}

function printDiagnostics(label: string, diagnostics: ReturnType<typeof resolveCloudflared>): void {
  console.log(label);
  console.log(`  mode: ${diagnostics.mode}`);
  console.log(`  tunnel: ${diagnostics.tunnelName ?? "not configured"}`);
  console.log(`  public URL: ${diagnostics.publicUrl ?? "not configured"}`);
  console.log(`  token configured: ${diagnostics.hasToken ? "yes" : "no"}`);
  console.log(`  binary source: ${diagnostics.binarySource}`);
  console.log(`  binary path: ${diagnostics.binaryPath ?? "not found"}`);
  console.log(`  version: ${diagnostics.cloudflaredVersion ?? "unknown"}`);
  console.log(`  app-managed install path: ${diagnostics.installPath ?? "unsupported"}`);
  console.log(`  download URL: ${diagnostics.downloadUrl ?? "unsupported"}`);
  if (diagnostics.message) {
    console.log(`  message: ${diagnostics.message}`);
  }
  if (diagnostics.lastError) {
    console.log(`  last error: ${diagnostics.lastError}`);
  }
}

async function printPublicBackendHealth(publicRacerUrl: string | null): Promise<boolean> {
  const healthUrl = getPublicBackendHealthUrl(publicRacerUrl);
  if (!healthUrl) {
    console.log("  public backend health: skipped, no public URL configured");
    return true;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 5000);

  try {
    const response = await fetch(healthUrl, { signal: controller.signal });
    if (!response.ok) {
      console.log(`  public backend health: failed (${String(response.status)} ${healthUrl})`);
      console.log(`  hint: ${publicHostnameRoutingHint()}`);
      return false;
    }

    const payload = (await response.json().catch(() => null)) as { ok?: unknown } | null;
    if (payload?.ok !== true) {
      console.log(`  public backend health: unexpected response from ${healthUrl}`);
      return false;
    }

    console.log(`  public backend health: ok (${healthUrl})`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.log(`  public backend health: failed (${message})`);
    console.log(`  hint: start the tunnel and verify ${publicHostnameRoutingHint()}`);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function printPublicRacerPageHealth(publicRacerUrl: string | null): Promise<boolean> {
  const racerPageUrl = getPublicRacerPageUrl(publicRacerUrl);
  if (!racerPageUrl) {
    console.log("  public racer page: skipped, no public URL configured");
    return true;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 5000);

  try {
    const response = await fetch(racerPageUrl, { signal: controller.signal });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("text/html")) {
      console.log(
        `  public racer page: failed (${String(response.status)} ${racerPageUrl}, ${contentType || "unknown content type"})`
      );
      console.log(`  hint: ${publicHostnameRoutingHint()}`);
      return false;
    }

    console.log(`  public racer page: ok (${racerPageUrl})`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.log(`  public racer page: failed (${message})`);
    console.log(`  hint: ${publicHostnameRoutingHint()}`);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function probeWebSocketUpgrade(url: string): Promise<{ ok: boolean; detail: string }> {
  return new Promise((resolve) => {
    const probeUrl = new URL(url);
    const requestModule = probeUrl.protocol === "https:" ? https : http;
    const request = requestModule.request(probeUrl, {
      method: "GET",
      headers: {
        Connection: "Upgrade",
        Upgrade: "websocket",
        "Sec-WebSocket-Version": "13",
        "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ=="
      }
    });

    request.on("upgrade", (response, socket) => {
      socket.destroy();
      resolve({
        ok: response.statusCode === 101,
        detail: `HTTP ${String(response.statusCode ?? "unknown")}`
      });
    });

    request.on("response", (response) => {
      response.resume();
      resolve({
        ok: false,
        detail: `HTTP ${String(response.statusCode ?? "unknown")}`
      });
    });

    request.on("error", (error) => {
      resolve({ ok: false, detail: error.message });
    });

    request.setTimeout(5000, () => {
      request.destroy(new Error("timed out"));
    });

    request.end();
  });
}

async function printPublicWebSocketHealth(publicRacerUrl: string | null): Promise<boolean> {
  const websocketUrl = getPublicWebSocketProbeUrl(publicRacerUrl);
  if (!websocketUrl) {
    console.log("  public websocket: skipped, no public URL configured");
    return true;
  }

  const result = await probeWebSocketUpgrade(websocketUrl);
  if (!result.ok) {
    console.log(`  public websocket: failed (${result.detail} ${websocketUrl})`);
    console.log(`  hint: ${publicHostnameRoutingHint()}`);
    return false;
  }

  console.log(`  public websocket: ok (${websocketUrl})`);
  return true;
}

async function main(): Promise<void> {
  const command = process.argv[2] ?? "doctor";
  const rootDir = findWorkspaceRoot();
  loadDotenvFiles({ rootDir });

  const config = createCloudflaredConfig({
    dataDir: resolveDataDir(rootDir)
  });

  if (command === "install") {
    printDiagnostics("Before install:", resolveCloudflared(config));
    printDiagnostics("After install:", await installCloudflared(config));
    return;
  }

  if (command === "doctor") {
    const diagnostics = resolveCloudflared(config);
    printDiagnostics("cloudflared diagnostics:", diagnostics);
    const publicHealthOk = await printPublicBackendHealth(diagnostics.publicUrl);
    const publicRacerPageOk = await printPublicRacerPageHealth(diagnostics.publicUrl);
    const publicWebSocketOk = await printPublicWebSocketHealth(diagnostics.publicUrl);
    if (
      diagnostics.binarySource === "missing" ||
      !publicHealthOk ||
      !publicRacerPageOk ||
      !publicWebSocketOk
    ) {
      process.exitCode = 1;
    }
    return;
  }

  if (command === "version") {
    const diagnostics = resolveCloudflared(config);
    if (!diagnostics.cloudflaredVersion) {
      console.error(diagnostics.lastError ?? "cloudflared is not installed.");
      process.exitCode = 1;
      return;
    }
    console.log(diagnostics.cloudflaredVersion);
    return;
  }

  console.error(`Unknown cloudflared command: ${command}`);
  console.error("Use one of: install, doctor, version");
  process.exitCode = 1;
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
