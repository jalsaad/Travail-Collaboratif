"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BELGIUM_PROVINCES } from "@/lib/belgium-provinces-geo";

// Grandes villes de Wallonie et de Bruxelles, pour repère géographique sur la
// vue d'ensemble — simple étiquette de fond, sans lien avec les données
// (bassins/communes/écoles) qui, elles, viennent toutes de FwbSchool.
const MAJOR_CITIES: { name: string; lat: number; lng: number }[] = [
  { name: "Bruxelles", lat: 50.8503, lng: 4.3517 },
  { name: "Liège", lat: 50.6326, lng: 5.5797 },
  { name: "Charleroi", lat: 50.4108, lng: 4.4446 },
  { name: "Namur", lat: 50.4669, lng: 4.8675 },
  { name: "Mons", lat: 50.4542, lng: 3.9523 },
  { name: "Tournai", lat: 50.6053, lng: 3.3888 },
  { name: "Verviers", lat: 50.5896, lng: 5.8623 },
  { name: "La Louvière", lat: 50.4795, lng: 4.1889 },
  { name: "Wavre", lat: 50.7167, lng: 4.6114 },
  { name: "Arlon", lat: 49.6833, lng: 5.8167 },
  { name: "Nivelles", lat: 50.5983, lng: 4.3247 },
];

export type SchoolPoint = {
  numeroFase: string;
  name: string;
  lat: number;
  lng: number;
  inscrite: boolean;
};

export type CommuneNode = {
  commune: string;
  lat: number;
  lng: number;
  recensees: number;
  inscrites: number;
  schools: SchoolPoint[];
};

export type BassinNode = {
  bassin: string;
  lat: number;
  lng: number;
  recensees: number;
  inscrites: number;
  communes: CommuneNode[];
};

const MIN_BASSIN_SIZE = 40;
const MAX_BASSIN_SIZE = 116;
const MIN_COMMUNE_SIZE = 22;
const MAX_COMMUNE_SIZE = 60;
const SCHOOL_DOT_SIZE = 16;

function bubbleSize(count: number, maxCount: number, min: number, max: number) {
  if (maxCount <= 0) return min;
  const t = Math.sqrt(count) / Math.sqrt(maxCount);
  return min + t * (max - min);
}

type Point = { left: number; top: number };
type Project = (lat: number, lng: number) => Point;

// Écarte un point de `origin` d'un facteur `scale` — le même calcul qu'un
// `transform: scale()` CSS centré sur `origin`, mais fait en JS et appliqué
// directement au `left/top` (en %) de chaque bulle. Contrairement à un
// transform CSS ambiant, ça n'affecte JAMAIS leur taille (fixe, en pixels) :
// pas de compensation à faire, et la position finale est exactement celle
// utilisée pour la vérification anti-rognage ci-dessous, sans composition de
// transforms imbriqués à reconstituer mentalement.
function spread(point: Point, origin: Point, scale: number): Point {
  return {
    left: origin.left + (point.left - origin.left) * scale,
    top: origin.top + (point.top - origin.top) * scale,
  };
}

// Facteur qui écarte visuellement un point d'ancrage de ses enfants les plus
// éloignés : un groupe étendu (peu de zoom nécessaire) contre un groupe
// compact (beaucoup de zoom nécessaire). `origin` et `children` doivent être
// exprimés dans le même repère que celui où le zoom sera réellement rendu
// (après un éventuel écart déjà appliqué au niveau parent), sans quoi la
// vérification anti-rognage ci-dessous porterait sur le mauvais cadre.
function computeZoomScale(origin: Point, children: Point[], maxScale: number) {
  const withDist = children
    .map((p) => ({ p, dist: Math.hypot(p.left - origin.left, p.top - origin.top) }))
    .sort((a, b) => a.dist - b.dist);
  // Le 90ᵉ centile plutôt que le vrai maximum, pour la cible de zoom ET pour
  // la marge anti-rognage : l'annuaire contient occasionnellement une ligne
  // mal géocodée (coordonnées très éloignées du reste de sa commune). Un
  // seul point aberrant ne doit pas, à lui seul, empêcher de zoomer sur tous
  // les autres ni les serrer contre le bord pour lui laisser de la place —
  // tant pis s'il finit rogné hors cadre, ses coordonnées ne sont de toute
  // façon pas fiables.
  const trustedCount = Math.max(1, Math.ceil(withDist.length * 0.9));
  const trusted = withDist.slice(0, trustedCount).map((x) => x.p);
  const targetDist = Math.max(4, withDist[trustedCount - 1]?.dist ?? 4);
  const desired = Math.max(1.5, 32 / targetDist);

  // Écarter magnifie tout AUTOUR du point d'ancrage : un enfant du côté où
  // l'ancrage est déjà proche du bord du cadre dispose de moins de marge que
  // du côté opposé. Sans cette limite, un facteur pensé seulement pour
  // séparer les enfants peut en pousser certains hors du cadre visible
  // (rognés par overflow-hidden, donc plus cliquables).
  const margin = 6;
  let clipLimit = Infinity;
  for (const p of trusted) {
    const dx = p.left - origin.left;
    const dy = p.top - origin.top;
    if (dx > 0) clipLimit = Math.min(clipLimit, (100 - margin - origin.left) / dx);
    else if (dx < 0) clipLimit = Math.min(clipLimit, (origin.left - margin) / -dx);
    if (dy > 0) clipLimit = Math.min(clipLimit, (100 - margin - origin.top) / dy);
    else if (dy < 0) clipLimit = Math.min(clipLimit, (origin.top - margin) / -dy);
  }

  return Math.min(maxScale, desired, Math.max(1, clipLimit));
}

// Carte des écoles recensées/inscrites, sans dépendance externe : les bulles
// (bassin, puis commune, puis école) sont positionnées à leurs coordonnées
// réelles (FwbSchool.latitude/longitude) dans un même espace de coordonnées
// (en %). Zoomer sur un point écarte ses enfants de ce point (fonction
// `spread`, animée via une transition CSS sur left/top) plutôt que
// d'appliquer un `transform: scale()` ambiant — qui grossirait aussi la
// taille des bulles et compliquerait la vérification anti-rognage. Le
// contour des provinces (lib/belgium-provinces-geo, simple repère visuel)
// est projeté avec la même fonction, sans lien avec les bassins de la FWB.
export function BelgiumSchoolsMap({ bassins }: { bassins: BassinNode[] }) {
  const [selectedBassin, setSelectedBassin] = useState<string | null>(null);
  const [selectedCommune, setSelectedCommune] = useState<string | null>(null);

  const project = useMemo<Project>(() => {
    const points = BELGIUM_PROVINCES.flatMap((p) => p.rings.flatMap((ring) => ring.map(([lat, lng]) => ({ lat, lng }))));
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    // Correction en cosinus de la latitude moyenne : à cette latitude, un
    // degré de longitude couvre moins de distance qu'un degré de latitude.
    const cosMid = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);

    const padLat = (maxLat - minLat) * 0.06 || 1;
    const padLng = (maxLng - minLng) * 0.06 || 1;
    const latSpan = maxLat - minLat + padLat * 2 || 1;
    const lngSpan = (maxLng - minLng + padLng * 2) * cosMid || 1;

    return (lat: number, lng: number) => ({
      left: (((lng - minLng + padLng) * cosMid) / lngSpan) * 100,
      top: ((maxLat + padLat - lat) / latSpan) * 100,
    });
  }, []);

  const provincePaths = useMemo(
    () =>
      BELGIUM_PROVINCES.map((p) => ({
        id: p.id,
        d: p.rings
          .map((ring) => {
            const pts = ring.map(([lat, lng]) => project(lat, lng));
            return "M" + pts.map((pt) => `${pt.left},${pt.top}`).join("L") + "Z";
          })
          .join(" "),
      })),
    [project]
  );

  const bassinsSorted = useMemo(() => [...bassins].sort((a, b) => b.recensees - a.recensees), [bassins]);
  const maxBassinCount = Math.max(1, ...bassins.map((b) => b.recensees));

  const selectedBassinNode = bassins.find((b) => b.bassin === selectedBassin) ?? null;
  const communesSorted = useMemo(
    () => (selectedBassinNode ? [...selectedBassinNode.communes].sort((a, b) => b.recensees - a.recensees) : []),
    [selectedBassinNode]
  );
  const maxCommuneCount = Math.max(1, ...communesSorted.map((c) => c.recensees));

  const selectedCommuneNode = selectedBassinNode?.communes.find((c) => c.commune === selectedCommune) ?? null;

  // Écart bassin → commune : calculé sur les positions projetées brutes
  // (avant tout écart), puisque c'est le premier niveau appliqué.
  const bassinOrigin = selectedBassinNode ? project(selectedBassinNode.lat, selectedBassinNode.lng) : null;
  const bassinZoomScale =
    bassinOrigin && selectedBassinNode
      ? computeZoomScale(
          bassinOrigin,
          selectedBassinNode.communes.map((c) => project(c.lat, c.lng)),
          14
        )
      : 1;
  const communePos = (c: CommuneNode) => (bassinOrigin ? spread(project(c.lat, c.lng), bassinOrigin, bassinZoomScale) : project(c.lat, c.lng));

  // Écart commune → école : calculé sur les positions DÉJÀ écartées par le
  // niveau bassin (communePos), car c'est dans ce repère-là — celui
  // effectivement rendu à l'écran — que la marge anti-rognage doit être
  // vérifiée.
  const communeOrigin = selectedCommuneNode ? communePos(selectedCommuneNode) : null;
  const communeZoomScale =
    communeOrigin && selectedCommuneNode
      ? computeZoomScale(
          communeOrigin,
          selectedCommuneNode.schools.map((s) => (bassinOrigin ? spread(project(s.lat, s.lng), bassinOrigin, bassinZoomScale) : project(s.lat, s.lng))),
          20
        )
      : 1;
  const schoolPos = (s: SchoolPoint) => {
    const afterBassin = bassinOrigin ? spread(project(s.lat, s.lng), bassinOrigin, bassinZoomScale) : project(s.lat, s.lng);
    return communeOrigin ? spread(afterBassin, communeOrigin, communeZoomScale) : afterBassin;
  };

  function retourBelgique() {
    setSelectedBassin(null);
    setSelectedCommune(null);
  }

  return (
    <div className="card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-stone-600 dark:text-stone-300">
          {selectedBassinNode ? (
            <button
              type="button"
              onClick={retourBelgique}
              className="text-brand-700 underline decoration-dotted underline-offset-2 hover:text-brand-800 dark:text-brand-400"
            >
              Belgique
            </button>
          ) : (
            "Belgique"
          )}
          {selectedBassinNode && (
            <>
              {" › "}
              {selectedCommuneNode ? (
                <button
                  type="button"
                  onClick={() => setSelectedCommune(null)}
                  className="text-brand-700 underline decoration-dotted underline-offset-2 hover:text-brand-800 dark:text-brand-400"
                >
                  {selectedBassinNode.bassin}
                </button>
              ) : (
                selectedBassinNode.bassin
              )}
            </>
          )}
          {selectedCommuneNode && (
            <>
              {" › "}
              {selectedCommuneNode.commune}
            </>
          )}
          {!selectedBassinNode && " — par bassin (cliquez pour détailler par commune, puis par école)"}
        </p>
        {selectedBassinNode && (
          <button
            type="button"
            onClick={retourBelgique}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            ← Retour à la Belgique
          </button>
        )}
      </div>

      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-gradient-to-br from-brand-50 to-teal-50/60 dark:from-stone-800 dark:to-stone-900">
        {/* Simple repère géographique en fond, immobile — la carte ne pivote
            ni ne se recadre, seules les bulles se déplacent en zoomant. */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {provincePaths.map((p) => (
            <path
              key={p.id}
              d={p.d}
              className="fill-brand-900/[0.03] stroke-brand-900/25 dark:fill-white/[0.04] dark:stroke-white/20"
              strokeWidth={0.15}
            />
          ))}
        </svg>

        {/* Villes de repère, visibles seulement sur la vue d'ensemble : à
            l'échelle d'un bassin ou d'une commune, les bulles elles-mêmes
            (nommées) suffisent à se situer. */}
        {!selectedBassinNode &&
          MAJOR_CITIES.map((city) => {
            const pos = project(city.lat, city.lng);
            return (
              <span
                key={city.name}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-[9px] italic text-stone-400 dark:text-stone-500"
                style={{ left: `${pos.left}%`, top: `${pos.top}%`, zIndex: 0 }}
              >
                {city.name}
              </span>
            );
          })}

        {bassinsSorted.map((b) => {
          const pos = project(b.lat, b.lng);
          const size = bubbleSize(b.recensees, maxBassinCount, MIN_BASSIN_SIZE, MAX_BASSIN_SIZE);
          const pct = b.recensees > 0 ? Math.round((b.inscrites / b.recensees) * 100) : 0;
          return (
            <button
              key={b.bassin}
              type="button"
              onClick={() => setSelectedBassin(b.bassin)}
              title={`${b.bassin} : ${b.recensees} recensées, ${b.inscrites} inscrites (${pct} %)`}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-teal font-semibold text-white shadow-md ring-2 ring-white/70 transition-opacity duration-300 dark:ring-stone-900/60"
              style={{
                left: `${pos.left}%`,
                top: `${pos.top}%`,
                width: size,
                height: size,
                fontSize: Math.max(11, size * 0.24),
                opacity: selectedBassinNode ? 0 : 1,
                pointerEvents: selectedBassinNode ? "none" : "auto",
                zIndex: Math.round(1000 - size),
              }}
            >
              {b.recensees}
              <span className="absolute left-1/2 top-full mt-1 max-w-[7rem] -translate-x-1/2 truncate text-[10px] font-medium text-stone-600 dark:text-stone-300">
                {b.bassin}
              </span>
              {b.inscrites > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[9px] font-bold text-brand-700 ring-2 ring-brand-600 dark:bg-stone-900 dark:text-brand-400">
                  {b.inscrites}
                </span>
              )}
            </button>
          );
        })}

        {communesSorted.map((c) => {
          const pos = communePos(c);
          const size = bubbleSize(c.recensees, maxCommuneCount, MIN_COMMUNE_SIZE, MAX_COMMUNE_SIZE);
          const pct = c.recensees > 0 ? Math.round((c.inscrites / c.recensees) * 100) : 0;
          return (
            <button
              key={c.commune}
              type="button"
              onClick={() => setSelectedCommune(c.commune)}
              title={`${c.commune} : ${c.recensees} recensées, ${c.inscrites} inscrites (${pct} %)`}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-teal font-semibold text-white shadow-md ring-2 ring-white/70 transition-all duration-500 ease-out dark:ring-stone-900/60"
              style={{
                left: `${pos.left}%`,
                top: `${pos.top}%`,
                width: size,
                height: size,
                fontSize: Math.max(9, size * 0.26),
                opacity: !selectedBassinNode || selectedCommuneNode ? 0 : 1,
                pointerEvents: selectedBassinNode && !selectedCommuneNode ? "auto" : "none",
                zIndex: Math.round(1000 - size),
              }}
            >
              {c.recensees}
              <span className="absolute left-1/2 top-full mt-1 max-w-[6rem] -translate-x-1/2 truncate text-[9px] font-medium text-stone-600 dark:text-stone-300">
                {c.commune}
              </span>
              {c.inscrites > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[8px] font-bold text-brand-700 ring-2 ring-brand-600 dark:bg-stone-900 dark:text-brand-400">
                  {c.inscrites}
                </span>
              )}
            </button>
          );
        })}

        {(selectedCommuneNode?.schools ?? []).map((s) => {
          const pos = schoolPos(s);
          return (
            <Link
              key={s.numeroFase}
              href={`/admin/cartographie?q=${s.numeroFase}`}
              title={`${s.name} — ${s.inscrite ? "inscrite sur la plateforme" : "pas encore inscrite"} — voir les informations`}
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out hover:z-10 hover:scale-125"
              style={{
                left: `${pos.left}%`,
                top: `${pos.top}%`,
                opacity: selectedCommuneNode ? 1 : 0,
                pointerEvents: selectedCommuneNode ? "auto" : "none",
                zIndex: 1,
              }}
            >
              <span
                className={
                  s.inscrite
                    ? "block rounded-full bg-emerald-500 ring-2 ring-white/70 dark:bg-emerald-600 dark:ring-stone-900/60"
                    : "block rounded-full bg-white ring-2 ring-brand-600 dark:bg-stone-900 dark:ring-brand-400"
                }
                style={{ width: SCHOOL_DOT_SIZE, height: SCHOOL_DOT_SIZE }}
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
