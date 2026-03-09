-- CreateTable
CREATE TABLE "BusinessCardShare" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "ownerUserId" VARCHAR(128) NOT NULL,
    "sharedWithUserId" VARCHAR(191) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessCardShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessCardShare_sharedWithUserId_createdAt_idx" ON "BusinessCardShare"("sharedWithUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "BusinessCardShare_ownerUserId_idx" ON "BusinessCardShare"("ownerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessCardShare_cardId_sharedWithUserId_key" ON "BusinessCardShare"("cardId", "sharedWithUserId");

-- AddForeignKey
ALTER TABLE "BusinessCardShare" ADD CONSTRAINT "BusinessCardShare_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "BusinessCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
