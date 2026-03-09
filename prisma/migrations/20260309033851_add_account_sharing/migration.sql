-- CreateTable
CREATE TABLE "AppUserShare" (
    "id" TEXT NOT NULL,
    "ownerUserId" VARCHAR(191) NOT NULL,
    "sharedWithUserId" VARCHAR(191) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppUserShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppUserShare_sharedWithUserId_createdAt_idx" ON "AppUserShare"("sharedWithUserId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "AppUserShare_ownerUserId_sharedWithUserId_key" ON "AppUserShare"("ownerUserId", "sharedWithUserId");
