// Options fermées pour School.niveaux (enum SchoolLevel) et
// School.typesEnseignement (enum EducationType) — partagées entre le
// formulaire admin (AdminSchoolEditForm) et le formulaire public de création
// d'école (CreateSchoolForm) pour éviter de dupliquer ces listes.

export const NIVEAU_OPTIONS: { value: "MATERNELLE" | "PRIMAIRE" | "SECONDAIRE"; label: string }[] = [
  { value: "MATERNELLE", label: "Maternelle" },
  { value: "PRIMAIRE", label: "Primaire" },
  { value: "SECONDAIRE", label: "Secondaire" },
];

export const TYPE_ENSEIGNEMENT_OPTIONS: { value: "ORDINAIRE" | "SPECIALISE"; label: string }[] = [
  { value: "ORDINAIRE", label: "Ordinaire" },
  { value: "SPECIALISE", label: "Spécialisé" },
];
