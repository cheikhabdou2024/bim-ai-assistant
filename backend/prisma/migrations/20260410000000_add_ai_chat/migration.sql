-- Sprint 3 — AI Chat module (Conversation + Message + BIMModel update)

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateTable conversations
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL DEFAULT 'Nouvelle conversation',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable messages
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "bimData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- UpdateTable bim_models — add userId, make projectId nullable, update status default
ALTER TABLE "bim_models" ADD COLUMN "userId" TEXT;
ALTER TABLE "bim_models" ALTER COLUMN "projectId" DROP NOT NULL;
ALTER TABLE "bim_models" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- Drop old FK on projectId (was CASCADE, now SET NULL)
ALTER TABLE "bim_models" DROP CONSTRAINT IF EXISTS "bim_models_projectId_fkey";

-- CreateIndex
CREATE INDEX "conversations_userId_idx" ON "conversations"("userId");
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");
CREATE INDEX "bim_models_userId_idx" ON "bim_models"("userId");

-- AddForeignKey conversations → users
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey messages → conversations
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey bim_models → users (nullable)
ALTER TABLE "bim_models" ADD CONSTRAINT "bim_models_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey bim_models → projects (nullable, SET NULL on delete)
ALTER TABLE "bim_models" ADD CONSTRAINT "bim_models_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
