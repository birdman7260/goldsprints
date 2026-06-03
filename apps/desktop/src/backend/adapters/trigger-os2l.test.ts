import { describe, expect, it } from "vitest";
import { parseOs2lCountdownDurationMs } from "./trigger-os2l";

describe("OS2L trigger parsing", () => {
  it("reads countdownMs from JSON cue payloads", () => {
    expect(
      parseOs2lCountdownDurationMs(
        JSON.stringify({
          action: "start",
          countdownMs: 5_500,
          evt: "cue",
          id: "roller-rumble-start"
        })
      )
    ).toBe(5_500);
  });

  it("reads countdownMs from plain VirtualDJ-style command text", () => {
    expect(parseOs2lCountdownDurationMs('os2l_button "roller-rumble-start countdownMs=2500"')).toBe(
      2_500
    );
  });

  it("returns null when the cue does not include a countdown duration", () => {
    expect(parseOs2lCountdownDurationMs('os2l_button "roller-rumble-start"')).toBeNull();
  });
});
