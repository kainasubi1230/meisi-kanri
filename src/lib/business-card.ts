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

const nullableImageString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => (typeof value === "string" && value.length > 0 ? value : null));

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

export const cardBoundingBoxSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().gt(0),
  height: z.number().gt(0),
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

const imagePayloadSchema = z.object({
  imageBase64: nullableImageString,
  imageMimeType: nullableTrimmedString,
});

const optionalImagePayloadSchema = z.object({
  imageBase64: nullableImageString.optional(),
  imageMimeType: nullableTrimmedString.optional(),
});

export const extractedCardSchema = businessCardFieldsSchema.extend({
  confidence: cardConfidenceSchema,
  boundingBox: cardBoundingBoxSchema.nullable().optional(),
});

export const extractApiResponseSchema = z.object({
  cards: z.array(extractedCardSchema).min(1),
  rawText: z.string().optional(),
});

export const createCardBaseSchema = businessCardFieldsSchema.extend({
  confidence: cardConfidenceSchema.optional(),
}).merge(optionalImagePayloadSchema);

export const createCardRequestSchema = createCardBaseSchema.merge(imagePayloadSchema);

export const createCardsBatchRequestSchema = imagePayloadSchema.extend({
  cards: z.array(createCardBaseSchema).min(1).max(50),
});

export type BusinessCardFields = z.infer<typeof businessCardFieldsSchema>;
export type CardConfidence = z.infer<typeof cardConfidenceSchema>;
export type ExtractedCard = z.infer<typeof extractedCardSchema>;
export type ExtractApiResponse = z.infer<typeof extractApiResponseSchema>;
export type CreateCardBase = z.infer<typeof createCardBaseSchema>;
export type CreateCardRequest = z.infer<typeof createCardRequestSchema>;
export type CreateCardsBatchRequest = z.infer<typeof createCardsBatchRequestSchema>;

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
  fullName: "Name",
  company: "Company",
  department: "Department",
  title: "Title",
  email: "Email",
  phone: "Phone",
  address: "Address",
  website: "Website",
  memo: "Memo",
};
