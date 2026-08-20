#!/usr/bin/env node
// Génère lib/belgium-provinces-geo.ts à partir de data/belgium-provinces-nuts2.geojson.
//
// Le GeoJSON est la source de vérité : un extrait (les 11 régions dont
// l'identifiant NUTS commence par "BE") des frontières NUTS2 officielles
// d'Eurostat (GISCO, licence libre de réutilisation), téléchargées depuis
//   https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_20M_2021_4326_LEVL_2.geojson
//
// À relancer après toute modification du GeoJSON source :
//   node scripts/generate-belgium-provinces.js

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const GEOJSON_PATH = path.join(ROOT, "data", "belgium-provinces-nuts2.geojson");
const TS_PATH = path.join(ROOT, "lib", "belgium-provinces-geo.ts");

// Noms français lisibles — l'annuaire NUTS ne fournit que des libellés
// bilingues administratifs (« Prov. Antwerpen », etc.).
const NAMES = {
  BE10: "Bruxelles-Capitale",
  BE21: "Anvers",
  BE22: "Limbourg",
  BE23: "Flandre-Orientale",
  BE24: "Brabant flamand",
  BE25: "Flandre-Occidentale",
  BE31: "Brabant wallon",
  BE32: "Hainaut",
  BE33: "Liège",
  BE34: "Luxembourg",
  BE35: "Namur",
};

function round(n) {
  return Math.round(n * 10000) / 10000;
}

const data = JSON.parse(fs.readFileSync(GEOJSON_PATH, "utf8"));

const provinces = data.features.map((f) => {
  const id = f.properties.NUTS_ID;
  const polys = f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates];
  const rings = [];
  polys.forEach((poly) =>
    poly.forEach((ring) => {
      // GeoJSON écrit les points [longitude, latitude] ; on les inverse pour
      // rester cohérent avec le reste du projet (lat, lng), cf.
      // components/belgium-schools-map.tsx.
      rings.push(ring.map(([lng, lat]) => [round(lat), round(lng)]));
    })
  );
  return { id, name: NAMES[id] ?? id, rings };
});

const body = provinces
  .map(
    (p) =>
      `  {\n    id: "${p.id}",\n    name: "${p.name}",\n    rings: [\n${p.rings
        .map((r) => "      [" + r.map(([lat, lng]) => `[${lat},${lng}]`).join(",") + "]")
        .join(",\n")}\n    ],\n  },`
  )
  .join("\n");

const out = `// Contour des provinces belges (+ Région de Bruxelles-Capitale) — source :
// data/belgium-provinces-nuts2.geojson (frontières NUTS2 officielles
// d'Eurostat, GISCO, licence libre de réutilisation).
//
// Fichier GÉNÉRÉ — ne pas éditer à la main. Regénérer après modification du
// GeoJSON source :
//   node scripts/generate-belgium-provinces.js
//
// Chaque anneau est une liste de points [latitude, longitude]. Simple fond de
// carte (repère visuel), sans lien avec les bassins de la FWB : deux couches
// distinctes projetées avec la même fonction (cf. components/belgium-schools-map.tsx).
export type ProvinceOutline = { id: string; name: string; rings: [number, number][][] };

export const BELGIUM_PROVINCES: ProvinceOutline[] = [
${body}
];
`;

fs.writeFileSync(TS_PATH, out);
console.log(`Écrit ${TS_PATH} (${provinces.length} provinces).`);
