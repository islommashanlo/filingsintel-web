import { create } from "zustand";

export type Theme = "system" | "light" | "dark";
const KEY = "fi-theme";

function read(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* storage unavailable */
  }
  return "system";
}

export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme !== "system") return theme;
  return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(theme: Theme) {
  document.documentElement.setAttribute("data-theme", resolveTheme(theme));
}

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useTheme = create<ThemeState>((set) => ({
  theme: read(),
  setTheme: (theme) => {
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* storage unavailable */
    }
    apply(theme);
    set({ theme });
  },
}));

if (typeof matchMedia === "function") {
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (useTheme.getState().theme === "system") apply("system");
  });
}
