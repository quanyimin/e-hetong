-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "phone" TEXT,
    "wechat_openid" TEXT,
    "name" TEXT,
    "avatar_url" TEXT,
    "member_level" TEXT NOT NULL DEFAULT 'free',
    "member_expire_at" DATETIME,
    "role" TEXT NOT NULL DEFAULT 'user',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "invite_code" TEXT,
    "invited_by" TEXT,
    "contract_bonus" INTEGER NOT NULL DEFAULT 0,
    "total_earned" REAL NOT NULL DEFAULT 0,
    "withdrawable" REAL NOT NULL DEFAULT 0,
    "distributor_level" TEXT NOT NULL DEFAULT 'none',
    "distributor_since" DATETIME,
    "distributor_expire" DATETIME,
    "vip_months" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "users_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PERSONAL',
    "sceneType" TEXT NOT NULL DEFAULT 'GENERAL',
    "industry" TEXT,
    "industry_version_id" TEXT,
    "planId" TEXT,
    "owner_id" TEXT NOT NULL,
    "credit_code" TEXT,
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "tenants_industry_version_id_fkey" FOREIGN KEY ("industry_version_id") REFERENCES "industry_versions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_tenant_roles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "joined_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_tenant_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_tenant_roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tenant_enabled_scenes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "scene_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenant_enabled_scenes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "industry_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT DEFAULT 'LayoutDashboard',
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "config" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "industry_version_scenes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version_id" TEXT NOT NULL,
    "scene_id" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "industry_version_scenes_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "industry_versions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "industry_version_scenes_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "industry_scenes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "industry_scenes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "route" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "plugin_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "personal_spaces" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "default_tenant_id" TEXT,
    "quick_templates" TEXT,
    "custom_keywords" TEXT,
    "recent_contracts" TEXT,
    "pinned_contracts" TEXT,
    "preferences" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "personal_spaces_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "plugin_definitions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT DEFAULT 'Puzzle',
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "type" TEXT NOT NULL DEFAULT 'INDUSTRY',
    "scene_id" TEXT,
    "config_schema" TEXT,
    "entry_point" TEXT,
    "api_endpoint" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "price" REAL NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "plugin_definitions_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "industry_scenes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "contract_folders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "contract_folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "contract_folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "contract_folders" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "distributor_customers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "distributor_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "relationType" TEXT NOT NULL DEFAULT 'customer',
    "commission_rate" REAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "distributor_customers_distributor_id_fkey" FOREIGN KEY ("distributor_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "distributor_customers_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "distributor_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "order_amount" REAL NOT NULL,
    "commission_rate" REAL NOT NULL,
    "commission_amt" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "settled_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "commissions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "commissions_distributor_id_fkey" FOREIGN KEY ("distributor_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "commissions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "bank_name" TEXT,
    "bank_account" TEXT,
    "account_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "remark" TEXT,
    "approved_at" DATETIME,
    "completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "withdrawals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "party_a" TEXT,
    "party_b" TEXT,
    "amount" REAL,
    "start_date" DATETIME,
    "end_date" DATETIME,
    "file_url" TEXT,
    "file_type" TEXT,
    "ocr_text" TEXT,
    "parsed_data" TEXT,
    "parse_status" TEXT NOT NULL DEFAULT 'pending',
    "tags" TEXT,
    "keywords" TEXT,
    "summary" TEXT,
    "riskAlerts" TEXT,
    "keyClauses" TEXT,
    "remark" TEXT,
    "folder_id" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "tenant_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "financial_type" TEXT,
    "category" TEXT,
    "partner_id" TEXT,
    "scene_config" TEXT,
    "direction" TEXT,
    "source" TEXT,
    CONSTRAINT "contracts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "contracts_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "contract_folders" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "contracts_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contract_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "remind_at" DATETIME NOT NULL,
    "remind_type" TEXT NOT NULL DEFAULT 'expire',
    "title" TEXT,
    "message" TEXT,
    "send_status" TEXT NOT NULL DEFAULT 'pending',
    "sent_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenant_id" TEXT,
    CONSTRAINT "reminders_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "price" REAL NOT NULL DEFAULT 0,
    "description" TEXT,
    "features" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "remark" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "partners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bills" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contract_id" TEXT NOT NULL,
    "tenant_id" TEXT,
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
    CONSTRAINT "bills_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "order_no" TEXT NOT NULL,
    "plan_type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "payment_method" TEXT,
    "payment_status" TEXT NOT NULL DEFAULT 'pending',
    "paid_at" DATETIME,
    "expire_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_wechat_openid_key" ON "users"("wechat_openid");

-- CreateIndex
CREATE UNIQUE INDEX "users_invite_code_key" ON "users"("invite_code");

-- CreateIndex
CREATE UNIQUE INDEX "user_tenant_roles_user_id_tenant_id_key" ON "user_tenant_roles"("user_id", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_enabled_scenes_tenant_id_scene_id_key" ON "tenant_enabled_scenes"("tenant_id", "scene_id");

-- CreateIndex
CREATE UNIQUE INDEX "industry_versions_code_key" ON "industry_versions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "industry_version_scenes_version_id_scene_id_key" ON "industry_version_scenes"("version_id", "scene_id");

-- CreateIndex
CREATE UNIQUE INDEX "industry_scenes_code_key" ON "industry_scenes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "personal_spaces_user_id_key" ON "personal_spaces"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "plugin_definitions_code_key" ON "plugin_definitions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "contract_folders_user_id_name_key" ON "contract_folders"("user_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "distributor_customers_distributor_id_customer_id_key" ON "distributor_customers"("distributor_id", "customer_id");

-- CreateIndex
CREATE INDEX "commissions_distributor_id_idx" ON "commissions"("distributor_id");

-- CreateIndex
CREATE INDEX "commissions_order_id_idx" ON "commissions"("order_id");

-- CreateIndex
CREATE INDEX "commissions_status_idx" ON "commissions"("status");

-- CreateIndex
CREATE INDEX "withdrawals_user_id_idx" ON "withdrawals"("user_id");

-- CreateIndex
CREATE INDEX "withdrawals_status_idx" ON "withdrawals"("status");

-- CreateIndex
CREATE INDEX "contracts_user_id_idx" ON "contracts"("user_id");

-- CreateIndex
CREATE INDEX "contracts_folder_id_idx" ON "contracts"("folder_id");

-- CreateIndex
CREATE INDEX "contracts_parse_status_idx" ON "contracts"("parse_status");

-- CreateIndex
CREATE INDEX "contracts_created_at_idx" ON "contracts"("created_at");

-- CreateIndex
CREATE INDEX "contracts_end_date_idx" ON "contracts"("end_date");

-- CreateIndex
CREATE INDEX "contracts_tenant_id_idx" ON "contracts"("tenant_id");

-- CreateIndex
CREATE INDEX "contracts_status_idx" ON "contracts"("status");

-- CreateIndex
CREATE INDEX "reminders_user_id_idx" ON "reminders"("user_id");

-- CreateIndex
CREATE INDEX "reminders_remind_at_idx" ON "reminders"("remind_at");

-- CreateIndex
CREATE INDEX "reminders_send_status_idx" ON "reminders"("send_status");

-- CreateIndex
CREATE INDEX "reminders_tenant_id_idx" ON "reminders"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");

-- CreateIndex
CREATE INDEX "partners_user_id_idx" ON "partners"("user_id");

-- CreateIndex
CREATE INDEX "bills_contract_id_idx" ON "bills"("contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_no_key" ON "orders"("order_no");

-- CreateIndex
CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");

-- CreateIndex
CREATE INDEX "orders_order_no_idx" ON "orders"("order_no");

-- CreateIndex
CREATE INDEX "orders_payment_status_idx" ON "orders"("payment_status");
