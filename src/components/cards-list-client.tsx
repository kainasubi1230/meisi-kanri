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
  },
} as const;

export function CardsListClient() {
  const { locale, setLocale } = useUiLocale();
  const t = uiText[locale];

  const [query, setQuery] = useState("");
  const [cards, setCards] = useState<CardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCards = async (keyword: string) => {
    setIsLoading(true);
    setError(null);

    try {
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
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : t.fetchError);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchCards("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await fetchCards(query);
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
          </article>
        ))}
      </div>
    </section>
  );
}
