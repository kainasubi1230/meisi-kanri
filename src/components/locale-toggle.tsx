"use client";

import type { UiLocale } from "@/lib/ui-locale";

type LocaleToggleProps = {
  locale: UiLocale;
  onChange: (locale: UiLocale) => void;
};

export function LocaleToggle({ locale, onChange }: LocaleToggleProps) {
  return (
    <div className="pill relative inline-grid grid-cols-2 overflow-hidden">
      <span
        aria-hidden="true"
        className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-gradient-to-r from-teal-700 to-emerald-600 shadow shadow-teal-900/20 transition-transform ${
          locale === "en" ? "translate-x-full" : "translate-x-0"
        }`}
      />
      <button
        type="button"
        onClick={() => onChange("ja")}
        className={`relative z-10 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          locale === "ja" ? "text-white" : "text-zinc-700 hover:text-zinc-900"
        }`}
      >
        日本語
      </button>
      <button
        type="button"
        onClick={() => onChange("en")}
        className={`relative z-10 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          locale === "en" ? "text-white" : "text-zinc-700 hover:text-zinc-900"
        }`}
      >
        EN
      </button>
    </div>
  );
}
