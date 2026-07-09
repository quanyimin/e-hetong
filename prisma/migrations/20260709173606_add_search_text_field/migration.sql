-- AlterTable
ALTER TABLE "contracts" ADD COLUMN "search_text" TEXT;

-- CreateIndex
CREATE INDEX "contracts_search_text_idx" ON "contracts"("search_text");
