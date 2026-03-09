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

const uiText = {
  ja: {
    title: "保存済み名刺",
    toCapture: "取り込み画面へ",
    searchPlaceholder: "氏名・会社名・メールで検索",
    search: "検索",
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
    accountSharedBadge: "共有データ",
    cardSharedBadge: "紹介データ",
    sharedFrom: (owner: string) => `共有元: ${owner}`,
    accountShareTitle: "共有（アカウント全体）",
    accountShareHint: "この設定で、あなたの名刺データ全体を他アカウントに共有します。",
    accountSharePlaceholder: "共有先メールアドレス",
    accountShareButton: "共有する",
    accountSharedWithLabel: "全体共有先",
    accountSharedByLabel: "あなたに全体共有しているアカウント",
    accountShareReadOnly: "この名刺は共有データです。全体共有の設定変更は共有元が行います。",
    accountShareSuccess: "全体共有設定を更新しました。",
    accountShareError: "全体共有設定の更新に失敗しました。",
    introductionTitle: "紹介（カード単位）",
    introductionHint: "この名刺だけを個別に共有します。",
    introductionPlaceholder: "紹介先メールアドレス",
    introductionButton: "紹介する",
    introducing: "更新中...",
    introducedLabel: "紹介先",
    remove: "解除",
    introReadOnly: "この名刺の紹介設定は所有者のみ変更できます。",
  },
  en: {
    title: "Saved Business Cards",
    toCapture: "Go to capture",
    searchPlaceholder: "Search by name, company, email",
    search: "Search",
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
    accountShareTitle: "Share (entire account data)",
    accountShareHint: "This shares all cards in your account with another account.",
    accountSharePlaceholder: "Recipient email",
    accountShareButton: "Share",
    accountSharedWithLabel: "Shared with",
    accountSharedByLabel: "Sharing with you",
    accountShareReadOnly: "This card is from an account share. Only the owner can change account sharing.",
    accountShareSuccess: "Account share settings updated.",
    accountShareError: "Failed to update account share settings.",
    introductionTitle: "Introduction (single card)",
    introductionHint: "Share only this specific card.",
    introductionPlaceholder: "Recipient email",
    introductionButton: "Introduce",
    introducing: "Updating...",
    introducedLabel: "Introduced to",
    remove: "Remove",
    introReadOnly: "Only the owner can change introduction settings for this card.",
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
  const [accountShareMessage, setAccountShareMessage] = useState<string>("");

  const [introInputs, setIntroInputs] = useState<Record<string, string>>({});
  const [introBusyCardId, setIntroBusyCardId] = useState<string | null>(null);
  const [introMessageByCardId, setIntroMessageByCardId] = useState<Record<string, string>>({});

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
    setAccountShareMessage("");
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
      setAccountShareMessage(t.accountShareSuccess);
      await fetchAll(query);
    } catch (e) {
      setAccountShareMessage(e instanceof Error ? e.message : t.accountShareError);
    } finally {
      setAccountShareBusy(false);
    }
  };

  const removeAccountShare = async (email: string) => {
    setAccountShareBusy(true);
    setAccountShareMessage("");
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

      setAccountShareMessage(t.accountShareSuccess);
      await fetchAll(query);
    } catch (e) {
      setAccountShareMessage(e instanceof Error ? e.message : t.accountShareError);
    } finally {
      setAccountShareBusy(false);
    }
  };

  const addIntroduction = async (cardId: string) => {
    const email = (introInputs[cardId] || "").trim();
    if (!email) return;

    setIntroBusyCardId(cardId);
    setIntroMessageByCardId((prev) => ({ ...prev, [cardId]: "" }));
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
      setIntroMessageByCardId((prev) => ({ ...prev, [cardId]: t.accountShareSuccess }));
      await fetchAll(query);
    } catch (e) {
      setIntroMessageByCardId((prev) => ({ ...prev, [cardId]: e instanceof Error ? e.message : t.accountShareError }));
    } finally {
      setIntroBusyCardId(null);
    }
  };

  const removeIntroduction = async (cardId: string, email: string) => {
    setIntroBusyCardId(cardId);
    setIntroMessageByCardId((prev) => ({ ...prev, [cardId]: "" }));
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

      setIntroMessageByCardId((prev) => ({ ...prev, [cardId]: t.accountShareSuccess }));
      await fetchAll(query);
    } catch (e) {
      setIntroMessageByCardId((prev) => ({ ...prev, [cardId]: e instanceof Error ? e.message : t.accountShareError }));
    } finally {
      setIntroBusyCardId(null);
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">{t.title}</h1>
        <div className="flex items-center gap-2">
          <LocaleToggle locale={locale} onChange={setLocale} />
          <Link href="/capture" className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
            {t.toCapture}
          </Link>
          <LogoutButton />
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">{t.accountShareTitle}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t.accountShareHint}</p>
        <div className="mt-3 flex gap-2">
          <input
            value={accountShareInput}
            onChange={(event) => setAccountShareInput(event.target.value)}
            placeholder={t.accountSharePlaceholder}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
          />
          <button
            type="button"
            onClick={() => void addAccountShare()}
            disabled={accountShareBusy}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {accountShareBusy ? t.introducing : t.accountShareButton}
          </button>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs text-zinc-600">{t.accountSharedWithLabel}</p>
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
                      className="rounded px-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
                    >
                      {t.remove}
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs text-zinc-600">{t.accountSharedByLabel}</p>
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
        {accountShareMessage ? <p className="mt-2 text-xs text-zinc-600">{accountShareMessage}</p> : null}
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
        <button type="submit" className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
          {t.search}
        </button>
      </form>

      {isLoading ? <p className="text-sm text-zinc-500">{t.loading}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!isLoading && !error && cards.length === 0 ? <p className="text-sm text-zinc-500">{t.empty}</p> : null}

      <div className="grid gap-3">
        {cards.map((card) => (
          <article key={card.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            {card.imageBase64 && card.imageMimeType ? (
              <div className="relative mb-3 h-40 w-full overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
                <Image
                  src={`data:${card.imageMimeType};base64,${card.imageBase64}`}
                  alt={card.fullName ? `${card.fullName} business card` : "business card image"}
                  fill
                  unoptimized
                  className="object-contain"
                />
              </div>
            ) : null}

            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
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

            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-medium text-zinc-900">{card.fullName || t.nameFallback}</h2>
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
              <p>
                {t.email}: {card.email || "-"}
              </p>
              <p>
                {t.phone}: {card.phone || "-"}
              </p>
              <p>
                {t.address}: {card.address || "-"}
              </p>
              <p>
                {t.website}: {card.website || "-"}
              </p>
            </div>

            {card.memo ? <p className="mt-3 rounded bg-zinc-50 px-2 py-1 text-sm text-zinc-700">{card.memo}</p> : null}

            <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-sm font-medium text-zinc-800">{t.introductionTitle}</p>
              <p className="mt-1 text-xs text-zinc-600">{t.introductionHint}</p>

              {card.accessType === "owner" ? (
                <>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={introInputs[card.id] || ""}
                      onChange={(event) =>
                        setIntroInputs((prev) => ({
                          ...prev,
                          [card.id]: event.target.value,
                        }))
                      }
                      placeholder={t.introductionPlaceholder}
                      className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
                    />
                    <button
                      type="button"
                      onClick={() => void addIntroduction(card.id)}
                      disabled={introBusyCardId === card.id}
                      className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
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
                              className="rounded px-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
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
                <p className="mt-2 text-xs text-zinc-600">{card.accessType === "account_shared" ? t.accountShareReadOnly : t.introReadOnly}</p>
              )}

              {introMessageByCardId[card.id] ? <p className="mt-2 text-xs text-zinc-600">{introMessageByCardId[card.id]}</p> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
