-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'SCANNED', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'INVITE_SALE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'INVITE_SALE_SCANNED';
ALTER TYPE "AuditAction" ADD VALUE 'INVITE_SALE_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'INVITE_SALE_CANCELLED';

-- CreateTable
CREATE TABLE "SaleInvite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "teamId" TEXT,
    "createdById" TEXT NOT NULL,
    "usedByUserId" TEXT,
    "scannedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SaleInvite_token_key" ON "SaleInvite"("token");

-- AddForeignKey
ALTER TABLE "SaleInvite" ADD CONSTRAINT "SaleInvite_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "SalesTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleInvite" ADD CONSTRAINT "SaleInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleInvite" ADD CONSTRAINT "SaleInvite_usedByUserId_fkey" FOREIGN KEY ("usedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
