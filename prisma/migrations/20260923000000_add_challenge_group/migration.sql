-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN "groupId" TEXT;

-- CreateIndex
CREATE INDEX "Challenge_groupId_idx" ON "Challenge"("groupId");
