import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Button, Panel, StatPill, TextInput } from "@roller-rumble/shared-ui";
import "@roller-rumble/shared-ui/styles.css";
import { applyThemeToDocument } from "@roller-rumble/shared-ui/theme";
import { themes } from "@roller-rumble/shared/themes";
import type { ThemeDefinition } from "@roller-rumble/shared/types";
import { DEFAULT_LIGHT_LOOK } from "../light-looks";
import type {
  DiagnosticsResult,
  HardwareComponentHealth,
  LightSelection,
  UmbrellaState
} from "../types";
import { LightLookWheel } from "./components/light-look-wheel";
import { UmbrellaPanelPicker } from "./components/umbrella-panel-picker";
import "./styles.css";

interface BoothState {
  flow: "idle" | "token-scanned" | "photo-mode" | "capturing" | "reviewing" | "syncing" | "error";
  racerName: string | null;
  previewUrl: string | null;
  message: string | null;
  lightSelection: LightSelection;
  umbrella: UmbrellaState;
  captureCountdownEndsAt: string | null;
  pendingUploadCount: number;
  hardware: Record<string, HardwareComponentHealth>;
  theme: ThemeDefinition;
}

const defaultState: BoothState = {
  flow: "idle",
  racerName: null,
  previewUrl: null,
  message: null,
  lightSelection: { ...DEFAULT_LIGHT_LOOK.selection },
  umbrella: {
    mode: "parked",
    panelCount: 8,
    currentPanel: 0
  },
  captureCountdownEndsAt: null,
  pendingUploadCount: 0,
  hardware: {},
  theme: themes[0]
};

async function post<T>(path: string, body: unknown = {}): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = (await response.json()) as T;
  if (!response.ok) {
    throw new Error(
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : "Request failed"
    );
  }
  return payload;
}

function HardwareBadge({ label, health }: { label: string; health?: HardwareComponentHealth }) {
  return (
    <StatPill
      className={`hardware-badge hardware-badge--${health?.status ?? "unknown"}`}
      label={label}
      value={health?.status ?? "unknown"}
    />
  );
}

function DiagnosticsPanel({
  diagnostics,
  hardware,
  onRun
}: {
  diagnostics: DiagnosticsResult | null;
  hardware: BoothState["hardware"];
  onRun: () => void;
}) {
  const components = diagnostics ?? hardware;
  return (
    <Panel title="Diagnostics" className="diagnostics">
      <div className="diagnostics__header">
        <Button variant="ghost" onClick={onRun}>
          Run Checks
        </Button>
      </div>
      <div className="hardware-grid">
        {["scanner", "camera", "lights", "umbrella", "hallSensor"].map((key) => {
          const health = components[key as keyof typeof components] as
            | HardwareComponentHealth
            | undefined;
          return <HardwareBadge key={key} label={key} health={health} />;
        })}
      </div>
    </Panel>
  );
}

function App() {
  const [state, setState] = useState<BoothState>(defaultState);
  const [manualScan, setManualScan] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsResult | null>(null);

  useEffect(() => {
    fetch("/api/state")
      .then((response) => response.json())
      .then((payload: BoothState) => setState(payload))
      .catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : "Could not load booth state.")
      );

    const events = new EventSource("/api/events");
    events.onmessage = (event) => {
      setState(JSON.parse(String(event.data)) as BoothState);
    };
    events.onerror = () => setError("Lost live connection to the booth agent.");
    return () => events.close();
  }, []);

  const runAction = (action: Promise<BoothState | DiagnosticsResult>) => {
    action
      .then((payload) => {
        if ("flow" in payload) {
          setState(payload);
        } else {
          setDiagnostics(payload);
        }
        setError(null);
      })
      .catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : "Booth action failed.")
      );
  };

  const disabled = ["capturing", "syncing"].includes(state.flow);
  const canCapture = state.flow === "photo-mode";
  const canReview = state.flow === "reviewing";

  useEffect(() => {
    applyThemeToDocument(state.theme);
  }, [state.theme]);

  return (
    <main className={`kiosk kiosk--${state.flow}`}>
      <Panel className="hero-card">
        <div>
          <p className="eyebrow">Roller Rumble Kaleidoscope</p>
          <h1>{state.racerName ?? "Scan Your Racer QR"}</h1>
          <p>{error ?? state.message ?? "Show your racer QR to the mounted scanner."}</p>
        </div>
        <div className="status-row">
          <HardwareBadge label="scanner" health={state.hardware.scanner} />
          <HardwareBadge label="camera" health={state.hardware.camera} />
          <HardwareBadge label="lights" health={state.hardware.lights} />
          <HardwareBadge label="umbrella" health={state.hardware.umbrella} />
          <StatPill
            className="hardware-badge"
            label="pending sync"
            value={state.pendingUploadCount}
          />
        </div>
      </Panel>

      {state.flow === "idle" || state.flow === "error" ? (
        <Panel className="scan-card">
          <TextInput
            value={manualScan}
            placeholder="Manual QR token, or fake:Test Rider when fake QR testing is enabled"
            onChange={(event) => setManualScan(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && manualScan.trim()) {
                runAction(post("/api/scan", { payload: manualScan }));
                setManualScan("");
              }
            }}
          />
          <Button
            onClick={() => {
              runAction(post("/api/scan", { payload: manualScan }));
              setManualScan("");
            }}
          >
            Start Photo Mode
          </Button>
        </Panel>
      ) : null}

      {state.flow === "photo-mode" ? (
        <section className="photo-layout">
          <LightLookWheel
            selection={state.lightSelection}
            disabled={disabled}
            onChange={(lookId) => runAction(post("/api/lights/selection", { lookId }))}
          />
          <Panel className="capture-card">
            <button
              className="capture-button"
              disabled={!canCapture}
              onClick={() => runAction(post("/api/capture"))}
            >
              Take Photo
            </button>
            <Button variant="ghost" onClick={() => runAction(post("/api/cancel"))}>
              Cancel
            </Button>
          </Panel>
          <UmbrellaPanelPicker
            umbrella={state.umbrella}
            disabled={disabled}
            onSpin={() => runAction(post("/api/umbrella/spin"))}
            onPanel={(panelIndex) => runAction(post("/api/umbrella/panel", { panelIndex }))}
          />
        </section>
      ) : null}

      {state.flow === "capturing" ? (
        <Panel className="capture-countdown">
          <h2>Hold still</h2>
          <p>The umbrella is freezing and the Sony is firing.</p>
        </Panel>
      ) : null}

      {canReview ? (
        <Panel className="review-card">
          {state.previewUrl ? <img src={state.previewUrl} alt="Captured avatar preview" /> : null}
          <div className="review-actions">
            <Button onClick={() => runAction(post("/api/accept"))}>Keep</Button>
            <Button variant="ghost" onClick={() => runAction(post("/api/retake"))}>
              Retry
            </Button>
          </div>
        </Panel>
      ) : null}

      {state.flow === "syncing" ? (
        <Panel className="capture-countdown">
          <h2>Saving</h2>
          <p>Your avatar is being saved to the race system.</p>
        </Panel>
      ) : null}

      <footer>
        <Button variant="ghost" onClick={() => setShowDiagnostics((current) => !current)}>
          {showDiagnostics ? "Hide Diagnostics" : "Diagnostics"}
        </Button>
      </footer>

      {showDiagnostics ? (
        <DiagnosticsPanel
          diagnostics={diagnostics}
          hardware={state.hardware}
          onRun={() => runAction(post("/api/diagnostics/run"))}
        />
      ) : null}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
