import { create } from "zustand";
import { useEffect } from "react";

import { en, type Dictionary } from "./locales/en";
import { ar } from "./locales/ar";

export type Locale = "en" | "ar";
export type Direction = "ltr" | "rtl";

const DICTS: Record<Locale, Dictionary> = { en, ar };
const DIRS: Record<Locale, Direction> = { en: "ltr", ar: "rtl" };
const STORAGE_KEY = "rqm.locale";

interface LocaleStore {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggle: () => void;
}

export const useLocaleStore = create<LocaleStore>((set, get) => ({
  locale: "en",
  setLocale: (l) => set({ locale: l }),
  toggle: () => set({ locale: get().locale === "en" ? "ar" : "en" }),
}));

export function useLocale() {
  return useLocaleStore((s) => s.locale);
}

export function useDirection(): Direction {
  const locale = useLocale();
  return DIRS[locale];
}

/**
 * `t()` looks up a key in the current locale's dictionary. Falls back to the
 * key itself so a missing translation is visible without crashing.
 */
export function useT() {
  const locale = useLocale();
  const dict = DICTS[locale];
  return (key: keyof Dictionary): string => dict[key] ?? String(key);
}

/**
 * Client-only side-effect: syncs the current locale to <html lang/dir> and
 * localStorage. Called from AppShell inside a useEffect so it never runs on
 * the server or during SSR hydration.
 */
export function useSyncLocaleToDocument() {
  const locale = useLocale();
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = DIRS[locale];
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* storage disabled — non-fatal */
    }
  }, [locale]);
}

/** Hydrates the store from localStorage after mount. Idempotent. */
export function useHydrateLocaleFromStorage() {
  const setLocale = useLocaleStore((s) => s.setLocale);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "ar") setLocale(stored);
    } catch {
      /* ignore */
    }
  }, [setLocale]);
}