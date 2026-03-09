"use client";

import type { UiLocale } from "@/lib/ui-locale";

type LocaleToggleProps = {
  locale: UiLocale;
  onChange: (locale: UiLocale) => void;
};

export function LocaleToggle({ locale, onChange }: LocaleToggleProps) {
  return (
    <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() => onChange("ja")}
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
          locale === "ja" ? "bg-teal-700 text-white" : "text-zinc-600 hover:bg-zinc-100"
        }`}
      >
        日本語
      </button>
      <button
        type="button"
        onClick={() => onChange("en")}
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
          locale === "en" ? "bg-teal-700 text-white" : "text-zinc-600 hover:bg-zinc-100"
        }`}
      >
        EN
      </button>
    </div>
  );
}
