"use client";

import { useLanguage } from "../i18n/LanguageProvider";
import type { Locale } from "../i18n/locales";

const OPTIONS: readonly { locale: Locale; label: string }[] = [
  { locale: "en", label: "EN" },
  { locale: "es", label: "ES" },
];

export function LanguageSwitcher() {
  const { locale, messages, setLocale } = useLanguage();

  return (
    <div className="language-switcher" role="group" aria-label={messages.language}>
      {OPTIONS.map((option) => (
        <button
          key={option.locale}
          type="button"
          className="language-option"
          aria-pressed={locale === option.locale}
          aria-label={option.locale === "en" ? messages.selectEnglish : messages.selectSpanish}
          onClick={() => setLocale(option.locale)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
