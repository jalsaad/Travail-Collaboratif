-- Adresse à laquelle le lien de parrainage a été envoyé.
--
-- Nullable, et SANS reprise des lignes existantes : l'adresse n'était jusqu'ici
-- pas conservée, elle n'existe donc nulle part pour les parrainages déjà émis.
-- Ceux-là ne peuvent être rattachés que par leur auteur, en rééditant la
-- période pour y cocher la personne (cf. app/(app)/mes-periodes/actions.ts).
ALTER TABLE "peer_referrals" ADD COLUMN "invitedEmail" TEXT;
