"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { LocaleToggle } from "@/components/locale-toggle";
import { useUiLocale } from "@/lib/ui-locale";

type AuthMode = "login" | "register";

const uiText = {
  ja: {
    loginTab: "ログイン",
    registerTab: "新規登録",
    titleLogin: "名刺管理にログイン",
    titleRegister: "アカウント作成",
    subtitleLogin: "登録済みアカウントでサインインしてください",
    subtitleRegister: "このアプリで使うアカウントを作成します",
    appTitle: "Meisi Kanri",
    appLead: "名刺を撮るだけで、AIが自動で整理。",
    appSubLead: "読み取り、検索、共有まで一気通貫で管理できます。",
    feature1: "複数枚の名刺を一括抽出",
    feature2: "自動トリミングと項目補完",
    feature3: "アカウント単位・カード単位の共有",
    email: "メールアドレス",
    password: "パスワード",
    confirmPassword: "パスワード（確認）",
    login: "ログイン",
    registering: "登録中...",
    loggingIn: "ログイン中...",
    register: "登録してログイン",
    errPasswordMismatch: "確認用パスワードが一致しません。",
    errPasswordPolicy: "パスワードは8文字以上で入力してください。",
    errLogin: "ログインに失敗しました。メールアドレスとパスワードを確認してください。",
    errRegisterDefault: "登録に失敗しました。",
  },
  en: {
    loginTab: "Sign In",
    registerTab: "Register",
    titleLogin: "Sign in to your workspace",
    titleRegister: "Create your account",
    subtitleLogin: "Use your registered account to continue",
    subtitleRegister: "Create an account for this app",
    appTitle: "Meisi Kanri",
    appLead: "Capture business cards and let AI do the structure.",
    appSubLead: "Extract, search, and share card data in one place.",
    feature1: "Bulk extraction from one image",
    feature2: "Auto crop and field confidence",
    feature3: "Account-level and card-level sharing",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm password",
    login: "Sign In",
    registering: "Registering...",
    loggingIn: "Signing in...",
    register: "Register and Sign In",
    errPasswordMismatch: "Passwords do not match.",
    errPasswordPolicy: "Password must be at least 8 characters.",
    errLogin: "Sign in failed. Check your email and password.",
    errRegisterDefault: "Registration failed.",
  },
} as const;

export function LoginForm() {
  const { locale, setLocale } = useUiLocale();
  const t = uiText[locale];
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const doSignIn = async () => {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (!result || result.error) {
      setErrorMessage(t.errLogin);
      return false;
    }

    router.push("/capture");
    router.refresh();
    return true;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (mode === "register") {
        if (password.length < 8) {
          setErrorMessage(t.errPasswordPolicy);
          return;
        }

        if (password !== confirmPassword) {
          setErrorMessage(t.errPasswordMismatch);
          return;
        }

        const registerResponse = await fetch("/api/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        if (!registerResponse.ok) {
          const body = (await registerResponse.json().catch(() => null)) as { error?: string } | null;
          setErrorMessage(body?.error || t.errRegisterDefault);
          return;
        }
      }

      await doSignIn();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.35)] backdrop-blur">
      <div className="grid md:grid-cols-[1.05fr_1fr]">
        <aside className="relative hidden overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-500 p-8 text-white md:block">
          <div className="absolute -right-20 -top-16 h-52 w-52 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute -bottom-24 left-8 h-64 w-64 rounded-full bg-emerald-200/30 blur-3xl" />
          <p className="relative text-xs font-semibold uppercase tracking-[0.3em] text-teal-100">{t.appTitle}</p>
          <h2 className="relative mt-6 text-3xl font-semibold leading-tight">{t.appLead}</h2>
          <p className="relative mt-4 text-sm text-teal-50/90">{t.appSubLead}</p>
          <ul className="relative mt-8 space-y-3 text-sm text-teal-50">
            <li className="rounded-xl border border-white/30 bg-white/10 px-3 py-2">{t.feature1}</li>
            <li className="rounded-xl border border-white/30 bg-white/10 px-3 py-2">{t.feature2}</li>
            <li className="rounded-xl border border-white/30 bg-white/10 px-3 py-2">{t.feature3}</li>
          </ul>
        </aside>

        <div className="p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-100/70 p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  mode === "login" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {t.loginTab}
              </button>
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  mode === "register" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {t.registerTab}
              </button>
            </div>
            <LocaleToggle locale={locale} onChange={setLocale} />
          </div>

          <h1 className="text-2xl font-semibold text-zinc-900">{mode === "login" ? t.titleLogin : t.titleRegister}</h1>
          <p className="mt-1 text-sm text-zinc-600">{mode === "login" ? t.subtitleLogin : t.subtitleRegister}</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">{t.email}</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">{t.password}</label>
              <input
                type="password"
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
              />
            </div>

            {mode === "register" ? (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">{t.confirmPassword}</label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                />
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-teal-700 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-900/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (mode === "login" ? t.loggingIn : t.registering) : mode === "login" ? t.login : t.register}
            </button>
          </form>

          {errorMessage ? <p className="mt-3 text-sm font-medium text-rose-600">{errorMessage}</p> : null}
        </div>
      </div>
    </section>
  );
}
