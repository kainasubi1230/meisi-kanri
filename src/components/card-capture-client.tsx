"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";

import {
  emptyBusinessCardFields,
  emptyCardConfidence,
  fieldLabels,
  type BusinessCardFields,
  type CardConfidence,
  type ExtractApiResponse,
} from "@/lib/business-card";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type ExtractStatus = "idle" | "extracting" | "done" | "error";

type SelectedImage = {
  file: File;
  previewUrl: string;
  base64: string;
};

function confidenceClass(score: number | null): string {
  if (score === null) return "border-zinc-300";
  if (score < 0.5) return "border-red-300 bg-red-50";
  if (score < 0.75) return "border-amber-300 bg-amber-50";
  return "border-emerald-300 bg-emerald-50";
}

function toDataFieldKey(key: string): key is keyof BusinessCardFields {
  return key in emptyBusinessCardFields;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read image data"));
        return;
      }
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = () => reject(reader.error || new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

export function CardCaptureClient() {
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [fields, setFields] = useState<BusinessCardFields>(emptyBusinessCardFields);
  const [confidence, setConfidence] = useState<CardConfidence>(emptyCardConfidence);
  const [extractStatus, setExtractStatus] = useState<ExtractStatus>("idle");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filledCount = useMemo(
    () => Object.values(fields).filter((value) => value && value.trim().length > 0).length,
    [fields],
  );

  const onSelectImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const base64 = await fileToBase64(file);
    const previewUrl = URL.createObjectURL(file);
    if (selectedImage?.previewUrl) {
      URL.revokeObjectURL(selectedImage.previewUrl);
    }
    setSelectedImage({ file, previewUrl, base64 });
    setErrorMessage(null);
    setSaveStatus("idle");
  };

  useEffect(() => {
    return () => {
      if (selectedImage?.previewUrl) {
        URL.revokeObjectURL(selectedImage.previewUrl);
      }
    };
  }, [selectedImage]);

  const runExtraction = async () => {
    if (!selectedImage) {
      setErrorMessage("先に名刺画像を選択してください。");
      return;
    }

    setExtractStatus("extracting");
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedImage.file);

      const response = await fetch("/api/extract-business-card", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "抽出に失敗しました。");
      }

      const data = (await response.json()) as ExtractApiResponse;
      setFields({
        fullName: data.fullName,
        company: data.company,
        department: data.department,
        title: data.title,
        email: data.email,
        phone: data.phone,
        address: data.address,
        website: data.website,
        memo: data.memo,
      });
      setConfidence(data.confidence || emptyCardConfidence);
      setExtractStatus("done");
    } catch (error) {
      setExtractStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "抽出に失敗しました。");
    }
  };

  const saveCard = async () => {
    setSaveStatus("saving");
    setErrorMessage(null);

    try {
      const payload = {
        ...fields,
        confidence,
        imageBase64: selectedImage?.base64 || null,
        imageMimeType: selectedImage?.file.type || null,
      };

      const response = await fetch("/api/cards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "保存に失敗しました。");
      }

      setSaveStatus("saved");
    } catch (error) {
      setSaveStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "保存に失敗しました。");
    }
  };

  const updateField = (key: keyof BusinessCardFields, value: string) => {
    setFields((prev) => ({
      ...prev,
      [key]: value.trim().length > 0 ? value : null,
    }));
    setSaveStatus("idle");
  };

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">名刺電子化アプリ</h1>
        <Link href="/cards" className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
          保存済み一覧へ
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-medium text-zinc-900">1. 名刺画像アップロード</h2>
          <p className="mt-1 text-sm text-zinc-500">撮影画像を選択してAI抽出を実行します。</p>

          <label
            htmlFor="business-card-image"
            className="mt-4 flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm text-zinc-600 hover:border-zinc-400"
          >
            {selectedImage ? selectedImage.file.name : "画像を選択"}
          </label>
          <input id="business-card-image" type="file" accept="image/*" className="hidden" onChange={onSelectImage} />

          {selectedImage ? (
            <div className="relative mt-4 h-60 w-full overflow-hidden rounded-md border border-zinc-200 bg-white">
              <Image
                src={selectedImage.previewUrl}
                alt="selected business card"
                fill
                unoptimized
                className="object-contain"
              />
            </div>
          ) : null}

          <button
            type="button"
            onClick={runExtraction}
            disabled={extractStatus === "extracting"}
            className="mt-4 w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {extractStatus === "extracting" ? "抽出中..." : "2. AIで読み取る"}
          </button>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-medium text-zinc-900">3. 抽出結果の確認と修正</h2>
            <p className="text-sm text-zinc-500">入力済み {filledCount} / 9</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Object.entries(fieldLabels).map(([key, label]) => {
              if (!toDataFieldKey(key)) return null;
              return (
                <div key={key} className="flex flex-col gap-1">
                  <label htmlFor={key} className="text-sm text-zinc-700">
                    {label}
                  </label>
                  <input
                    id={key}
                    value={fields[key] ?? ""}
                    onChange={(event) => updateField(key, event.target.value)}
                    className={`rounded-md border px-3 py-2 text-sm outline-none transition focus:border-zinc-500 ${confidenceClass(
                      confidence[key],
                    )}`}
                  />
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={saveCard}
            disabled={saveStatus === "saving"}
            className="mt-5 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveStatus === "saving" ? "保存中..." : "4. DBに保存"}
          </button>

          {saveStatus === "saved" ? (
            <p className="mt-3 text-sm text-emerald-700">保存しました。右上の一覧から検索できます。</p>
          ) : null}
          {errorMessage ? <p className="mt-3 text-sm text-red-600">{errorMessage}</p> : null}
        </div>
      </div>
    </section>
  );
}
