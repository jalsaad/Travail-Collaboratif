-- La discipline est désormais choisie dans le référentiel FWB officiel
-- (cf. lib/disciplines.ts) plutôt que saisie en texte libre : le code de la
-- fonction devient la clé stable, le libellé n'est plus une contrainte
-- d'unicité (deux fonctions distinctes — ex: Français DI / DS — peuvent
-- légitimement partager le même libellé usuel).

-- DropIndex
DROP INDEX "disciplines_name_key";

-- AlterTable
ALTER TABLE "disciplines" ADD COLUMN "code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "disciplines_code_key" ON "disciplines"("code");
