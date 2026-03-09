"use client";

import { signOut } from "next-auth/react";

import { useUiLocale } from "@/lib/ui-locale";

const uiText = {
  ja: "ログアウト",
  en: "Sign out",
} as const;

export function LogoutButton() {
  const { locale } = useUiLocale();

  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-zinc-50"
    >
      {uiText[locale]}
    </button>
  );
}
