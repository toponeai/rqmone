/**
 * R.Q.M.1 Theme Engine.
 *
 * Registry of professional themes. Each theme is a flat map of CSS custom
 * properties applied to the document root — no rebuilds, no rerenders in
 * consumers. Adding a theme = one entry here.
 */

export type ThemeId = "galaxy-dark" | "deep-space" | "aurora" | "ocean";

export interface ThemeDef {
  id: ThemeId;
  label: string;
  vars: Record<string, string>;
}

export const THEMES: ThemeDef[] = [
  {
    id: "galaxy-dark",
    label: "Galaxy Dark",
    vars: {
      "--rqm-bg": "oklch(0.15 0.03 264)",
      "--rqm-primary": "oklch(0.82 0.16 205)",
      "--rqm-secondary": "oklch(0.68 0.19 285)",
      "--rqm-accent": "oklch(0.85 0.19 155)",
    },
  },
  {
    id: "deep-space",
    label: "Deep Space",
    vars: {
      "--rqm-bg": "oklch(0.10 0.02 270)",
      "--rqm-primary": "oklch(0.78 0.15 220)",
      "--rqm-secondary": "oklch(0.60 0.20 300)",
      "--rqm-accent": "oklch(0.75 0.18 170)",
    },
  },
  {
    id: "aurora",
    label: "Aurora",
    vars: {
      "--rqm-bg": "oklch(0.18 0.04 250)",
      "--rqm-primary": "oklch(0.85 0.19 155)",
      "--rqm-secondary": "oklch(0.78 0.17 200)",
      "--rqm-accent": "oklch(0.80 0.18 290)",
    },
  },
  {
    id: "ocean",
    label: "Ocean",
    vars: {
      "--rqm-bg": "oklch(0.16 0.04 230)",
      "--rqm-primary": "oklch(0.78 0.14 215)",
      "--rqm-secondary": "oklch(0.70 0.15 190)",
      "--rqm-accent": "oklch(0.82 0.14 165)",
    },
  },
];

const STORAGE_KEY = "rqm.theme";

export function applyTheme(id: ThemeId): void {
  if (typeof document === "undefined") return;
  const theme = THEMES.find((t) => t.id === id) ?? THEMES[0];
  const root = document.documentElement;
  for (const [k, v] of Object.entries(theme.vars)) {
    root.style.setProperty(k, v);
  }
  root.dataset.rqmTheme = theme.id;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme.id);
  } catch {
    /* ignore */
  }
}

export function loadStoredTheme(): ThemeId {
  if (typeof window === "undefined") return "galaxy-dark";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    if (v && THEMES.some((t) => t.id === v)) return v;
  } catch {
    /* ignore */
  }
  return "galaxy-dark";
}
