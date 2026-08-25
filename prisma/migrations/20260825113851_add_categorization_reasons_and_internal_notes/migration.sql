-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "categoryReasons" JSONB;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "isInternal" BOOLEAN NOT NULL DEFAULT false;
