/*
  Warnings:

  - Added the required column `itemsTotal` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentMethod` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shipCity` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shipCountry` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shipFullName` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shipPhone` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shipStreet` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shipping` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'CASH');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "addressId" TEXT,
ADD COLUMN     "itemsTotal" INTEGER NOT NULL,
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL,
ADD COLUMN     "shipCity" TEXT NOT NULL,
ADD COLUMN     "shipCountry" TEXT NOT NULL,
ADD COLUMN     "shipFullName" TEXT NOT NULL,
ADD COLUMN     "shipPhone" TEXT NOT NULL,
ADD COLUMN     "shipStreet" TEXT NOT NULL,
ADD COLUMN     "shipping" INTEGER NOT NULL,
ADD COLUMN     "tax" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
