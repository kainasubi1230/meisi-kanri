import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

import { emptyCardConfidence, emptyBusinessCardFields, extractApiResponseSchema } from "@/lib/business-card";

export const runtime = "nodejs";

const extractionPrompt = `You are an OCR and data extraction engine for Japanese business cards.
Extract the following fields and return JSON only:
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
Rules:
- Use null for unknown values.
- Confidence must be from 0.0 to 1.0.
- Return raw JSON with no markdown, explanation, or comments.`;

function extractJsonCandidate(text: string): string {
  const fencedMatch = text.match(/```json\s*([\s\S]+?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  return text.trim();
}

export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured. Set it in your environment variables." },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    const mimeType = file.type || "image/jpeg";
    const arrayBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = client.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    });

    const result = await model.generateContent([
      extractionPrompt,
      {
        inlineData: {
          data: base64Image,
          mimeType,
        },
      },
    ]);

    const rawText = result.response.text();
    const candidate = extractJsonCandidate(rawText);
    const parsed = JSON.parse(candidate) as unknown;
    const parsedObject = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    const parsedConfidence =
      parsedObject.confidence && typeof parsedObject.confidence === "object"
        ? (parsedObject.confidence as Record<string, unknown>)
        : {};

    const normalized = extractApiResponseSchema.parse({
      ...emptyBusinessCardFields,
      ...parsedObject,
      confidence: { ...emptyCardConfidence, ...parsedConfidence },
      rawText,
    });

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("extract-business-card error:", error);
    return NextResponse.json(
      {
        error: "Failed to extract business card data.",
      },
      { status: 500 },
    );
  }
}
