import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Reveal } from "@/components/reveal";
import { CartographieRow } from "@/components/cartographie-row";
import { BelgiumSchoolsMap, type BassinNode } from "@/components/belgium-schools-map";
import { PROSPECTION_STATUSES } from "@/lib/prospection-labels";
import type { Prisma, ProspectionStatus } from "@prisma/client";

const PAR_PAGE = 50;

// Cartographie des écoles de la Fédération : lesquelles ont rejoint la
// plateforme, lesquelles restent à convaincre.
//
// L'annuaire (fwb_schools) et les écoles inscrites (schools) sont deux tables
// sans relation Prisma — leur seul lien est le numéro FASE. Le rapprochement se
// fait donc ici, en chargeant les numéros des écoles inscrites : elles se
// comptent en dizaines, jamais en milliers, et cet ensemble sert aussi bien à
// filtrer qu'à marquer les lignes.
export default async function AdminCartographiePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const recherche = (params.q ?? "").trim();
  const reseau = params.reseau ?? "";
  const bassin = params.bassin ?? "";
  const inscription = params.inscription ?? "";
  const suivi = params.suivi ?? "";
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  const inscrites = await prisma.school.findMany({
    where: { numeroFase: { not: null } },
    select: { numeroFase: true, name: true, status: true },
  });
  const inscritesParFase = new Map(inscrites.map((e) => [e.numeroFase!, e]));
  const fasesInscrites = [...inscritesParFase.keys()];

  const where: Prisma.FwbSchoolWhereInput = {
    ...(recherche
      ? {
          OR: [
            { name: { contains: recherche, mode: "insensitive" } },
            { commune: { contains: recherche, mode: "insensitive" } },
            { locality: { contains: recherche, mode: "insensitive" } },
            { numeroFase: { startsWith: recherche } },
            { postalCode: { startsWith: recherche } },
          ],
        }
      : {}),
    ...(reseau ? { reseau } : {}),
    ...(bassin ? { bassin } : {}),
    ...(suivi ? { prospectionStatus: suivi as ProspectionStatus } : {}),
    ...(inscription === "inscrites" ? { numeroFase: { in: fasesInscrites } } : {}),
    ...(inscription === "absentes" ? { numeroFase: { notIn: fasesInscrites } } : {}),
  };

  const [total, totalFiltre, ecoles, parReseau, parBassin, parSuivi, carteEcoles] = await Promise.all([
    prisma.fwbSchool.count(),
    prisma.fwbSchool.count({ where }),
    prisma.fwbSchool.findMany({
      where,
      orderBy: [{ name: "asc" }],
      skip: (page - 1) * PAR_PAGE,
      take: PAR_PAGE,
    }),
    prisma.fwbSchool.groupBy({ by: ["reseau"], _count: true, orderBy: { reseau: "asc" } }),
    prisma.fwbSchool.groupBy({ by: ["bassin"], _count: true, orderBy: { bassin: "asc" } }),
    prisma.fwbSchool.groupBy({ by: ["prospectionStatus"], _count: true }),
    // Carte : jeu global (non filtré par le formulaire ci-dessous), comme les
    // tuiles de stats — un résumé stable, la table reste seule à varier avec
    // les filtres. Les écoles individuelles servent de troisième niveau de
    // zoom (bassin → commune → école) ; leur nombre (quelques milliers, peu
    // de colonnes) rend un agrégat SQL inutile, on le fait ici en mémoire.
    prisma.fwbSchool.findMany({
      where: { bassin: { not: null }, commune: { not: null }, latitude: { not: null }, longitude: { not: null } },
      select: { numeroFase: true, name: true, bassin: true, commune: true, latitude: true, longitude: true },
    }),
  ]);

  // Le nombre d'écoles inscrites qui figurent réellement dans l'annuaire : une
  // école à programme belge à l'étranger n'a pas de numéro FASE et ne relève
  // pas de ce référentiel.
  const inscritesConnues = await prisma.fwbSchool.count({ where: { numeroFase: { in: fasesInscrites } } });
  const couverture = total > 0 ? (inscritesConnues / total) * 100 : 0;
  const pages = Math.max(1, Math.ceil(totalFiltre / PAR_PAGE));

  // Assemblage de la carte : bassin → commune → école, un seul passage sur
  // les écoles chargées ci-dessus. « Hors zones » n'est pas un bassin
  // géographique réel (cf. lib/fwb-directory.ts ZONES, qui ne lui trouve
  // aucun équivalent numéroté) : son centroïde n'a pas de sens sur une carte
  // et tombe par coïncidence en plein centre du pays, on l'exclut donc ici.
  const fasesInscritesSet = new Set(fasesInscrites);
  type Accumulateur = { sumLat: number; sumLng: number; recensees: number; inscrites: number };
  const bassinsAcc = new Map<string, Accumulateur & { communes: Map<string, Accumulateur & { schools: typeof carteEcoles }> }>();
  for (const ecole of carteEcoles) {
    const bassin = ecole.bassin!;
    if (bassin === "Hors zones") continue;
    const commune = ecole.commune!;
    const inscrite = fasesInscritesSet.has(ecole.numeroFase) ? 1 : 0;

    if (!bassinsAcc.has(bassin)) bassinsAcc.set(bassin, { sumLat: 0, sumLng: 0, recensees: 0, inscrites: 0, communes: new Map() });
    const b = bassinsAcc.get(bassin)!;
    b.sumLat += ecole.latitude!;
    b.sumLng += ecole.longitude!;
    b.recensees += 1;
    b.inscrites += inscrite;

    if (!b.communes.has(commune)) b.communes.set(commune, { sumLat: 0, sumLng: 0, recensees: 0, inscrites: 0, schools: [] });
    const c = b.communes.get(commune)!;
    c.sumLat += ecole.latitude!;
    c.sumLng += ecole.longitude!;
    c.recensees += 1;
    c.inscrites += inscrite;
    c.schools.push(ecole);
  }
  const carteBassins: BassinNode[] = [...bassinsAcc.entries()].map(([bassin, b]) => ({
    bassin,
    lat: b.sumLat / b.recensees,
    lng: b.sumLng / b.recensees,
    recensees: b.recensees,
    inscrites: b.inscrites,
    communes: [...b.communes.entries()].map(([commune, c]) => ({
      commune,
      lat: c.sumLat / c.recensees,
      lng: c.sumLng / c.recensees,
      recensees: c.recensees,
      inscrites: c.inscrites,
      schools: c.schools.map((ecole) => ({
        numeroFase: ecole.numeroFase,
        name: ecole.name,
        lat: ecole.latitude!,
        lng: ecole.longitude!,
        inscrite: fasesInscritesSet.has(ecole.numeroFase),
      })),
    })),
  }));

  const lien = (modifs: Record<string, string>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q: recherche, reseau, bassin, inscription, suivi, ...modifs })) {
      if (v) p.set(k, v);
    }
    const q = p.toString();
    return `/admin/cartographie${q ? `?${q}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">Cartographie</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Les {total.toLocaleString("fr-BE")} écoles de l&apos;annuaire officiel de la Fédération
          Wallonie-Bruxelles, inscrites ou non sur la plateforme.
        </p>
      </div>

      {/* Repliée par défaut : la table ci-dessous reste l'entrée principale
          de la page, la carte est une vue complémentaire qu'on déploie au
          besoin plutôt qu'un bloc imposé en haut de chaque visite. */}
      <details className="group">
        <summary className="flex list-none cursor-pointer items-center gap-2 text-base font-semibold tracking-tight text-stone-900 [&::-webkit-details-marker]:hidden dark:text-stone-100">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-brand-600 to-brand-teal text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
              />
            </svg>
          </span>
          Carte des écoles
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-4 w-4 shrink-0 text-stone-400 transition-transform group-open:rotate-180 dark:text-stone-500"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <Reveal delay={0} className="mt-3">
          <BelgiumSchoolsMap bassins={carteBassins} />
        </Reveal>
      </details>

      <Reveal delay={80} className="card grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
        <div>
          <p className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            {total.toLocaleString("fr-BE")}
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400">écoles recensées</p>
        </div>
        <div>
          <p className="text-2xl font-semibold tracking-tight text-emerald-700 dark:text-emerald-400">
            {inscritesConnues}
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400">inscrites</p>
        </div>
        <div>
          <p className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            {(total - inscritesConnues).toLocaleString("fr-BE")}
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400">pas encore inscrites</p>
        </div>
        <div>
          <p className="text-2xl font-semibold tracking-tight text-brand-700 dark:text-brand-400">
            {couverture.toLocaleString("fr-BE", { maximumFractionDigits: 2 })} %
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400">de couverture</p>
        </div>
      </Reveal>

      <Reveal delay={160} className="card p-5">
        {/* Filtres en GET : l'état de la recherche vit dans l'URL, donc une
            vue filtrée se met en signet et se partage. */}
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="q" className="block text-xs font-medium text-stone-500 dark:text-stone-400">
              Nom, commune, code postal ou FASE
            </label>
            <input id="q" name="q" defaultValue={recherche} className="input-field mt-1" />
          </div>
          <div>
            <label htmlFor="reseau" className="block text-xs font-medium text-stone-500 dark:text-stone-400">
              Réseau
            </label>
            <select id="reseau" name="reseau" defaultValue={reseau} className="input-field mt-1">
              <option value="">Tous</option>
              {parReseau.map((r) => (
                <option key={r.reseau} value={r.reseau}>
                  {r.reseau} ({r._count})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="bassin" className="block text-xs font-medium text-stone-500 dark:text-stone-400">
              Bassin
            </label>
            <select id="bassin" name="bassin" defaultValue={bassin} className="input-field mt-1">
              <option value="">Tous</option>
              {parBassin.map((b) => (
                <option key={b.bassin ?? ""} value={b.bassin ?? ""}>
                  {b.bassin ?? "—"} ({b._count})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="inscription" className="block text-xs font-medium text-stone-500 dark:text-stone-400">
              Sur la plateforme
            </label>
            <select id="inscription" name="inscription" defaultValue={inscription} className="input-field mt-1">
              <option value="">Toutes</option>
              <option value="inscrites">Inscrites</option>
              <option value="absentes">Pas encore</option>
            </select>
          </div>
          <div>
            <label htmlFor="suivi" className="block text-xs font-medium text-stone-500 dark:text-stone-400">
              Suivi
            </label>
            <select id="suivi" name="suivi" defaultValue={suivi} className="input-field mt-1">
              <option value="">Tous</option>
              {PROSPECTION_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label} ({parSuivi.find((x) => x.prospectionStatus === s.value)?._count ?? 0})
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary">
            Filtrer
          </button>
          <Link
            href="/admin/cartographie"
            className="rounded-lg px-3 py-2 text-sm text-stone-500 underline transition hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
          >
            Réinitialiser
          </Link>
        </form>
      </Reveal>

      <Reveal delay={240} className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50/70 text-left text-xs font-semibold uppercase tracking-wide text-stone-400 dark:border-stone-800 dark:bg-stone-800/50 dark:text-stone-500">
              <th className="px-5 py-3">École</th>
              <th className="px-5 py-3">FASE</th>
              <th className="px-5 py-3">Réseau</th>
              <th className="px-5 py-3">Localité</th>
              <th className="px-5 py-3">Bassin</th>
              <th className="px-5 py-3">Plateforme</th>
              <th className="px-5 py-3">Suivi</th>
            </tr>
          </thead>
          <tbody>
            {ecoles.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-stone-400 dark:text-stone-500">
                  Aucune école ne correspond à ces critères.
                </td>
              </tr>
            )}
            {ecoles.map((ecole) => (
              <CartographieRow
                key={ecole.numeroFase}
                ecole={{
                  numeroFase: ecole.numeroFase,
                  name: ecole.name,
                  reseau: ecole.reseau,
                  postalCode: ecole.postalCode,
                  locality: ecole.locality,
                  commune: ecole.commune,
                  bassin: ecole.bassin,
                  address: ecole.address,
                  implantationCount: ecole.implantationCount,
                  poName: ecole.poName,
                  emailDirection: ecole.emailDirection,
                  poEmail: ecole.poEmail,
                  phone: ecole.phone,
                  website: ecole.website,
                  prospectionStatus: ecole.prospectionStatus,
                  lastContactedAt: ecole.lastContactedAt?.toISOString().slice(0, 10) ?? "",
                  notes: ecole.notes,
                }}
                inscrite={inscritesParFase.get(ecole.numeroFase) ?? null}
              />
            ))}
          </tbody>
        </table>
      </Reveal>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-stone-500 dark:text-stone-400">
          <span>
            {totalFiltre.toLocaleString("fr-BE")} école(s) — page {page} sur {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={lien({ page: String(page - 1) })} className="rounded-lg border border-stone-300 px-3 py-1.5 transition hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800">
                Précédente
              </Link>
            )}
            {page < pages && (
              <Link href={lien({ page: String(page + 1) })} className="rounded-lg border border-stone-300 px-3 py-1.5 transition hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800">
                Suivante
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
