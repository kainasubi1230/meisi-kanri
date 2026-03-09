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
    titleLogin: "ログイン",
    titleRegister: "アカウント登録",
    subtitleLogin: "登録済みアカウントでログインしてください",
    subtitleRegister: "利用するアカウントを登録してください",
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
    titleLogin: "Sign In",
    titleRegister: "Create Account",
    subtitleLogin: "Sign in with your registered account",
    subtitleRegister: "Create an account for this app",
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
    <section className="mx-auto w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="inline-flex rounded-md border border-zinc-300 bg-white p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded px-3 py-1 text-xs font-medium ${
              mode === "login" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {t.loginTab}
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`rounded px-3 py-1 text-xs font-medium ${
              mode === "register" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {t.registerTab}
          </button>
        </div>
        <LocaleToggle locale={locale} onChange={setLocale} />
      </div>

      <h1 className="text-xl font-semibold text-zinc-900">{mode === "login" ? t.titleLogin : t.titleRegister}</h1>
      <p className="mb-4 mt-1 text-sm text-zinc-600">{mode === "login" ? t.subtitleLogin : t.subtitleRegister}</p>

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
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          />
        </div>

        {mode === "register" ? (
          <div>
            <label className="mb-1 block text-sm text-zinc-700">{t.confirmPassword}</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (mode === "login" ? t.loggingIn : t.registering) : mode === "login" ? t.login : t.register}
        </button>
      </form>

      {errorMessage ? <p className="mt-3 text-sm text-red-600">{errorMessage}</p> : null}
    </section>
  );
}
