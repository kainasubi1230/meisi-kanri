"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { LocaleToggle } from "@/components/locale-toggle";
import { useUiLocale } from "@/lib/ui-locale";

const uiText = {
  ja: {
    title: "ログイン",
    subtitle: "指定アカウントでログインしてください",
    email: "メールアドレス",
    password: "パスワード",
    login: "ログイン",
    loggingIn: "ログイン中...",
    failed: "ログインに失敗しました。メールアドレスとパスワードを確認してください。",
  },
  en: {
    title: "Sign In",
    subtitle: "Sign in with an allowed account",
    email: "Email",
    password: "Password",
    login: "Sign In",
    loggingIn: "Signing in...",
    failed: "Sign in failed. Check your email and password.",
  },
} as const;

export function LoginForm() {
  const { locale, setLocale } = useUiLocale();
  const t = uiText[locale];
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setErrorMessage(t.failed);
        return;
      }

      router.push("/capture");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">{t.title}</h1>
        <LocaleToggle locale={locale} onChange={setLocale} />
      </div>

      <p className="mb-4 text-sm text-zinc-600">{t.subtitle}</p>

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm text-zinc-700">{t.email}</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-zinc-700">{t.password}</label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? t.loggingIn : t.login}
        </button>
      </form>

      {errorMessage ? <p className="mt-3 text-sm text-red-600">{errorMessage}</p> : null}
    </section>
  );
}
