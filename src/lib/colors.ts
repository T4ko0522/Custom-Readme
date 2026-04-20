export type Theme = "dark" | "light" | "github";

export type ThemeColors = {
  bg: string;
  text: string;
  subtext: string;
  accent: string;
  border: string;
};

const themes: Record<Theme, ThemeColors> = {
  dark: {
    bg: "#0d1117",
    text: "#e6edf3",
    subtext: "#8b949e",
    accent: "#58a6ff",
    border: "#30363d",
  },
  light: {
    bg: "#ffffff",
    text: "#1f2328",
    subtext: "#656d76",
    accent: "#0969da",
    border: "#d0d7de",
  },
  github: {
    bg: "#161b22",
    text: "#f0f6fc",
    subtext: "#8b949e",
    accent: "#3fb950",
    border: "#30363d",
  },
};

export function getTheme(name?: string): ThemeColors {
  if (name && name in themes) {
    return themes[name as Theme];
  }
  return themes.dark;
}
