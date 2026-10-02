-- CreateTable
CREATE TABLE "pools" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "invite_code" TEXT NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "season" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "pools_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pools_name_not_blank" CHECK (btrim("name") <> ''),
    CONSTRAINT "pools_invite_code_format" CHECK ("invite_code" ~ '^[A-Z0-9]{8}$')
);

-- CreateIndex
CREATE UNIQUE INDEX "pools_invite_code_key" ON "pools"("invite_code");

-- CreateIndex
CREATE INDEX "pools_owner_id_idx" ON "pools"("owner_id");

-- AddForeignKey
ALTER TABLE "pools" ADD CONSTRAINT "pools_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
