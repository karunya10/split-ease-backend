/*
  Warnings:

  - You are about to drop the `Account` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Account" DROP CONSTRAINT "Account_userId_fkey";

-- AlterTable
ALTER TABLE "Settlement" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';

-- DropTable
DROP TABLE "public"."Account";
