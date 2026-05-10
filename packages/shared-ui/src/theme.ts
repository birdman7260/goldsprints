interface ThemeDocumentTokens {
  surface: string;
  surfaceAlt: string;
  accent: string;
  accentSoft: string;
  text: string;
  textMuted: string;
  success: string;
  warning: string;
  danger: string;
  laneA: string;
  laneB: string;
}

export interface ThemeDocumentDefinition {
  fontFamily: string;
  tokens: ThemeDocumentTokens;
  connectorStyle: string;
  orientation: string;
  raceGraphic: {
    variant: string;
  };
  surfaceStyle: string;
  uiStyle: string;
}

export function applyThemeToElement(theme: ThemeDocumentDefinition, root: HTMLElement): void {
  root.style.setProperty("--theme-font-family", theme.fontFamily);
  root.style.setProperty("--theme-surface", theme.tokens.surface);
  root.style.setProperty("--theme-surface-alt", theme.tokens.surfaceAlt);
  root.style.setProperty("--theme-accent", theme.tokens.accent);
  root.style.setProperty("--theme-accent-soft", theme.tokens.accentSoft);
  root.style.setProperty("--theme-text", theme.tokens.text);
  root.style.setProperty("--theme-text-muted", theme.tokens.textMuted);
  root.style.setProperty("--theme-success", theme.tokens.success);
  root.style.setProperty("--theme-warning", theme.tokens.warning);
  root.style.setProperty("--theme-danger", theme.tokens.danger);
  root.style.setProperty("--theme-lane-a", theme.tokens.laneA);
  root.style.setProperty("--theme-lane-b", theme.tokens.laneB);

  // Use capability flags from the manifest so CSS stays independent from concrete theme IDs.
  root.dataset.themeConnector = theme.connectorStyle;
  root.dataset.themeOrientation = theme.orientation;
  root.dataset.themeRaceGraphic = theme.raceGraphic.variant;
  root.dataset.themeSurface = theme.surfaceStyle;
  root.dataset.themeUi = theme.uiStyle;
  delete root.dataset.theme;
}

export function applyThemeToDocument(theme: ThemeDocumentDefinition): void {
  applyThemeToElement(theme, document.documentElement);
}
