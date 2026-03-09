-- CreateTable
CREATE TABLE "BusinessCard" (
    "id" TEXT NOT NULL,
    "userId" VARCHAR(128) NOT NULL,
    "fullName" VARCHAR(191),
    "company" VARCHAR(191),
    "department" VARCHAR(191),
    "title" VARCHAR(191),
    "email" VARCHAR(191),
    "phone" VARCHAR(64),
    "address" VARCHAR(512),
    "website" VARCHAR(191),
    "memo" TEXT,
    "imageBase64" TEXT,
    "imageMimeType" VARCHAR(64),
    "confidence" JSONB,
    "rawExtraction" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessCard_userId_createdAt_idx" ON "BusinessCard"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "BusinessCard_userId_fullName_idx" ON "BusinessCard"("userId", "fullName");

-- CreateIndex
CREATE INDEX "BusinessCard_userId_company_idx" ON "BusinessCard"("userId", "company");

-- CreateIndex
CREATE INDEX "BusinessCard_userId_email_idx" ON "BusinessCard"("userId", "email");
