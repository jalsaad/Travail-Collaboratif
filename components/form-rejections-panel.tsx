import { prisma } from "@/lib/prisma";
import { Reveal } from "@/components/reveal";
import { FORM_CREATE_SCHOOL, RETENTION_JOURS } from "@/lib/form-rejections";
import { FormRejectionFollowUp } from "@/components/form-rejection-follow-up";
import { APP_TIME_ZONE } from "@/lib/time-zone";

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

  // Les tentatives qu'on peut encore rattraper : celles qui portent de quoi
  // joindre la personne. Les non traitées d'abord — c'est la liste de travail,
  // pas un historique.
  const aRappeler = await prisma.formRejection.findMany({
    where: { createdAt: { gte: depuis }, OR: [{ email: { not: null } }, { fullName: { not: null } }] },
    orderBy: [{ contactedAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
    take: 25,
  });
  const quand = (d: Date) =>
    d.toLocaleDateString("fr-BE", {
      timeZone: APP_TIME_ZONE,
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

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

      {aRappeler.length > 0 && (
        <div className="mt-6 border-t border-stone-100 pt-4 dark:border-stone-800">
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            À recontacter
          </h3>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Chaque ligne est quelqu&apos;un qui a voulu s&apos;inscrire sans y parvenir. Un email
            suffit souvent à débloquer la situation.
          </p>

          <ul className="mt-3 space-y-3">
            {aRappeler.map((r) => (
              <li
                key={r.id}
                className={`rounded-lg border p-3 ${
                  r.contactedAt
                    ? "border-stone-100 bg-stone-50/60 dark:border-stone-800 dark:bg-stone-900/40"
                    : "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30"
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="text-sm font-medium text-stone-900 dark:text-stone-100">
                    {r.fullName ?? "Nom non saisi"}
                  </span>
                  <span className="text-xs text-stone-400 dark:text-stone-500">{quand(r.createdAt)}</span>
                </div>

                <p className="mt-0.5 text-xs text-stone-600 dark:text-stone-400">
                  {r.email ? (
                    <a
                      href={`mailto:${r.email}?subject=${encodeURIComponent("Votre inscription à Travail Collaboratif")}`}
                      className="font-medium text-brand-700 hover:underline dark:text-brand-400"
                    >
                      {r.email}
                    </a>
                  ) : (
                    "Email non saisi"
                  )}
                  {r.schoolName ? ` — ${r.schoolName}` : ""}
                </p>

                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  <span className="text-stone-900 dark:text-stone-100">{r.reason}</span>
                  {r.field ? ` (${r.field})` : ""} — {LIBELLES[r.form] ?? r.form}
                </p>

                {r.contactedAt && (
                  <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                    Traitée le {quand(r.contactedAt)}
                    {r.notes ? ` — ${r.notes}` : ""}
                  </p>
                )}

                <FormRejectionFollowUp
                  rejectionId={r.id}
                  contacted={r.contactedAt !== null}
                  notes={r.notes}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-400 dark:border-stone-800 dark:text-stone-500">
        Conservé : le motif, et les coordonnées déjà saisies dans le formulaire (email, nom,
        école), pour pouvoir rappeler la personne. Jamais le mot de passe, le matricule ni
        l&apos;adresse IP. Ces lignes s&apos;effacent après {RETENTION_JOURS} jours.
      </p>
    </Reveal>
  );
}
