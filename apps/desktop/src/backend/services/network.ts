import os from "node:os";
import { DEFAULT_PUBLIC_HOST } from "@goldsprints/shared/constants";

interface NetworkInterfaceEntry {
  address: string;
  family: string | number;
  internal: boolean;
}

type NetworkInterfaces = Record<string, NetworkInterfaceEntry[] | undefined>;

interface LocalNetworkHostOptions {
  env?: NodeJS.ProcessEnv;
  networkInterfaces?: NetworkInterfaces;
}

interface CandidateAddress {
  address: string;
  interfaceName: string;
  score: number;
}

function normalizedEnvValue(value: string | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }
  return normalized;
}

function isIpv4(value: unknown): value is "IPv4" | 4 {
  return value === "IPv4" || value === 4;
}

function isLinkLocalIpv4(address: string): boolean {
  return address.startsWith("169.254.");
}

function isPrivateIpv4(address: string): boolean {
  const [first = "", second = ""] = address.split(".");
  const firstOctet = Number(first);
  const secondOctet = Number(second);
  return (
    firstOctet === 10 ||
    (firstOctet === 192 && secondOctet === 168) ||
    (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31)
  );
}

function interfaceScore(interfaceName: string, address: string): number {
  const normalizedName = interfaceName.toLowerCase();
  let score = 0;

  // Prefer the adapter names macOS/Windows/Linux normally use for Wi-Fi or wired Ethernet.
  if (/^(en|eth|wlan|wi-?fi|ethernet)/u.test(normalizedName)) {
    score -= 20;
  }

  if (isPrivateIpv4(address)) {
    score -= 5;
  }

  // These are commonly VPN, bridge, virtualization, or peer-to-peer adapters, which are much less
  // likely to be reachable by the Raspberry Pi sitting on the event Wi-Fi/LAN.
  if (
    /(utun|bridge|docker|vbox|vmnet|tailscale|zerotier|awdl|llw|loopback)/u.test(normalizedName)
  ) {
    score += 50;
  }

  return score;
}

function getOverrideHost(env: NodeJS.ProcessEnv): string | null {
  return (
    normalizedEnvValue(env.GOLDSPRINTS_LOCAL_SERVER_HOST) ??
    normalizedEnvValue(env.GOLDSPRINTS_PUBLIC_HOST)
  );
}

export function getLocalNetworkHost(options: LocalNetworkHostOptions = {}): string {
  const env = options.env ?? process.env;
  const overrideHost = getOverrideHost(env);
  if (overrideHost) {
    return overrideHost;
  }

  const interfaces: NetworkInterfaces = options.networkInterfaces ?? os.networkInterfaces();
  const candidates: CandidateAddress[] = [];

  for (const [interfaceName, entries] of Object.entries(interfaces)) {
    for (const entry of entries ?? []) {
      if (!isIpv4(entry.family) || entry.internal || isLinkLocalIpv4(entry.address)) {
        continue;
      }

      candidates.push({
        address: entry.address,
        interfaceName,
        score: interfaceScore(interfaceName, entry.address)
      });
    }
  }

  candidates.sort(
    (left, right) =>
      left.score - right.score ||
      left.interfaceName.localeCompare(right.interfaceName) ||
      left.address.localeCompare(right.address)
  );

  return candidates[0]?.address ?? DEFAULT_PUBLIC_HOST;
}

export function getLocalNetworkBaseUrl(
  port: number,
  options: LocalNetworkHostOptions = {}
): string {
  return `http://${getLocalNetworkHost(options)}:${String(port)}`;
}
