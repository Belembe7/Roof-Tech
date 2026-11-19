/*
  Warnings:

  - Added the required column `file_size` to the `verification_documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mime_type` to the `verification_documents` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "verification_documents" ADD COLUMN     "file_size" INTEGER NOT NULL,
ADD COLUMN     "mime_type" VARCHAR(100) NOT NULL;
