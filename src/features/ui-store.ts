import { create } from "zustand";

/** Small client-only UI state: toast, upgrade prompt and the filing explanation drawer. */
interface UiState {
  toast: string | null;
  upgrade: { feature?: string } | null;
  explain: { accession: string; title?: string } | null;
  showToast: (message: string) => void;
  openUpgrade: (feature?: string) => void;
  closeUpgrade: () => void;
  openExplain: (accession: string, title?: string) => void;
  closeExplain: () => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;

export const useUi = create<UiState>((set) => ({
  toast: null,
  upgrade: null,
  explain: null,
  showToast: (toast) => {
    clearTimeout(timer);
    set({ toast });
    timer = setTimeout(() => set({ toast: null }), 4000);
  },
  openUpgrade: (feature) => set({ upgrade: { feature } }),
  closeUpgrade: () => set({ upgrade: null }),
  openExplain: (accession, title) => set({ explain: { accession, title } }),
  closeExplain: () => set({ explain: null }),
}));

export const toast = (message: string) => useUi.getState().showToast(message);
