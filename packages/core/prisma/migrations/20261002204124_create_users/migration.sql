-- Prisma não gerencia extensões sem o preview feature; criada à mão.
CREATE EXTENSION IF NOT EXISTS citext;

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    -- CHECKs não existem no schema.prisma; são mantidos só aqui.
    CONSTRAINT "users_name_not_blank" CHECK (btrim("name") <> ''),
    CONSTRAINT "users_email_has_at" CHECK (position('@' in "email") > 1)
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
