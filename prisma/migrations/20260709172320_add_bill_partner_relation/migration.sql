-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_bills" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contract_id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "partner_id" TEXT,
    "title" TEXT,
    "amount" REAL NOT NULL DEFAULT 0,
    "paid_amount" REAL NOT NULL DEFAULT 0,
    "late_fee" REAL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "due_date" DATETIME,
    "paid_at" DATETIME,
    "remark" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "bills_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bills_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_bills" ("amount", "category", "contract_id", "created_at", "due_date", "id", "late_fee", "paid_amount", "paid_at", "partner_id", "remark", "status", "tenant_id", "title", "type", "updated_at") SELECT "amount", "category", "contract_id", "created_at", "due_date", "id", "late_fee", "paid_amount", "paid_at", "partner_id", "remark", "status", "tenant_id", "title", "type", "updated_at" FROM "bills";
DROP TABLE "bills";
ALTER TABLE "new_bills" RENAME TO "bills";
CREATE INDEX "bills_contract_id_idx" ON "bills"("contract_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
