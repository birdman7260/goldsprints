import { describe, expect, it } from "vitest";
import {
  buildCloudflaredStartCommand,
  createCloudflaredConfig,
  getCloudflaredCandidateOrder,
  getPublicBackendHealthUrl,
  getPublicRacerPageUrl,
  getPublicWebSocketProbeUrl,
  normalizePublicRacerUrl,
  publicHostnameRoutingHint,
  selectCloudflaredDownload
} from "./cloudflared-tools";

const dataDir = "/tmp/goldsprints-cloudflared-test";

describe("cloudflared tools", () => {
  it("normalizes bare public domains into racer page URLs", () => {
    expect(normalizePublicRacerUrl("https://goldsprints.birdsnest.family")).toBe(
      "https://goldsprints.birdsnest.family/racer"
    );
    expect(normalizePublicRacerUrl("https://goldsprints.birdsnest.family/racer")).toBe(
      "https://goldsprints.birdsnest.family/racer"
    );
  });

  it("derives the public backend health URL from the racer page URL", () => {
    expect(getPublicBackendHealthUrl("https://goldsprints.birdsnest.family/racer")).toBe(
      "https://goldsprints.birdsnest.family/api/health"
    );
  });

  it("derives public racer page and websocket probe URLs", () => {
    expect(getPublicRacerPageUrl("https://goldsprints.birdsnest.family")).toBe(
      "https://goldsprints.birdsnest.family/racer"
    );
    expect(getPublicWebSocketProbeUrl("https://goldsprints.birdsnest.family/racer")).toBe(
      "https://goldsprints.birdsnest.family/ws"
    );
  });

  it("documents the required root public hostname route", () => {
    expect(publicHostnameRoutingHint()).toContain("empty Path");
    expect(publicHostnameRoutingHint()).toContain("/ws");
  });

  it("selects official release assets for supported desktop platforms", () => {
    expect(selectCloudflaredDownload("darwin", "arm64")?.url).toContain(
      "cloudflared-darwin-arm64.tgz"
    );
    expect(selectCloudflaredDownload("darwin", "x64")?.url).toContain(
      "cloudflared-darwin-amd64.tgz"
    );
    expect(selectCloudflaredDownload("win32", "x64")?.url).toContain(
      "cloudflared-windows-amd64.exe"
    );
    expect(selectCloudflaredDownload("aix", "ppc64")).toBeNull();
  });

  it("prefers configured, then managed, then PATH binaries", () => {
    const config = createCloudflaredConfig({
      dataDir,
      env: {
        GOLDSPRINTS_CLOUDFLARED_PATH: "/custom/cloudflared"
      }
    });

    expect(
      getCloudflaredCandidateOrder(config, "/usr/local/bin/cloudflared", "/managed/cloudflared")
    ).toEqual([
      { source: "env", path: "/custom/cloudflared" },
      { source: "managed", path: "/managed/cloudflared" },
      { source: "path", path: "/usr/local/bin/cloudflared" }
    ]);
  });

  it("builds the current quick tunnel command", () => {
    const config = createCloudflaredConfig({ dataDir, env: {} });
    expect(buildCloudflaredStartCommand(config, "/bin/cloudflared", 3187)).toEqual({
      command: "/bin/cloudflared",
      args: ["tunnel", "--url", "http://127.0.0.1:3187"],
      publicUrl: null
    });
  });

  it("builds a token tunnel command without requiring the tunnel name in arguments", () => {
    const config = createCloudflaredConfig({
      dataDir,
      env: {
        GOLDSPRINTS_TUNNEL_MODE: "token",
        GOLDSPRINTS_TUNNEL_NAME: "GoldSprints",
        GOLDSPRINTS_TUNNEL_TOKEN: "secret-token",
        GOLDSPRINTS_PUBLIC_RACER_URL: "https://goldsprints.birdsnest.family"
      }
    });

    expect(buildCloudflaredStartCommand(config, "/bin/cloudflared", 3187)).toEqual({
      command: "/bin/cloudflared",
      args: ["tunnel", "--no-autoupdate", "run", "--token", "secret-token"],
      publicUrl: "https://goldsprints.birdsnest.family/racer"
    });
  });
});
