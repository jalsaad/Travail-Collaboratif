// Réseaux d'enseignement et pouvoirs organisateurs couverts par la
// plateforme, cités par leur nom.
//
// Les logos officiels qui défilaient ici ont été retirés : afficher la marque
// d'un réseau laisse croire à un partenariat ou à un aval de sa part, que rien
// n'établit. Les nommer dit la même chose — la plateforme les prend tous en
// charge — sans emprunter leur identité visuelle. Les fichiers restent dans
// public/ (*-logo-cropped.*), rien n'empêche d'y revenir.
const RESEAUX = [
  "Wallonie-Bruxelles Enseignement (WBE)",
  "CPEONS",
  "CECP",
  "FELSI",
  "AEBE",
  "SeGEC — Enseignement catholique",
  "ECIB",
];

export function ReseauxEnseignementSection() {
  return (
    <div className="mt-16 border-t border-stone-200 pt-8 text-center dark:border-stone-800">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
        Tous les réseaux d&apos;enseignement belges sont pris en charge
      </h2>
      <ul className="mt-5 flex flex-wrap justify-center gap-2">
        {RESEAUX.map((reseau) => (
          <li
            key={reseau}
            className="rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-sm text-stone-600 shadow-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
          >
            {reseau}
          </li>
        ))}
      </ul>
    </div>
  );
}
