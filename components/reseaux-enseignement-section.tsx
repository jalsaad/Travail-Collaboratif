// Une seule affirmation, sans nommer personne.
//
// Cette section a d'abord fait défiler les logos officiels des réseaux, puis
// leurs noms. Les deux ont été retirés : afficher la marque d'un réseau — ou
// même son nom dans une liste de ce qui est « pris en charge » — laisse croire
// à un partenariat ou à un aval de sa part, que rien n'établit. La couverture
// se dit sans citer qui que ce soit. Les fichiers des logos restent dans
// public/ (*-logo-cropped.*).
export function ReseauxEnseignementSection() {
  return (
    <div className="mt-16 border-t border-stone-200 pt-8 text-center dark:border-stone-800">
      <p className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
        Tous les réseaux d&apos;enseignement belges sont pris en charge
      </p>
      <p className="mx-auto mt-2 max-w-xl text-sm text-stone-500 dark:text-stone-400">
        Ordinaire et spécialisé, du maternel au secondaire, quel que soit le pouvoir organisateur.
      </p>
    </div>
  );
}
