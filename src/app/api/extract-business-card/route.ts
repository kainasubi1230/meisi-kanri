import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getServerAuthSession } from "@/auth";
import {
  emptyBusinessCardFields,
  emptyCardConfidence,
  extractApiResponseSchema,
  extractedCardSchema,
} from "@/lib/business-card";

export const runtime = "nodejs";

const supportedMimeTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/bmp"]);
const maxUploadBytes = 8 * 1024 * 1024;

const extractionPrompt = `You are an OCR and data extraction engine for business cards.
One uploaded image can include multiple business cards.

Return JSON only in this shape:
{
  "cards": [
    {
      "fullName": string | null,
      "company": string | null,
      "department": string | null,
      "title": string | null,
      "email": string | null,
      "phone": string | null,
      "address": string | null,
      "website": string | null,
      "memo": string | null,
      "boundingBox": {
        "x": number,
        "y": number,
        "width": number,
        "height": number
      } | null,
      "confidence": {
        "fullName": number | null,
        "company": number | null,
        "department": number | null,
        "title": number | null,
        "email": number | null,
        "phone": number | null,
        "address": number | null,
        "website": number | null,
        "memo": number | null
      }
    }
  ]
}

Rules:
- Detect all visible business cards in the image and output one object per card.
- Use null for unknown values.
- boundingBox must represent top-left x/y plus width/height of the card region.
- Prefer normalized 0..1 values relative to the full image. Do not return center-point coordinates.
- confidence must be between 0.0 and 1.0.
- Return raw JSON with no markdown or explanations.`;

function extractJsonCandidate(text: string): string {
  const fencedMatch = text.match(/```json\s*([\s\S]+?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstObject = text.indexOf("{");
  const lastObject = text.lastIndexOf("}");
  if (firstObject >= 0 && lastObject > firstObject) {
    return text.slice(firstObject, lastObject + 1);
  }

  const firstArray = text.indexOf("[");
  const lastArray = text.lastIndexOf("]");
  if (firstArray >= 0 && lastArray > firstArray) {
    return text.slice(firstArray, lastArray + 1);
  }

  return text.trim();
}

function normalizeCardPayload(payload: unknown) {
  const objectPayload = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const confidencePayload =
    objectPayload.confidence && typeof objectPayload.confidence === "object"
      ? (objectPayload.confidence as Record<string, unknown>)
      : {};
  const boundingBox = normalizeBoundingBoxPayload(objectPayload.boundingBox);

  return extractedCardSchema.parse({
    ...emptyBusinessCardFields,
    ...objectPayload,
    boundingBox,
    confidence: {
      ...emptyCardConfidence,
      ...confidencePayload,
    },
  });
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function normalizeBoundingBoxPayload(raw: unknown): { x: number; y: number; width: number; height: number } | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const obj = raw as Record<string, unknown>;

  const x = parseNumber(obj.x ?? obj.left ?? obj.xMin);
  const y = parseNumber(obj.y ?? obj.top ?? obj.yMin);
  const width = parseNumber(obj.width ?? obj.w);
  const height = parseNumber(obj.height ?? obj.h);

  const normalizedX = x;
  const normalizedY = y;
  let normalizedWidth = width;
  let normalizedHeight = height;

  if (
    normalizedWidth === null &&
    normalizedHeight === null &&
    parseNumber(obj.right ?? obj.xMax) !== null &&
    parseNumber(obj.bottom ?? obj.yMax) !== null &&
    normalizedX !== null &&
    normalizedY !== null
  ) {
    const right = parseNumber(obj.right ?? obj.xMax) ?? 0;
    const bottom = parseNumber(obj.bottom ?? obj.yMax) ?? 0;
    normalizedWidth = right - normalizedX;
    normalizedHeight = bottom - normalizedY;
  }

  if (
    normalizedX === null ||
    normalizedY === null ||
    normalizedWidth === null ||
    normalizedHeight === null ||
    normalizedWidth <= 0 ||
    normalizedHeight <= 0
  ) {
    return null;
  }

  return {
    x: normalizedX,
    y: normalizedY,
    width: normalizedWidth,
    height: normalizedHeight,
  };
}

function normalizeExtraction(parsed: unknown) {
  if (Array.isArray(parsed)) {
    const cards = parsed.map((item) => normalizeCardPayload(item));
    return extractApiResponseSchema.parse({ cards });
  }

  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;

    if (Array.isArray(obj.cards)) {
      const cards = obj.cards.map((item) => normalizeCardPayload(item));
      return extractApiResponseSchema.parse({ cards });
    }

    const card = normalizeCardPayload(obj);
    return extractApiResponseSchema.parse({ cards: [card] });
  }

  throw new SyntaxError("Invalid AI response format");
}

function formatExtractionError(error: unknown): { status: number; message: string } {
  if (error instanceof ZodError || error instanceof SyntaxError) {
    return {
      status: 502,
      message: "Could not parse AI response. Please retry with a clearer image.",
    };
  }

  if (error && typeof error === "object") {
    const maybeError = error as { status?: number; message?: string };
    const status = maybeError.status;
    const message = maybeError.message || "";
    const lowerMessage = message.toLowerCase();

    if (status === 429 || message.includes("429 Too Many Requests") || lowerMessage.includes("quota")) {
      return {
        status: 429,
        message: "Gemini API quota exceeded. Check billing/quota settings and retry later.",
      };
    }

    if (status === 400) {
      if (lowerMessage.includes("api key not valid") || lowerMessage.includes("api_key_invalid")) {
        return {
          status: 400,
          message: "Gemini API key is invalid. Please set a valid GEMINI_API_KEY in .env.local.",
        };
      }

      if (lowerMessage.includes("unable to process input image")) {
        return {
          status: 400,
          message:
            "The uploaded image could not be processed. Please use a clearer JPG/PNG image (HEIC is not supported).",
        };
      }

      if (lowerMessage.includes("invalid argument")) {
        return {
          status: 400,
          message: "Gemini rejected the request format. Please retry with a different image.",
        };
      }

      return {
        status: 400,
        message: "Gemini returned 400 Bad Request. Check image format/size and retry.",
      };
    }

    if (status === 401 || status === 403) {
      return {
        status,
        message: "Gemini API key is invalid or not authorized.",
      };
    }

    if (typeof status === "number" && status >= 400) {
      return {
        status,
        message: `Gemini API request failed (status: ${status}).`,
      };
    }
  }

  return {
    status: 500,
    message: "Failed to extract business card data.",
  };
}

export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    const mimeType = file.type || "image/jpeg";
    if (!supportedMimeTypes.has(mimeType.toLowerCase())) {
      return NextResponse.json(
        {
          error: `Unsupported image type: ${mimeType}. Please upload JPG/PNG/WEBP/GIF/BMP.`,
        },
        { status: 400 },
      );
    }
    if (file.size > maxUploadBytes) {
      return NextResponse.json(
        {
          error: `Image is too large (${Math.ceil(file.size / (1024 * 1024))}MB). Please upload <= 8MB image.`,
        },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const modelCandidates = Array.from(
      new Set([process.env.GEMINI_MODEL || "gemini-2.5-flash", "gemini-2.5-flash", "gemini-flash-lite-latest"]),
    );

    let result: Awaited<ReturnType<ReturnType<typeof client.getGenerativeModel>["generateContent"]>> | null = null;
    let lastError: unknown = null;

    for (const modelName of modelCandidates) {
      try {
        const requestParts = [
          extractionPrompt,
          {
            inlineData: {
              data: base64Image,
              mimeType,
            },
          },
        ];

        try {
          const model = client.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseMimeType: "application/json",
            },
          });
          result = await model.generateContent(requestParts);
        } catch (firstError) {
          const maybeFirstError = firstError as { status?: number };
          if (maybeFirstError.status !== 400) {
            throw firstError;
          }

          const fallbackModel = client.getGenerativeModel({ model: modelName });
          result = await fallbackModel.generateContent(requestParts);
        }

        break;
      } catch (error) {
        lastError = error;
        const maybeError = error as { status?: number; message?: string };
        const message = (maybeError.message || "").toLowerCase();
        const shouldRetry =
          maybeError.status === 429 ||
          maybeError.status === 400 ||
          maybeError.status === 404 ||
          message.includes("quota") ||
          message.includes("too many requests") ||
          message.includes("not found for api version");

        if (!shouldRetry) {
          throw error;
        }
      }
    }

    if (!result) {
      throw lastError || new Error("No available Gemini model succeeded.");
    }

    const rawText = result.response.text();
    const candidate = extractJsonCandidate(rawText);
    const parsed = JSON.parse(candidate) as unknown;
    const normalized = normalizeExtraction(parsed);

    return NextResponse.json({
      ...normalized,
      rawText,
    });
  } catch (error) {
    console.error("extract-business-card error:", error);
    const mapped = formatExtractionError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
