"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { LocaleToggle } from "@/components/locale-toggle";
import { LogoutButton } from "@/components/logout-button";
import { useUiLocale } from "@/lib/ui-locale";

type CardItem = {
  id: string;
  fullName: string | null;
  company: string | null;
  department: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  memo: string | null;
  imageBase64: string | null;
  imageMimeType: string | null;
  createdAt: string;
  ownerUserId: string;
  accessType: "owner" | "account_shared" | "card_shared";
  sharedWith: string[];
};

type AccountShareResponse = {
  sharedWith: string[];
  sharedBy: string[];
};

type MessageKind = "success" | "error";

const uiText = {
  ja: {
    title: "保存済み名刺",
    toCapture: "取り込み画面へ",
    searchPlaceholder: "氏名・会社名・メールで検索",
    search: "検索",
    retry: "再読み込み",
    loading: "読み込み中...",
    fetchError: "一覧の取得に失敗しました。",
    empty: "まだ名刺データがありません。",
    nameFallback: "氏名未設定",
    companyFallback: "会社情報なし",
    email: "メール",
    phone: "電話",
    address: "住所",
    website: "Web",
    ownerBadge: "自分の名刺",
    accountSharedBadge: "アカウント共有",
    cardSharedBadge: "紹介カード",
    sharedFrom: (owner: string) => `共有元: ${owner}`,
    accountShareTitle: "共有（アカウント全体）",
    accountShareHint: "この設定で、あなたの全名刺データを指定アカウントへ共有できます。",
    accountSharePlaceholder: "共有先メールアドレス",
    accountShareButton: "共有する",
    accountSharedWithLabel: "共有先",
    accountSharedByLabel: "あなたに共有中のアカウント",
    accountShareReadOnly: "このカードはアカウント共有で閲覧しています。設定変更はオーナーのみ可能です。",
    accountShareSuccess: "共有設定を更新しました。",
    accountShareError: "共有設定の更新に失敗しました。",
    introductionTitle: "紹介（カード単位）",
    introductionHint: "この名刺だけを個別に共有します。",
    introductionPlaceholder: "紹介先メールアドレス",
    introductionButton: "紹介する",
    introducing: "更新中...",
    introducedLabel: "紹介先",
    remove: "削除",
    introReadOnly: "このカードの紹介設定はオーナーのみ変更できます。",
    noImage: "画像なし",
  },
  en: {
    title: "Saved Business Cards",
    toCapture: "Go to capture",
    searchPlaceholder: "Search by name, company, email",
    search: "Search",
    retry: "Retry",
    loading: "Loading...",
    fetchError: "Failed to fetch card list.",
    empty: "No cards yet.",
    nameFallback: "Unnamed",
    companyFallback: "No company info",
    email: "Email",
    phone: "Phone",
    address: "Address",
    website: "Web",
    ownerBadge: "Owned",
    accountSharedBadge: "Account shared",
    cardSharedBadge: "Card introduced",
    sharedFrom: (owner: string) => `From: ${owner}`,
    accountShareTitle: "Share (entire account)",
    accountShareHint: "This shares all cards in your account with another account.",
    accountSharePlaceholder: "Recipient email",
    accountShareButton: "Share",
    accountSharedWithLabel: "Shared with",
    accountSharedByLabel: "Shared to you by",
    accountShareReadOnly: "This card comes from account sharing. Only the owner can change account share settings.",
    accountShareSuccess: "Share settings updated.",
    accountShareError: "Failed to update share settings.",
    introductionTitle: "Introduction (single card)",
    introductionHint: "Share only this specific card.",
    introductionPlaceholder: "Recipient email",
    introductionButton: "Introduce",
    introducing: "Updating...",
    introducedLabel: "Introduced to",
    remove: "Remove",
    introReadOnly: "Only the owner can change introduction settings for this card.",
    noImage: "No image",
  },
} as const;

export function CardsListClient() {
  const { locale, setLocale } = useUiLocale();
  const t = uiText[locale];

  const [query, setQuery] = useState("");
  const [cards, setCards] = useState<CardItem[]>([]);
  const [accountShare, setAccountShare] = useState<AccountShareResponse>({ sharedWith: [], sharedBy: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [accountShareInput, setAccountShareInput] = useState("");
  const [accountShareBusy, setAccountShareBusy] = useState(false);
  const [accountShareMessage, setAccountShareMessage] = useState<{ kind: MessageKind; text: string } | null>(null);

  const [introInputs, setIntroInputs] = useState<Record<string, string>>({});
  const [introBusyCardId, setIntroBusyCardId] = useState<string | null>(null);
  const [introMessageByCardId, setIntroMessageByCardId] = useState<
    Record<string, { kind: MessageKind; text: string } | null>
  >({});

  const messageTone = (kind: MessageKind) => (kind === "success" ? "text-emerald-700" : "text-rose-600");

  const fetchCards = async (keyword: string) => {
    const params = new URLSearchParams();
    if (keyword.trim().length > 0) {
      params.set("q", keyword.trim());
    }
    const response = await fetch(`/api/cards?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(t.fetchError);
    }
    const body = (await response.json()) as { cards: CardItem[] };
    setCards(body.cards);
  };

  const fetchAccountShare = async () => {
    const response = await fetch("/api/account-shares", {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(t.accountShareError);
    }
    const body = (await response.json()) as AccountShareResponse;
    setAccountShare(body);
  };

  const fetchAll = async (keyword: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([fetchCards(keyword), fetchAccountShare()]);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : t.fetchError);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await fetchAll(query);
  };

  const addAccountShare = async () => {
    const email = accountShareInput.trim();
    if (!email) return;

    setAccountShareBusy(true);
    setAccountShareMessage(null);
    try {
      const response = await fetch("/api/account-shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || t.accountShareError);
      }

      setAccountShareInput("");
      setAccountShareMessage({ kind: "success", text: t.accountShareSuccess });
      await fetchAll(query);
    } catch (e) {
      setAccountShareMessage({ kind: "error", text: e instanceof Error ? e.message : t.accountShareError });
    } finally {
      setAccountShareBusy(false);
    }
  };

  const removeAccountShare = async (email: string) => {
    setAccountShareBusy(true);
    setAccountShareMessage(null);
    try {
      const response = await fetch("/api/account-shares", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || t.accountShareError);
      }

      setAccountShareMessage({ kind: "success", text: t.accountShareSuccess });
      await fetchAll(query);
    } catch (e) {
      setAccountShareMessage({ kind: "error", text: e instanceof Error ? e.message : t.accountShareError });
    } finally {
      setAccountShareBusy(false);
    }
  };

  const addIntroduction = async (cardId: string) => {
    const email = (introInputs[cardId] || "").trim();
    if (!email) return;

    setIntroBusyCardId(cardId);
    setIntroMessageByCardId((prev) => ({ ...prev, [cardId]: null }));
    try {
      const response = await fetch(`/api/cards/${cardId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || t.accountShareError);
      }

      setIntroInputs((prev) => ({ ...prev, [cardId]: "" }));
      setIntroMessageByCardId((prev) => ({ ...prev, [cardId]: { kind: "success", text: t.accountShareSuccess } }));
      await fetchAll(query);
    } catch (e) {
      setIntroMessageByCardId((prev) => ({
        ...prev,
        [cardId]: { kind: "error", text: e instanceof Error ? e.message : t.accountShareError },
      }));
    } finally {
      setIntroBusyCardId(null);
    }
  };

  const removeIntroduction = async (cardId: string, email: string) => {
    setIntroBusyCardId(cardId);
    setIntroMessageByCardId((prev) => ({ ...prev, [cardId]: null }));
    try {
      const response = await fetch(`/api/cards/${cardId}/shares`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || t.accountShareError);
      }

      setIntroMessageByCardId((prev) => ({ ...prev, [cardId]: { kind: "success", text: t.accountShareSuccess } }));
      await fetchAll(query);
    } catch (e) {
      setIntroMessageByCardId((prev) => ({
        ...prev,
        [cardId]: { kind: "error", text: e instanceof Error ? e.message : t.accountShareError },
      }));
    } finally {
      setIntroBusyCardId(null);
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Cards Library</p>
            <h1 className="mt-1 text-2xl font-semibold text-zinc-900 sm:text-3xl">{t.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LocaleToggle locale={locale} onChange={setLocale} />
            <Link
              href="/capture"
              className="btn-secondary"
            >
              {t.toCapture}
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="surface-strong p-4 sm:p-5">
        <h2 className="text-base font-semibold text-zinc-900">{t.accountShareTitle}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t.accountShareHint}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={accountShareInput}
            onChange={(event) => setAccountShareInput(event.target.value)}
            placeholder={t.accountSharePlaceholder}
            className="input"
          />
          <button
            type="button"
            onClick={() => void addAccountShare()}
            disabled={accountShareBusy}
            className="btn-primary px-4"
          >
            {accountShareBusy ? t.introducing : t.accountShareButton}
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-600">{t.accountSharedWithLabel}</p>
            {accountShare.sharedWith.length === 0 ? (
              <p className="text-xs text-zinc-500">-</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {accountShare.sharedWith.map((email) => (
                  <span
                    key={`shared-with-${email}`}
                    className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => void removeAccountShare(email)}
                      disabled={accountShareBusy}
                      className="rounded px-1 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
                    >
                      {t.remove}
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-600">{t.accountSharedByLabel}</p>
            {accountShare.sharedBy.length === 0 ? (
              <p className="text-xs text-zinc-500">-</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {accountShare.sharedBy.map((email) => (
                  <span key={`shared-by-${email}`} className="rounded-full border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700">
                    {email}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        {accountShareMessage ? (
          <p className={`mt-2 text-xs font-medium ${messageTone(accountShareMessage.kind)}`}>{accountShareMessage.text}</p>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.searchPlaceholder}
          className="input"
        />
        <button
          type="submit"
          className="btn-primary px-4"
        >
          {t.search}
        </button>
      </form>

      {isLoading ? (
        <div className="surface p-5">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-44 rounded bg-zinc-200/70" />
            <div className="h-3 w-80 max-w-full rounded bg-zinc-200/50" />
            <div className="h-3 w-72 max-w-full rounded bg-zinc-200/40" />
          </div>
          <p className="mt-4 text-sm text-zinc-600">{t.loading}</p>
        </div>
      ) : error ? (
        <div className="surface p-5">
          <p className="text-sm font-medium text-rose-600">{error}</p>
          <button
            type="button"
            onClick={() => void fetchAll(query)}
            className="btn-primary mt-3 px-4"
          >
            {t.retry}
          </button>
        </div>
      ) : cards.length === 0 ? (
        <div className="surface p-5">
          <p className="text-sm text-zinc-700">{t.empty}</p>
          <Link
            href="/capture"
            className="btn-primary mt-3 px-4"
          >
            {t.toCapture}
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4">
        {cards.map((card) => (
          <article
            key={card.id}
            className="surface-strong p-4 sm:p-5"
          >
            <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
              <div className="space-y-3">
                {card.imageBase64 && card.imageMimeType ? (
                  <div className="relative h-44 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
                    <Image
                      src={`data:${card.imageMimeType};base64,${card.imageBase64}`}
                      alt={card.fullName ? `${card.fullName} business card` : "business card image"}
                      fill
                      unoptimized
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="grid h-44 w-full place-items-center rounded-2xl border border-dashed border-zinc-200 bg-white/60 text-xs font-medium text-zinc-500">
                    {t.noImage}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      card.accessType === "owner"
                        ? "bg-emerald-100 text-emerald-700"
                        : card.accessType === "account_shared"
                          ? "bg-sky-100 text-sky-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {card.accessType === "owner"
                      ? t.ownerBadge
                      : card.accessType === "account_shared"
                        ? t.accountSharedBadge
                        : t.cardSharedBadge}
                  </span>
                  {card.accessType !== "owner" ? <span className="text-xs text-zinc-500">{t.sharedFrom(card.ownerUserId)}</span> : null}
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="truncate text-base font-semibold text-zinc-900">{card.fullName || t.nameFallback}</h2>
                  <time className="text-xs text-zinc-500">
                    {new Date(card.createdAt).toLocaleString(locale === "ja" ? "ja-JP" : "en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </time>
                </div>

                <p className="mt-1 text-sm text-zinc-700">
                  {[card.company, card.department, card.title].filter(Boolean).join(" / ") || t.companyFallback}
                </p>

                <div className="mt-3 grid gap-1 text-sm text-zinc-600 sm:grid-cols-2">
                  <p className="truncate">
                    {t.email}: {card.email || "-"}
                  </p>
                  <p className="truncate">
                    {t.phone}: {card.phone || "-"}
                  </p>
                  <p className="truncate">
                    {t.address}: {card.address || "-"}
                  </p>
                  <p className="truncate">
                    {t.website}: {card.website || "-"}
                  </p>
                </div>

                {card.memo ? <p className="mt-3 rounded-xl bg-zinc-50 px-2.5 py-1.5 text-sm text-zinc-700">{card.memo}</p> : null}

                <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3">
                  <p className="text-sm font-semibold text-zinc-800">{t.introductionTitle}</p>
                  <p className="mt-1 text-xs text-zinc-600">{t.introductionHint}</p>

                  {card.accessType === "owner" ? (
                    <>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <input
                          value={introInputs[card.id] || ""}
                          onChange={(event) =>
                            setIntroInputs((prev) => ({
                              ...prev,
                              [card.id]: event.target.value,
                            }))
                          }
                          placeholder={t.introductionPlaceholder}
                          className="input"
                        />
                        <button
                          type="button"
                          onClick={() => void addIntroduction(card.id)}
                          disabled={introBusyCardId === card.id}
                          className="btn-primary px-3"
                        >
                          {introBusyCardId === card.id ? t.introducing : t.introductionButton}
                        </button>
                      </div>

                      <div className="mt-3">
                        <p className="mb-1 text-xs text-zinc-600">{t.introducedLabel}</p>
                        {card.sharedWith.length === 0 ? (
                          <p className="text-xs text-zinc-500">-</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {card.sharedWith.map((email) => (
                              <span
                                key={`${card.id}-${email}`}
                                className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700"
                              >
                                {email}
                                <button
                                  type="button"
                                  onClick={() => void removeIntroduction(card.id, email)}
                                  disabled={introBusyCardId === card.id}
                                  className="rounded px-1 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
                                >
                                  {t.remove}
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 text-xs text-zinc-600">
                      {card.accessType === "account_shared" ? t.accountShareReadOnly : t.introReadOnly}
                    </p>
                  )}

                  {introMessageByCardId[card.id] ? (
                    <p className={`mt-2 text-xs font-medium ${messageTone(introMessageByCardId[card.id]!.kind)}`}>
                      {introMessageByCardId[card.id]!.text}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

