"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_STORAGE_KEY,
  type Locale,
} from "./locales";
import { humanLabel, translations, type TranslationMessages } from "./translations";

interface LanguageContextValue {
  locale: Locale;
  messages: TranslationMessages;
  setLocale: (locale: Locale) => void;
  label: (value: string) => string;
  number: (value: number) => string;
}

function readPersistedLocale(): Locale {
  try {
    const persisted = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(persisted) ? persisted : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

function persistLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage can be unavailable; the in-memory language choice still works.
  }
}

const defaultContext: LanguageContextValue = {
  locale: DEFAULT_LOCALE,
  messages: translations[DEFAULT_LOCALE],
  setLocale: () => undefined,
  label: (value) => humanLabel(value, DEFAULT_LOCALE),
  number: (value) => value.toLocaleString("en-US"),
};

const LanguageContext = createContext<LanguageContextValue>(defaultContext);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const nextLocale = readPersistedLocale();
    if (nextLocale !== DEFAULT_LOCALE) setLocaleState(nextLocale);
    document.documentElement.lang = nextLocale;
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    persistLocale(nextLocale);
    document.documentElement.lang = nextLocale;
  }, []);

  const label = useCallback((value: string) => humanLabel(value, locale), [locale]);
  const number = useCallback(
    (value: number) => value.toLocaleString(locale === "es" ? "es-ES" : "en-US"),
    [locale],
  );
  const value = useMemo(
    () => ({ locale, messages: translations[locale], setLocale, label, number }),
    [label, locale, number, setLocale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
