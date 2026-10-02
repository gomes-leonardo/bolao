-- CreateTable
CREATE TABLE "matches" (
    "id" SERIAL NOT NULL,
    "external_id" INTEGER NOT NULL,
    "season" SMALLINT NOT NULL,
    "round" SMALLINT NOT NULL,
    "home_team_id" INTEGER NOT NULL,
    "away_team_id" INTEGER NOT NULL,
    "kickoff_at" TIMESTAMPTZ(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "home_score" SMALLINT,
    "away_score" SMALLINT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "matches_teams_differ" CHECK ("home_team_id" <> "away_team_id"),
    CONSTRAINT "matches_round_range" CHECK ("round" BETWEEN 1 AND 38),
    CONSTRAINT "matches_status_valid" CHECK ("status" IN ('scheduled', 'live', 'finished', 'postponed', 'cancelled')),
    CONSTRAINT "matches_scores_paired" CHECK (("home_score" IS NULL) = ("away_score" IS NULL)),
    CONSTRAINT "matches_scores_non_negative" CHECK ("home_score" >= 0 AND "away_score" >= 0),
    CONSTRAINT "matches_finished_has_score" CHECK ("status" <> 'finished' OR "home_score" IS NOT NULL)
);

-- CreateIndex
CREATE UNIQUE INDEX "matches_external_id_key" ON "matches"("external_id");

-- CreateIndex
CREATE INDEX "matches_season_round_idx" ON "matches"("season", "round");

-- CreateIndex
CREATE INDEX "matches_home_team_id_idx" ON "matches"("home_team_id");

-- CreateIndex
CREATE INDEX "matches_away_team_id_idx" ON "matches"("away_team_id");

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
