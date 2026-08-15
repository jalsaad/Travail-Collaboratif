import { redirect } from "next/navigation";

// L'avancement de chaque enseignant·e et la moyenne d'équipe sont affichés
// dans le tableau de bord (cf. app/(app)/ecole/page.tsx) ; la redirection tient
// lieu de passerelle pour les liens et signets existants.
export default function EcoleStatistiquesPage() {
  redirect("/ecole");
}
