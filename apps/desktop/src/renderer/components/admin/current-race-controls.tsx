import type { AppSnapshot, RaceRecord } from "@roller-rumble/shared/types";
import { formatRacerNames } from "../../lib/snapshot-display";
import { Button } from "@roller-rumble/shared-ui";

export function CurrentRaceActionRows({
  currentRace,
  showStageNextRaceButton,
  disableStageNextRaceButton,
  onStageNextRace,
  onUnstageCurrent,
  onResetCurrent,
  onStartCountdown,
  onFinalizeCurrent,
  onResumeInterrupted,
  onRestartInterrupted,
  onFinalizeInterrupted
}: {
  currentRace: RaceRecord | null;
  showStageNextRaceButton?: boolean;
  disableStageNextRaceButton?: boolean;
  onStageNextRace?: () => void;
  onUnstageCurrent?: () => void;
  onResetCurrent?: () => void;
  onStartCountdown: () => void;
  onFinalizeCurrent: () => void;
  onResumeInterrupted: () => void;
  onRestartInterrupted: () => void;
  onFinalizeInterrupted: () => void;
}) {
  const raceIsInterrupted = currentRace?.state === "interrupted";
  const showStageAction = showStageNextRaceButton && !currentRace;
  const showStartAction =
    currentRace != null && ["scheduled", "staging"].includes(currentRace.state);
  const showUnstageAction =
    currentRace != null && ["scheduled", "staging"].includes(currentRace.state);
  const showResetAction =
    currentRace != null && ["countdown", "active"].includes(currentRace.state);
  const showFinalizeAction = currentRace?.state === "active";

  if (raceIsInterrupted) {
    return (
      <div className="button-row">
        <Button
          onClick={() => {
            onResumeInterrupted();
          }}
        >
          Resume Interrupted
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            onRestartInterrupted();
          }}
        >
          Restart Race
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            onFinalizeInterrupted();
          }}
        >
          Finalize As-Is
        </Button>
      </div>
    );
  }

  if (
    !showStageAction &&
    !showStartAction &&
    !showUnstageAction &&
    !showResetAction &&
    !showFinalizeAction
  ) {
    return null;
  }

  return (
    <>
      <div className="button-row">
        {showStageAction ? (
          <Button
            disabled={disableStageNextRaceButton}
            onClick={() => {
              onStageNextRace?.();
            }}
          >
            Stage Next Race
          </Button>
        ) : null}
        {showUnstageAction ? (
          <Button
            variant="ghost"
            onClick={() => {
              onUnstageCurrent?.();
            }}
          >
            Unstage Race
          </Button>
        ) : null}
        {showStartAction ? (
          <Button
            variant="accent"
            onClick={() => {
              onStartCountdown();
            }}
          >
            Start Countdown
          </Button>
        ) : null}
        {showResetAction ? (
          <Button
            variant="ghost"
            onClick={() => {
              onResetCurrent?.();
            }}
          >
            Reset To Staged
          </Button>
        ) : null}
        {showFinalizeAction ? (
          <Button
            variant="ghost"
            onClick={() => {
              onFinalizeCurrent();
            }}
          >
            Finalize Current
          </Button>
        ) : null}
      </div>
    </>
  );
}

export function CurrentRaceSummary({
  snapshot,
  currentRace
}: {
  snapshot: AppSnapshot;
  currentRace: RaceRecord;
}) {
  return (
    <div className="stack-sm">
      <strong>
        {currentRace.state.toUpperCase()} •{" "}
        {currentRace.format === "solo" ? "Solo" : "Head-to-head"}
      </strong>
      <span>
        {formatRacerNames(
          snapshot,
          currentRace.participants.map((participant) => participant.racerId)
        )}
      </span>
    </div>
  );
}
