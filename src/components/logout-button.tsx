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
      className="btn-ghost hover:bg-rose-50/70 hover:text-rose-700 focus:ring-rose-200"
    >
      {uiText[locale]}
    </button>
  );
}
