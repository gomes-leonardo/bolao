-- CreateTable
CREATE TABLE "teams" (
    "id" SERIAL NOT NULL,
    "external_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "tla" CHAR(3) NOT NULL,
    "crest_url" TEXT,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "teams_tla_format" CHECK ("tla" ~ '^[A-Z0-9]{3}$')
);

-- CreateIndex
CREATE UNIQUE INDEX "teams_external_id_key" ON "teams"("external_id");
