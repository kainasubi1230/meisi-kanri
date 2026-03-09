"use client";

import type { UiLocale } from "@/lib/ui-locale";

type LocaleToggleProps = {
  locale: UiLocale;
  onChange: (locale: UiLocale) => void;
};

export function LocaleToggle({ locale, onChange }: LocaleToggleProps) {
  return (
    <div className="inline-flex rounded-md border border-zinc-300 bg-white p-1">
      <button
        type="button"
        onClick={() => onChange("ja")}
        className={`rounded px-3 py-1 text-xs font-medium ${
          locale === "ja" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
        }`}
      >
        日本語
      </button>
      <button
        type="button"
        onClick={() => onChange("en")}
        className={`rounded px-3 py-1 text-xs font-medium ${
          locale === "en" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
        }`}
      >
        EN
      </button>
    </div>
  );
}
