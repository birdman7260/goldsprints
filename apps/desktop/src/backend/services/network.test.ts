import { describe, expect, it } from "vitest";
import { getLocalNetworkBaseUrl, getLocalNetworkHost } from "./network";

interface NetworkInterfaceEntry {
  address: string;
  cidr: string;
  family: string;
  internal: boolean;
  mac: string;
  netmask: string;
}

type NetworkInterfaces = Record<string, NetworkInterfaceEntry[] | undefined>;

describe("local network host resolution", () => {
  it("uses an explicit local host override first", () => {
    expect(
      getLocalNetworkHost({
        env: { ROLLER_RUMBLE_LOCAL_SERVER_HOST: "192.168.4.25" },
        networkInterfaces: {}
      })
    ).toBe("192.168.4.25");
  });

  it("supports the legacy public host override name", () => {
    expect(
      getLocalNetworkHost({
        env: { ROLLER_RUMBLE_PUBLIC_HOST: "192.168.4.26" },
        networkInterfaces: {}
      })
    ).toBe("192.168.4.26");
  });

  it("prefers physical LAN interfaces over VPN-like interfaces", () => {
    const networkInterfaces: NetworkInterfaces = {
      utun4: [
        {
          address: "10.8.0.12",
          cidr: "10.8.0.12/24",
          family: "IPv4",
          internal: false,
          mac: "00:00:00:00:00:00",
          netmask: "255.255.255.0"
        }
      ],
      en0: [
        {
          address: "192.168.1.42",
          cidr: "192.168.1.42/24",
          family: "IPv4",
          internal: false,
          mac: "00:11:22:33:44:55",
          netmask: "255.255.255.0"
        }
      ]
    };

    expect(getLocalNetworkHost({ env: {}, networkInterfaces })).toBe("192.168.1.42");
  });

  it("falls back to localhost when no LAN address exists", () => {
    const networkInterfaces: NetworkInterfaces = {
      lo0: [
        {
          address: "127.0.0.1",
          cidr: "127.0.0.1/8",
          family: "IPv4",
          internal: true,
          mac: "00:00:00:00:00:00",
          netmask: "255.0.0.0"
        }
      ]
    };

    expect(
      getLocalNetworkBaseUrl(3187, {
        env: {},
        networkInterfaces
      })
    ).toBe("http://127.0.0.1:3187");
  });
});
