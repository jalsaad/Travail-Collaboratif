"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";

export type SchoolPoint = {
  numeroFase: string;
  name: string;
  lat: number;
  lng: number;
  /// Déjà sur la plateforme — c'est ce que la carte sert à voir d'un coup d'œil.
  inscrite: boolean;
};

// Carte glissante des écoles de la Fédération, inscrites ou non.
//
// Leaflet plutôt qu'un fond propriétaire : ni clé d'API, ni compte de
// facturation à surveiller, et le zoom continu qu'un dessin fait main ne
// pouvait pas offrir. Les tuiles viennent d'OpenStreetMap.
//
// Leaflet est piloté directement, sans habillage React : le regroupement de
// marqueurs est un greffon impératif, qu'une couche déclarative obligerait à
// contourner plus qu'elle ne l'aiderait. La carte est créée une fois pour
// toutes, puis laissée à elle-même.

const BRAND = "#1f6fc4";
const INSCRITE = "#0f766e";

/// Centre et cadrage de la Fédération. Utilisés seulement si la liste est
/// vide : sinon la carte s'ajuste aux points réels.
const BELGIQUE: L.LatLngBoundsExpression = [
  [49.49, 2.54],
  [51.51, 6.41],
];

/// Pastille de regroupement : le nombre d'écoles, et la part déjà inscrite en
/// arc autour. Les couleurs sont celles de la plateforme, le fond est opaque
/// pour rester lisible sur n'importe quelle tuile.
function pastille(cluster: L.MarkerCluster): L.DivIcon {
  const enfants = cluster.getAllChildMarkers();
  const total = enfants.length;
  const inscrites = enfants.filter((m) => (m.options as { inscrite?: boolean }).inscrite).length;
  const part = total > 0 ? (inscrites / total) * 100 : 0;

  // Trois tailles : un amas de vingt écoles ne doit pas s'afficher comme un
  // amas de deux cents.
  const taille = total < 10 ? 36 : total < 100 ? 46 : 56;
  const police = total < 10 ? 12 : total < 100 ? 13 : 14;

  return L.divIcon({
    className: "",
    iconSize: [taille, taille],
    iconAnchor: [taille / 2, taille / 2],
    html: `
      <div style="
        width:${taille}px;height:${taille}px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font:600 ${police}px/1 system-ui,sans-serif;color:#fff;
        background:conic-gradient(${INSCRITE} 0 ${part}%, ${BRAND} ${part}% 100%);
        box-shadow:0 0 0 3px rgba(255,255,255,.85), 0 2px 6px rgba(0,0,0,.3);
      ">${total}</div>`,
  });
}

export function BelgiumSchoolsMap({ schools }: { schools: SchoolPoint[] }) {
  const conteneur = useRef<HTMLDivElement>(null);
  const carte = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!conteneur.current || carte.current) return;

    const map = L.map(conteneur.current, { scrollWheelZoom: false }).fitBounds(BELGIQUE);
    carte.current = map;

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      // Mention obligatoire au titre de la licence d'OpenStreetMap.
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // La molette est désactivée à l'arrivée : sur une page qui défile, elle
    // capturerait le geste de lecture. Un clic sur la carte la réactive.
    map.once("click", () => map.scrollWheelZoom.enable());

    const groupe = L.markerClusterGroup({
      iconCreateFunction: pastille,
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      // Plusieurs implantations partagent parfois des coordonnées identiques :
      // aucun zoom ne les sépare, l'éventail les écarte au clic.
      spiderfyOnMaxZoom: true,
    });

    for (const ecole of schools) {
      const marqueur = L.circleMarker([ecole.lat, ecole.lng], {
        radius: 6,
        weight: 2,
        color: "#fff",
        fillColor: ecole.inscrite ? INSCRITE : BRAND,
        fillOpacity: 1,
        inscrite: ecole.inscrite,
      } as L.CircleMarkerOptions);

      marqueur.bindPopup(
        `<strong>${echapper(ecole.name)}</strong><br>` +
          `<span style="color:#78716c">FASE ${echapper(ecole.numeroFase)}</span><br>` +
          (ecole.inscrite
            ? `<span style="color:${INSCRITE};font-weight:600">Inscrite</span>`
            : `<span style="color:#78716c">Pas encore inscrite</span>`)
      );
      groupe.addLayer(marqueur);
    }

    map.addLayer(groupe);
    if (schools.length > 0) map.fitBounds(groupe.getBounds().pad(0.05));

    return () => {
      map.remove();
      carte.current = null;
    };
  }, [schools]);

  return (
    <div>
      <div
        ref={conteneur}
        className="h-[520px] w-full overflow-hidden rounded-xl border border-stone-200 dark:border-stone-700"
      />
      <p className="mt-2 flex flex-wrap items-center gap-4 text-xs text-stone-500 dark:text-stone-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ background: INSCRITE }} /> inscrite
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ background: BRAND }} /> pas encore
        </span>
        <span>Cliquez sur la carte pour activer le zoom à la molette.</span>
      </p>
    </div>
  );
}

/// Les noms d'école viennent de l'annuaire, pas d'une saisie utilisateur, mais
/// ils contiennent des guillemets et des esperluettes qui casseraient le HTML
/// de l'infobulle.
function echapper(valeur: string): string {
  return valeur
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
