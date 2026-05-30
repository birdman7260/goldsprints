import { describe, expect, it } from "vitest";
import { resolveBackendAssetUrlFromBase } from "./assets";

describe("backend asset URLs", () => {
  it("resolves relative upload paths through the backend API origin", () => {
    expect(resolveBackendAssetUrlFromBase("/uploads/avatar.jpg", "http://127.0.0.1:3187")).toBe(
      "http://127.0.0.1:3187/uploads/avatar.jpg"
    );
  });

  it("keeps already absolute asset URLs unchanged", () => {
    expect(
      resolveBackendAssetUrlFromBase(
        "https://goldsprints.birdsnest.family/uploads/avatar.jpg",
        "http://127.0.0.1:3187"
      )
    ).toBe("https://goldsprints.birdsnest.family/uploads/avatar.jpg");
  });

  it("keeps inline preview URLs unchanged", () => {
    expect(resolveBackendAssetUrlFromBase("blob:http://localhost/avatar", "http://x")).toBe(
      "blob:http://localhost/avatar"
    );
  });
});
