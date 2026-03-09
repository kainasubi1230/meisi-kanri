"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";

import { LocaleToggle } from "@/components/locale-toggle";
import { LogoutButton } from "@/components/logout-button";
import {
  emptyBusinessCardFields,
  emptyCardConfidence,
  type BusinessCardFields,
  type CardConfidence,
  type ExtractApiResponse,
} from "@/lib/business-card";
import { useUiLocale } from "@/lib/ui-locale";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type ExtractStatus = "idle" | "extracting" | "done" | "error";

type SelectedImage = {
  sourceName: string;
  uploadFile: File;
  previewUrl: string;
  base64: string;
};

type EditableCard = {
  fields: BusinessCardFields;
  confidence: CardConfidence;
  imageBase64: string | null;
  imageMimeType: string | null;
};

type BoundingBox = NonNullable<ExtractApiResponse["cards"][number]["boundingBox"]>;

const fieldKeys = Object.keys(emptyBusinessCardFields) as Array<keyof BusinessCardFields>;

const uiText = {
  ja: {
    title: "名刺デジタル化ワークスペース",
    savedList: "保存済み一覧",
    uploadTitle: "1. 画像をアップロード",
    uploadHint: "1枚の画像に複数の名刺があってもまとめて処理できます。",
    selectImage: "画像を選択",
    extracting: "抽出中...",
    extractButton: "2. AIで読み取り",
    reviewTitle: "3. 抽出結果を確認",
    cardsAndFields: (cards: number, fields: number) => `名刺 ${cards} 枚 / 入力済み ${fields} / 9`,
    cardTab: (index: number) => `名刺 ${index}`,
    croppedPreviewLabel: "自動トリミング画像",
    saving: "保存中...",
    saveAll: (count: number) => `4. ${count}件をDBに保存`,
    saved: (count: number) => `${count}件を保存しました。`,
    errSelectImage: "先に画像を選択してください。",
    errExtraction: "読み取りに失敗しました。",
    errNoData: "保存できる名刺データがありません。",
    errSave: "保存に失敗しました。",
    fieldLabels: {
      fullName: "氏名",
      company: "会社名",
      department: "部署",
      title: "役職",
      email: "メール",
      phone: "電話",
      address: "住所",
      website: "Web",
      memo: "メモ",
    } as Record<keyof BusinessCardFields, string>,
  },
  en: {
    title: "Business Card Workspace",
    savedList: "Saved cards",
    uploadTitle: "1. Upload image",
    uploadHint: "You can process multiple cards from one image.",
    selectImage: "Select image",
    extracting: "Extracting...",
    extractButton: "2. Extract with AI",
    reviewTitle: "3. Review extracted cards",
    cardsAndFields: (cards: number, fields: number) => `Cards ${cards} / Filled ${fields} / 9`,
    cardTab: (index: number) => `Card ${index}`,
    croppedPreviewLabel: "Auto-cropped preview",
    saving: "Saving...",
    saveAll: (count: number) => `4. Save ${count} record(s) to DB`,
    saved: (count: number) => `Saved ${count} record(s).`,
    errSelectImage: "Select an image first.",
    errExtraction: "Extraction failed.",
    errNoData: "No card data to save.",
    errSave: "Save failed.",
    fieldLabels: {
      fullName: "Name",
      company: "Company",
      department: "Department",
      title: "Title",
      email: "Email",
      phone: "Phone",
      address: "Address",
      website: "Website",
      memo: "Memo",
    } as Record<keyof BusinessCardFields, string>,
  },
} as const;

function confidenceClass(score: number | null): string {
  if (score === null) return "border-zinc-300";
  if (score < 0.5) return "border-red-300 bg-red-50";
  if (score < 0.75) return "border-amber-300 bg-amber-50";
  return "border-emerald-300 bg-emerald-50";
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read image data."));
        return;
      }
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = () => reject(reader.error || new Error("Failed to read image."));
    reader.readAsDataURL(file);
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

function emptyEditableCard(): EditableCard {
  return {
    fields: { ...emptyBusinessCardFields },
    confidence: { ...emptyCardConfidence },
    imageBase64: null,
    imageMimeType: null,
  };
}

type NormalizedRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function normalizeRectFromTopLeft(
  box: BoundingBox,
  xScale: number,
  yScale: number,
): NormalizedRect | null {
  const x = box.x / xScale;
  const y = box.y / yScale;
  const width = box.width / xScale;
  const height = box.height / yScale;

  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) {
    return null;
  }
  if (width <= 0 || height <= 0) {
    return null;
  }

  return { x, y, width, height };
}

function normalizeRectFromCenter(
  box: BoundingBox,
  xScale: number,
  yScale: number,
): NormalizedRect | null {
  const centerX = box.x / xScale;
  const centerY = box.y / yScale;
  const width = box.width / xScale;
  const height = box.height / yScale;

  if (!Number.isFinite(centerX) || !Number.isFinite(centerY) || !Number.isFinite(width) || !Number.isFinite(height)) {
    return null;
  }
  if (width <= 0 || height <= 0) {
    return null;
  }

  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };
}

function scoreNormalizedRect(rect: NormalizedRect): number {
  if (rect.width <= 0 || rect.height <= 0) {
    return Number.NEGATIVE_INFINITY;
  }

  const overflowX = Math.max(0, -(rect.x)) + Math.max(0, rect.x + rect.width - 1);
  const overflowY = Math.max(0, -(rect.y)) + Math.max(0, rect.y + rect.height - 1);
  const overflowPenalty = (overflowX + overflowY) * 10; // Stronger penalty for overflow

  const clampedWidth = Math.max(0, Math.min(1, rect.x + rect.width) - Math.max(0, rect.x));
  const clampedHeight = Math.max(0, Math.min(1, rect.y + rect.height) - Math.max(0, rect.y));
  const area = clampedWidth * clampedHeight;
  if (area <= 0) {
    return Number.NEGATIVE_INFINITY;
  }

  // Business card should be reasonably sized (10-50% of image)
  const areaPenalty = Math.abs(area - 0.25) * 1.5 + (area < 0.04 ? 5 : 0) + (area > 0.85 ? 5 : 0);

  return -(overflowPenalty + areaPenalty);
}

function resolveCropRect(box: BoundingBox, imageWidth: number, imageHeight: number) {
  const candidates = [
    normalizeRectFromTopLeft(box, 1, 1),
    normalizeRectFromTopLeft(box, 100, 100),
    normalizeRectFromTopLeft(box, 1000, 1000),
    normalizeRectFromTopLeft(box, imageWidth, imageHeight),
    normalizeRectFromCenter(box, 1, 1),
    normalizeRectFromCenter(box, 100, 100),
    normalizeRectFromCenter(box, 1000, 1000),
    normalizeRectFromCenter(box, imageWidth, imageHeight),
  ].filter((rect): rect is NormalizedRect => rect !== null);

  if (candidates.length === 0) {
    return null;
  }

  const best = candidates.reduce((bestRect, current) =>
    scoreNormalizedRect(current) > scoreNormalizedRect(bestRect) ? current : bestRect,
  );

  // Minimal padding to stay as close to card edges as possible
  const padding = 0.005;
  const x1 = clamp01(best.x - padding);
  const y1 = clamp01(best.y - padding);
  const x2 = clamp01(best.x + best.width + padding);
  const y2 = clamp01(best.y + best.height + padding);

  const sx = Math.floor(x1 * imageWidth);
  const sy = Math.floor(y1 * imageHeight);
  const sw = Math.max(1, Math.floor((x2 - x1) * imageWidth));
  const sh = Math.max(1, Math.floor((y2 - y1) * imageHeight));

  // Ensure minimum size and reject if outside bounds
  if (sw < 50 || sh < 30) {
    return null;
  }

  return {
    sx: Math.max(0, sx),
    sy: Math.max(0, sy),
    sw: Math.min(sw, imageWidth - Math.max(0, sx)),
    sh: Math.min(sh, imageHeight - Math.max(0, sy)),
  };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for cropping."));
    img.src = url;
  });
}

async function optimizeImageForUpload(file: File): Promise<File> {
  const sourceUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(sourceUrl);
    const maxSide = 2200;
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const targetWidth = Math.max(1, Math.round(img.width * scale));
    const targetHeight = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return file;
    }

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    let quality = 0.9;
    let blob = await canvasToJpegBlob(canvas, quality);
    const targetMaxBytes = 4 * 1024 * 1024;
    while (blob && blob.size > targetMaxBytes && quality > 0.55) {
      quality -= 0.1;
      blob = await canvasToJpegBlob(canvas, quality);
    }

    if (!blob) {
      return file;
    }

    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "card"}-optimized.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

async function cropImageByBoundingBox(
  file: File,
  boundingBox: BoundingBox,
): Promise<{ base64: string; mimeType: string } | null> {
  const sourceUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(sourceUrl);
    const cropRect = resolveCropRect(boundingBox, img.width, img.height);
    if (!cropRect) {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = cropRect.sw;
    canvas.height = cropRect.sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }

    ctx.drawImage(img, cropRect.sx, cropRect.sy, cropRect.sw, cropRect.sh, 0, 0, cropRect.sw, cropRect.sh);

    const outputMimeType = file.type.startsWith("image/") ? file.type : "image/jpeg";
    const dataUrl = canvas.toDataURL(outputMimeType, 0.92);

    return {
      base64: dataUrl.split(",")[1] || "",
      mimeType: outputMimeType,
    };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export function CardCaptureClient() {
  const { locale, setLocale } = useUiLocale();
  const t = uiText[locale];

  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [cards, setCards] = useState<EditableCard[]>([emptyEditableCard()]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [extractStatus, setExtractStatus] = useState<ExtractStatus>("idle");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savedCount, setSavedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeCard = cards[activeCardIndex] || emptyEditableCard();
  const activeFilledCount = useMemo(
    () => Object.values(activeCard.fields).filter((value) => value && value.trim().length > 0).length,
    [activeCard.fields],
  );
  const cardsReadyCount = useMemo(
    () =>
      cards.filter((card) =>
        Object.values(card.fields).some((value) => typeof value === "string" && value.trim().length > 0),
      ).length,
    [cards],
  );

  const onSelectImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const uploadFile = await optimizeImageForUpload(file);
    const base64 = await fileToBase64(uploadFile);
    const previewUrl = URL.createObjectURL(file);
    if (selectedImage?.previewUrl) {
      URL.revokeObjectURL(selectedImage.previewUrl);
    }

    setSelectedImage({ sourceName: file.name, uploadFile, previewUrl, base64 });
    setCards([emptyEditableCard()]);
    setActiveCardIndex(0);
    setExtractStatus("idle");
    setSaveStatus("idle");
    setSavedCount(0);
    setErrorMessage(null);
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
      setErrorMessage(t.errSelectImage);
      return;
    }

    setExtractStatus("extracting");
    setErrorMessage(null);
    setSaveStatus("idle");

    try {
      const formData = new FormData();
      formData.append("image", selectedImage.uploadFile);

      const response = await fetch("/api/extract-business-card", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || t.errExtraction);
      }

      const data = (await response.json()) as ExtractApiResponse;
      const nextCards = await Promise.all(
        data.cards.map(async (card) => {
          const cropped =
            card.boundingBox && selectedImage.uploadFile
              ? await cropImageByBoundingBox(selectedImage.uploadFile, card.boundingBox)
              : null;

          return {
            fields: {
              fullName: card.fullName,
              company: card.company,
              department: card.department,
              title: card.title,
              email: card.email,
              phone: card.phone,
              address: card.address,
              website: card.website,
              memo: card.memo,
            },
            confidence: card.confidence || { ...emptyCardConfidence },
            imageBase64: cropped?.base64 || null,
            imageMimeType: cropped?.mimeType || null,
          };
        }),
      );

      setCards(nextCards.length > 0 ? nextCards : [emptyEditableCard()]);
      setActiveCardIndex(0);
      setExtractStatus("done");
    } catch (error) {
      setExtractStatus("error");
      setErrorMessage(error instanceof Error ? error.message : t.errExtraction);
    }
  };

  const saveCards = async () => {
    if (!selectedImage) {
      setErrorMessage(t.errSelectImage);
      return;
    }

    setSaveStatus("saving");
    setErrorMessage(null);

    try {
      const cardsToSave = cards.filter((card) =>
        Object.values(card.fields).some((value) => typeof value === "string" && value.trim().length > 0),
      );

      if (cardsToSave.length === 0) {
        setSaveStatus("error");
        setErrorMessage(t.errNoData);
        return;
      }

      const payload = {
        cards: cardsToSave.map((card) => ({
          ...card.fields,
          confidence: card.confidence,
          imageBase64: card.imageBase64,
          imageMimeType: card.imageMimeType,
        })),
        imageBase64: selectedImage.base64,
        imageMimeType: selectedImage.uploadFile.type || null,
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
        throw new Error(body?.error || t.errSave);
      }

      const body = (await response.json()) as { count?: number };
      setSavedCount(body.count || cardsToSave.length);
      setSaveStatus("saved");
    } catch (error) {
      setSaveStatus("error");
      setErrorMessage(error instanceof Error ? error.message : t.errSave);
    }
  };

  const updateField = (index: number, key: keyof BusinessCardFields, value: string) => {
    setCards((prev) =>
      prev.map((card, cardIndex) => {
        if (cardIndex !== index) {
          return card;
        }

        return {
          ...card,
          fields: {
            ...card.fields,
            [key]: value.trim().length > 0 ? value : null,
          },
        };
      }),
    );
    setSaveStatus("idle");
  };

  const steps = [
    { id: "upload", label: locale === "ja" ? "アップロード" : "Upload", done: Boolean(selectedImage) },
    { id: "extract", label: locale === "ja" ? "読み取り" : "Extract", done: extractStatus === "done" },
    { id: "review", label: locale === "ja" ? "確認" : "Review", done: extractStatus === "done" && cardsReadyCount > 0 },
    { id: "save", label: locale === "ja" ? "保存" : "Save", done: saveStatus === "saved" },
  ] as const;
  const activeStepIndex = steps.findIndex((s) => !s.done);

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Capture Workspace</p>
            <h1 className="mt-1 text-2xl font-semibold text-zinc-900 sm:text-3xl">{t.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LocaleToggle locale={locale} onChange={setLocale} />
            <Link
              href="/cards"
              className="btn-secondary"
            >
              {t.savedList}
            </Link>
            <LogoutButton />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {steps.map((step, index) => {
            const isActive = index === Math.max(0, activeStepIndex);
            return (
              <div key={step.id} className="flex items-center gap-3">
                <div
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    step.done
                      ? "border-emerald-200 bg-emerald-50/70 text-emerald-700"
                      : isActive
                        ? "border-teal-200 bg-teal-50/70 text-teal-800"
                        : "border-zinc-200 bg-white/60 text-zinc-600"
                  }`}
                >
                  <span
                    className={`grid h-5 w-5 place-items-center rounded-full text-[11px] ${
                      step.done ? "bg-emerald-600 text-white" : isActive ? "bg-teal-700 text-white" : "bg-zinc-200 text-zinc-700"
                    }`}
                  >
                    {index + 1}
                  </span>
                  {step.label}
                </div>
                {index < steps.length - 1 ? <span className="h-px w-6 bg-zinc-200/80" aria-hidden="true" /> : null}
              </div>
            );
          })}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="surface-strong p-5">
          <h2 className="text-lg font-semibold text-zinc-900">{t.uploadTitle}</h2>
          <p className="mt-1 text-sm text-zinc-600">{t.uploadHint}</p>

          <label
            htmlFor="business-card-image"
            className="mt-4 flex min-h-32 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-gradient-to-br from-zinc-100 to-zinc-50 px-4 py-6 text-center text-sm font-medium text-zinc-600 transition hover:border-teal-400 hover:text-zinc-800"
          >
            {selectedImage ? selectedImage.sourceName : t.selectImage}
          </label>
          <input id="business-card-image" type="file" accept="image/*" className="hidden" onChange={onSelectImage} />

          {selectedImage ? (
            <div className="relative mt-4 h-60 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <Image src={selectedImage.previewUrl} alt="selected business card" fill unoptimized className="object-contain" />
            </div>
          ) : null}

          <button
            type="button"
            onClick={runExtraction}
            disabled={extractStatus === "extracting"}
            className="btn-primary mt-4 w-full py-2.5"
          >
            {extractStatus === "extracting" ? t.extracting : t.extractButton}
          </button>
        </div>

        <div className="surface-strong p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-zinc-900">{t.reviewTitle}</h2>
            <p className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">{t.cardsAndFields(cards.length, activeFilledCount)}</p>
          </div>

          {cards.length > 1 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {cards.map((_, index) => (
                <button
                  key={`card-tab-${index}`}
                  type="button"
                  onClick={() => setActiveCardIndex(index)}
                  className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition ${
                    index === activeCardIndex
                      ? "border-teal-700 bg-teal-700 text-white shadow"
                      : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {t.cardTab(index + 1)}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {fieldKeys.map((key) => (
              <div key={key} className="flex flex-col gap-1">
                <label htmlFor={key} className="text-sm font-medium text-zinc-700">
                  {t.fieldLabels[key]}
                </label>
                <input
                  id={key}
                  value={activeCard.fields[key] ?? ""}
                  onChange={(event) => updateField(activeCardIndex, key, event.target.value)}
                  className={`input w-full ${confidenceClass(activeCard.confidence[key])}`}
                />
              </div>
            ))}
          </div>

          {activeCard.imageBase64 && activeCard.imageMimeType ? (
            <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-2.5">
              <p className="mb-2 text-xs font-medium text-zinc-600">{t.croppedPreviewLabel}</p>
              <div className="relative w-full overflow-hidden rounded-xl border border-zinc-200 bg-white" style={{ aspectRatio: "4/3", minHeight: "200px" }}>
                <Image
                  src={`data:${activeCard.imageMimeType};base64,${activeCard.imageBase64}`}
                  alt={`card-${activeCardIndex + 1}-crop`}
                  fill
                  unoptimized
                  className="object-contain"
                />
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={saveCards}
            disabled={saveStatus === "saving"}
            className="btn-primary mt-5 w-full py-2.5"
          >
            {saveStatus === "saving" ? t.saving : t.saveAll(cardsReadyCount)}
          </button>

          {saveStatus === "saved" ? <p className="mt-3 text-sm font-medium text-emerald-700">{t.saved(savedCount)}</p> : null}
          {errorMessage ? <p className="mt-3 text-sm font-medium text-rose-600">{errorMessage}</p> : null}
        </div>
      </div>
    </section>
  );
}

