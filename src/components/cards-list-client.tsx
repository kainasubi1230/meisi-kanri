"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

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
  createdAt: string;
};

export function CardsListClient() {
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
        throw new Error("一覧の取得に失敗しました。");
      }

      const body = (await response.json()) as { cards: CardItem[] };
      setCards(body.cards);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "一覧の取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchCards("");
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await fetchCards(query);
  };

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">保存済み名刺</h1>
        <Link href="/" className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
          新規取り込みへ
        </Link>
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="名前・会社名・メールで検索"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
        <button type="submit" className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
          検索
        </button>
      </form>

      {isLoading ? <p className="text-sm text-zinc-500">読み込み中...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!isLoading && !error && cards.length === 0 ? (
        <p className="text-sm text-zinc-500">まだ名刺データがありません。</p>
      ) : null}

      <div className="grid gap-3">
        {cards.map((card) => (
          <article key={card.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-medium text-zinc-900">{card.fullName || "氏名未設定"}</h2>
              <time className="text-xs text-zinc-500">
                {new Date(card.createdAt).toLocaleString("ja-JP", { dateStyle: "medium", timeStyle: "short" })}
              </time>
            </div>
            <p className="mt-1 text-sm text-zinc-700">
              {[card.company, card.department, card.title].filter(Boolean).join(" / ") || "会社情報なし"}
            </p>
            <div className="mt-3 grid gap-1 text-sm text-zinc-600 sm:grid-cols-2">
              <p>メール: {card.email || "-"}</p>
              <p>電話: {card.phone || "-"}</p>
              <p>住所: {card.address || "-"}</p>
              <p>Web: {card.website || "-"}</p>
            </div>
            {card.memo ? <p className="mt-3 rounded bg-zinc-50 px-2 py-1 text-sm text-zinc-700">{card.memo}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
