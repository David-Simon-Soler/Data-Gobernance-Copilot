export const SUPPORTED_LOCALES = ["en", "es"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_STORAGE_KEY = "dgc-locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && SUPPORTED_LOCALES.includes(value as Locale);
}
