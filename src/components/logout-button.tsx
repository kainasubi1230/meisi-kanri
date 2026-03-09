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
      className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
    >
      {uiText[locale]}
    </button>
  );
}
