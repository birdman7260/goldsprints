export type CountdownTriggerSource = "manual" | "os2l";
export interface CountdownTriggerOptions {
  countdownDurationMs?: number;
}

export type CountdownTriggerListener = (
  source: CountdownTriggerSource,
  options?: CountdownTriggerOptions
) => void;

export interface RaceTriggerAdapter {
  id: string;
  label: string;
  start(listener: CountdownTriggerListener): Promise<void> | void;
  stop(): Promise<void> | void;
  armRace(raceId: string): void;
  disarmRace(): void;
  setEnabled(enabled: boolean): void;
}
