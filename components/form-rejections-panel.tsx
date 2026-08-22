import { prisma } from "@/lib/prisma";
import { Reveal } from "@/components/reveal";
import { FORM_CREATE_SCHOOL } from "@/lib/form-rejections";

const LIBELLES: Record<string, string> = {
  "creer-ecole": "Création d'école",
  "rejoindre-ecole": "Rattachement à une école",
};

// Les formulaires publics refusés ces trente derniers jours, groupés par motif.
//
// Un abandon d'inscription ne laisse aucune trace ailleurs : le serveur web ne
// voit qu'un code 200, indiscernable d'un envoi réussi. Ce panneau répond à la
// seule question qui compte quand personne ne s'inscrit — sont-ils bloqués, ou
// n'ont-ils pas essayé ?
export async function FormRejectionsPanel() {
  const depuis = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [motifs, total] = await Promise.all([
    prisma.formRejection.groupBy({
      by: ["form", "field", "reason"],
      where: { createdAt: { gte: depuis } },
      _count: true,
      _max: { createdAt: true },
      orderBy: { _count: { reason: "desc" } },
      take: 12,
    }),
    prisma.formRejection.count({ where: { createdAt: { gte: depuis } } }),
  ]);

  return (
    <Reveal delay={240} className="card p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          Formulaires refusés
        </h2>
        <span className="text-xs text-stone-400 dark:text-stone-500">30 derniers jours</span>
      </div>

      {total === 0 ? (
        <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
          Aucun refus enregistré. Si personne ne s&apos;inscrit malgré des visites, c&apos;est donc
          que le formulaire n&apos;a pas été envoyé — pas qu&apos;il a été rejeté.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            {total} envoi{total > 1 ? "s" : ""} rejeté{total > 1 ? "s" : ""} par la validation.
            Chaque ligne est une tentative arrêtée net : quelqu&apos;un a rempli le formulaire sans
            pouvoir aller au bout.
          </p>

          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-left text-xs font-semibold uppercase tracking-wide text-stone-400 dark:border-stone-800 dark:text-stone-500">
                <th className="pb-2 pr-3">Motif</th>
                <th className="pb-2 pr-3">Champ</th>
                <th className="pb-2 pr-3">Formulaire</th>
                <th className="pb-2 text-right">Fois</th>
              </tr>
            </thead>
            <tbody>
              {motifs.map((m) => (
                <tr
                  key={`${m.form}-${m.field}-${m.reason}`}
                  className="border-b border-stone-50 last:border-0 dark:border-stone-800"
                >
                  <td className="py-2 pr-3 text-stone-900 dark:text-stone-100">{m.reason}</td>
                  <td className="py-2 pr-3 text-xs text-stone-500 dark:text-stone-400">
                    {m.field ?? "—"}
                  </td>
                  <td className="py-2 pr-3 text-xs text-stone-500 dark:text-stone-400">
                    {LIBELLES[m.form] ?? m.form}
                  </td>
                  <td className="py-2 text-right font-semibold text-stone-900 dark:text-stone-100">
                    {m._count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {motifs.some((m) => m.form === FORM_CREATE_SCHOOL) && (
            <p className="mt-3 text-xs text-stone-400 dark:text-stone-500">
              Un motif qui revient sur la création d&apos;école mérite un correctif : chaque
              occurrence est une direction qui voulait s&apos;inscrire.
            </p>
          )}
        </>
      )}

      <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-400 dark:border-stone-800 dark:text-stone-500">
        Seuls les motifs sont conservés — jamais les valeurs saisies, ni l&apos;email, ni
        l&apos;adresse IP.
      </p>
    </Reveal>
  );
}
