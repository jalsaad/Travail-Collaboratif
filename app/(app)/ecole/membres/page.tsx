import { redirect } from "next/navigation";

// La liste des membres est fondue dans le tableau de bord (cf. app/(app)/ecole/page.tsx).
// La page est conservée en redirection : les notifications de rattachement déjà
// envoyées pointent vers /ecole/membres, et la fiche d'un membre reste servie
// par la route enfant /ecole/membres/[membershipId].
export default function MembresPage() {
  redirect("/ecole");
}
