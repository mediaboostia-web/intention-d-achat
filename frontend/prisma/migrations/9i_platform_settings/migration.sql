-- CreateTable
CREATE TABLE "PlatformSetting" (
    "id" TEXT NOT NULL DEFAULT 'platform',
    "displayName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "whatsappContact" TEXT,
    "community" TEXT,
    "facebook" TEXT,
    "instagram" TEXT,
    "tiktok" TEXT,
    "videoUrl" TEXT,
    "captionsUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminFeedSeen" (
    "userId" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminFeedSeen_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "AdminFeedSeen" ADD CONSTRAINT "AdminFeedSeen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
