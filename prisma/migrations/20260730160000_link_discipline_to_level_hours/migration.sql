-- La discipline se rattache désormais à chaque ligne niveau/heures
-- (MembershipLevelHours), pas à la Membership globalement : un enseignant
-- peut donner des disciplines différentes selon le niveau, y compris
-- plusieurs disciplines dans le MÊME niveau (plusieurs lignes de même
-- niveau, discipline différente).

-- AddColumn (nullable dans un premier temps pour permettre le backfill)
ALTER TABLE "membership_level_hours" ADD COLUMN "disciplineId" TEXT;

-- Backfill : reprend l'unique discipline déjà déclarée au niveau de la
-- Membership (l'ancien modèle n'en autorisait qu'une par membership dans les
-- faits, cf. prisma/seed.ts et lib/announcements.ts avant cette migration).
UPDATE "membership_level_hours" AS mlh
SET "disciplineId" = (
  SELECT md."disciplineId"
  FROM "membership_disciplines" AS md
  WHERE md."membershipId" = mlh."membershipId"
  LIMIT 1
);

-- Rend la colonne obligatoire — échoue explicitement s'il restait une ligne
-- non rattachée à une discipline plutôt que de silencieusement en perdre.
ALTER TABLE "membership_level_hours" ALTER COLUMN "disciplineId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "membership_level_hours" ADD CONSTRAINT "membership_level_hours_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "disciplines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex (autorise le même niveau plusieurs fois, tant que la
-- discipline diffère — empêche seulement le doublon exact niveau+discipline)
CREATE UNIQUE INDEX "membership_level_hours_membershipId_level_disciplineId_key" ON "membership_level_hours"("membershipId", "level", "disciplineId");

-- DropTable (remplacée par la relation ci-dessus)
DROP TABLE "membership_disciplines";
