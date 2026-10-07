CREATE TABLE "AlertLedgerEntry" (
  "id" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "grade" TEXT NOT NULL,
  "sources" JSONB NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL,
  "hash" TEXT NOT NULL,
  "prevHash" TEXT,
  CONSTRAINT "AlertLedgerEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AlertLedgerEntry_hash_key" ON "AlertLedgerEntry"("hash");
