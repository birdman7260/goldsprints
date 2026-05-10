import { useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import type { AppSnapshot } from "@goldsprints/shared/types";
import { Button, Panel, StatPill } from "@goldsprints/shared-ui";
import { rotatePhotoBoothPairing, startTunnel, stopTunnel, updateSettings } from "../../lib/api";
import { photoBoothStatusQueryKey, usePhotoBoothStatusQuery } from "../../lib/query";
import { fireAndForget } from "../../lib/ui-actions";

const boothHardwareLabels = {
  scanner: "QR Scanner",
  camera: "Sony Camera",
  lights: "WLED Lights",
  umbrella: "Umbrella",
  hallSensor: "Hall Sensor"
} as const;

function parseTickerMessages(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function SettingsTab({
  snapshot,
  meta
}: {
  snapshot: AppSnapshot;
  meta?: { localBaseUrl: string; qrCodeDataUrl: string };
}) {
  const photoBoothStatusQuery = usePhotoBoothStatusQuery();
  const queryClient = useQueryClient();
  const photoBoothAdminStatus = photoBoothStatusQuery.data;
  const photoBoothStatus = photoBoothAdminStatus?.status ?? snapshot.photoBooth;
  const tickerMessageInputRef = useRef<HTMLTextAreaElement | null>(null);

  return (
    <div className="page-grid">
      <Panel title="Settings">
        <div className="form-grid">
          <label>
            Theme
            <select
              value={snapshot.settings.themeId}
              onChange={(event) => {
                fireAndForget(updateSettings({ themeId: event.target.value }));
              }}
            >
              {snapshot.themes.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.label}
                </option>
              ))}
            </select>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={snapshot.settings.os2lEnabled}
              onChange={(event) => {
                fireAndForget(updateSettings({ os2lEnabled: event.target.checked }));
              }}
            />
            Enable VirtualDJ cue start
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={snapshot.settings.autoStageNextRace}
              onChange={(event) => {
                fireAndForget(updateSettings({ autoStageNextRace: event.target.checked }));
              }}
            />
            Auto-stage the next queued open time trial race
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={snapshot.settings.includeAllRaceData}
              onChange={(event) => {
                fireAndForget(updateSettings({ includeAllRaceData: event.target.checked }));
              }}
            />
            Seed from all-time race data
          </label>
        </div>
      </Panel>

      <Panel title="Projector Display">
        <div className="form-grid">
          <label className="toggle">
            <input
              type="checkbox"
              checked={snapshot.settings.raceDisplayShowEventName}
              onChange={(event) => {
                fireAndForget(updateSettings({ raceDisplayShowEventName: event.target.checked }));
              }}
            />
            Show event name under the Gold Sprints title
          </label>
          <label>
            Ticker speed
            <div className="range-control">
              <input
                type="range"
                min={24}
                max={180}
                step={4}
                value={snapshot.settings.raceDisplayTickerSpeed}
                onChange={(event) => {
                  const nextSpeed = Number(event.target.value);
                  fireAndForget(updateSettings({ raceDisplayTickerSpeed: nextSpeed }));
                }}
              />
              <span>{snapshot.settings.raceDisplayTickerSpeed} px/s</span>
            </div>
          </label>
          <label>
            Ticker messages
            <textarea
              ref={tickerMessageInputRef}
              key={snapshot.settings.raceDisplayTickerMessages.join("\n")}
              rows={5}
              defaultValue={snapshot.settings.raceDisplayTickerMessages.join("\n")}
              placeholder="One projector ticker message per line"
            />
          </label>
          <div className="button-row">
            <Button
              variant="ghost"
              onClick={() => {
                if (tickerMessageInputRef.current) {
                  tickerMessageInputRef.current.value = "";
                }
                fireAndForget(updateSettings({ raceDisplayTickerMessages: [] }));
              }}
            >
              Clear Messages
            </Button>
            <Button
              onClick={() => {
                fireAndForget(
                  updateSettings({
                    raceDisplayTickerMessages: parseTickerMessages(
                      tickerMessageInputRef.current?.value ?? ""
                    )
                  })
                );
              }}
            >
              Save Ticker Messages
            </Button>
          </div>
        </div>
      </Panel>

      <Panel
        title="Tunnel"
        actions={
          snapshot.tunnel.status === "active" ? (
            <Button
              variant="ghost"
              onClick={() => {
                fireAndForget(stopTunnel());
              }}
            >
              Stop Tunnel
            </Button>
          ) : (
            <Button
              onClick={() => {
                fireAndForget(startTunnel());
              }}
            >
              Start Tunnel
            </Button>
          )
        }
      >
        <div className="stack-sm">
          <strong>Status: {snapshot.tunnel.status}</strong>
          <span>{snapshot.tunnel.publicUrl ?? meta?.localBaseUrl ?? "Tunnel inactive"}</span>
          {snapshot.tunnel.message ? <span>{snapshot.tunnel.message}</span> : null}
          {meta?.qrCodeDataUrl ? (
            <img className="qr-code" src={meta.qrCodeDataUrl} alt="QR code for racer page" />
          ) : null}
        </div>
      </Panel>

      <Panel
        title="Kaleidoscope Photo Booth"
        actions={
          <Button
            variant="ghost"
            onClick={() => {
              fireAndForget(
                rotatePhotoBoothPairing().then(() =>
                  queryClient.invalidateQueries({ queryKey: photoBoothStatusQueryKey })
                ),
                "rotate photo booth pairing"
              );
            }}
          >
            Rotate Pairing
          </Button>
        }
      >
        <div className="photo-booth-admin">
          <StatPill label="Booth Status" value={photoBoothStatus.status} />
          <StatPill label="Pending Sync" value={photoBoothStatus.pendingUploadCount} />
          <StatPill
            label="Last Seen"
            value={
              photoBoothStatus.lastSeenAt
                ? new Date(photoBoothStatus.lastSeenAt).toLocaleTimeString()
                : "Not yet"
            }
          />
          <div className="photo-booth-admin__hardware">
            {Object.entries(boothHardwareLabels).map(([key, label]) => {
              const health =
                photoBoothStatus.hardware?.[key as keyof typeof boothHardwareLabels] ?? null;
              return (
                <div
                  key={key}
                  className={`photo-booth-hardware photo-booth-hardware--${health?.status ?? "unknown"}`}
                >
                  <strong>{label}</strong>
                  <span>{health?.status ?? "unknown"}</span>
                  {health?.message ? <small>{health.message}</small> : null}
                </div>
              );
            })}
          </div>
          <div className="photo-booth-admin__pairing">
            <div>
              <strong>Pairing Config</strong>
              <p>
                Scan this from the Raspberry Pi setup flow, or copy the values into the booth agent
                environment.
              </p>
              <code>Server: {photoBoothAdminStatus?.serverBaseUrl ?? meta?.localBaseUrl}</code>
              <code>Booth: {photoBoothStatus.boothId}</code>
              <code>Secret: {photoBoothAdminStatus?.pairingSecret ?? "Loading…"}</code>
            </div>
            {photoBoothAdminStatus?.pairingQrCodeDataUrl ? (
              <img
                className="qr-code"
                src={photoBoothAdminStatus.pairingQrCodeDataUrl}
                alt="QR code for photo booth pairing"
              />
            ) : null}
          </div>
          {photoBoothStatus.message ? <p>{photoBoothStatus.message}</p> : null}
        </div>
      </Panel>
    </div>
  );
}
