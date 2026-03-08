import { z } from "zod";

const nullableTrimmedString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== "string") {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const nullableConfidence = z
  .union([z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return null;
    }

    return Math.max(0, Math.min(1, value));
  });

export const businessCardFieldsSchema = z.object({
  fullName: nullableTrimmedString,
  company: nullableTrimmedString,
  department: nullableTrimmedString,
  title: nullableTrimmedString,
  email: nullableTrimmedString,
  phone: nullableTrimmedString,
  address: nullableTrimmedString,
  website: nullableTrimmedString,
  memo: nullableTrimmedString,
});

export const cardConfidenceSchema = z.object({
  fullName: nullableConfidence,
  company: nullableConfidence,
  department: nullableConfidence,
  title: nullableConfidence,
  email: nullableConfidence,
  phone: nullableConfidence,
  address: nullableConfidence,
  website: nullableConfidence,
  memo: nullableConfidence,
});

export const extractApiResponseSchema = businessCardFieldsSchema.extend({
  confidence: cardConfidenceSchema,
  rawText: z.string().optional(),
});

export const createCardRequestSchema = businessCardFieldsSchema.extend({
  confidence: cardConfidenceSchema.optional(),
  imageBase64: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => (typeof value === "string" && value.length > 0 ? value : null)),
  imageMimeType: nullableTrimmedString,
});

export type BusinessCardFields = z.infer<typeof businessCardFieldsSchema>;
export type CardConfidence = z.infer<typeof cardConfidenceSchema>;
export type ExtractApiResponse = z.infer<typeof extractApiResponseSchema>;
export type CreateCardRequest = z.infer<typeof createCardRequestSchema>;

export const emptyBusinessCardFields: BusinessCardFields = {
  fullName: null,
  company: null,
  department: null,
  title: null,
  email: null,
  phone: null,
  address: null,
  website: null,
  memo: null,
};

export const emptyCardConfidence: CardConfidence = {
  fullName: null,
  company: null,
  department: null,
  title: null,
  email: null,
  phone: null,
  address: null,
  website: null,
  memo: null,
};

export const fieldLabels: Record<keyof BusinessCardFields, string> = {
  fullName: "氏名",
  company: "会社名",
  department: "部署",
  title: "役職",
  email: "メール",
  phone: "電話",
  address: "住所",
  website: "Webサイト",
  memo: "メモ",
};
