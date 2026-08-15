import PDFDocument from "pdfkit";
import { CONFORMITY_MENTION } from "@/lib/regulatory-reference";
import type { LoadedLogo } from "@/lib/export-logos";

export type ExportPeriodRow = {
  date: Date;
  /// "09:00 – 10:40", ou "—" pour les périodes déclarées avant l'introduction
  /// de la plage horaire (cf. lib/period-duration.ts).
  horaire: string;
  type: string;
  /// Libellé de la nature de l'activité, ou "—" si non précisée.
  nature: string;
  description: string;
  /// Objectifs du plan de pilotage (4e colonne du formulaire officiel), ou "—".
  objectifsPilotage: string;
  dureePeriodes: string;
  status: "validee" | "attente";
  participants: string;
};

/// Bloc d'identité des relevés individuels : qui est concerné, ce qu'il
/// enseigne, et où il en est de son obligation annuelle. Absent des exports
/// par lot et collectifs, qui portent sur plusieurs personnes.
export type ExportIdentity = {
  fullName: string;
  matricule: string;
  /// « Primaire — Mathématiques (12 h) », niveaux et disciplines réunis.
  teaching: string;
  /// Périodes déclarées dans l'école du relevé, et objectif annuel.
  done: string;
  objective: string;
  /// Total agrégé fait ailleurs, ou null si la personne n'enseigne que
  /// dans cette école — la ligne est alors omise plutôt qu'affichée à zéro.
  otherSchools: string | null;
  total: string;
};

export type ExportHeaderLogos = {
  /// Logo de l'école, en tête du document (cf. lib/export-logos.ts).
  school: LoadedLogo | null;
  /// Logo vertical de la plateforme, au pied de chaque page.
  platform: LoadedLogo | null;
};

const statusLabel = (status: ExportPeriodRow["status"]) =>
  status === "validee" ? "Validée" : "En attente";

// Le relevé reprend les colonnes du formulaire officiel de recensement annexé
// à la circulaire 7167 (type de tâche/production, durée, avec qui, objectifs du
// plan de pilotage). À neuf colonnes, l'A4 portrait ne suffit plus : le
// document est produit en paysage, d'où une largeur utile de 842 - 2 * 40.
// Somme des largeurs = 762 pt.
const COLUMN_WIDTHS = [58, 66, 82, 105, 145, 105, 38, 50, 113];
const COLUMN_LABELS = [
  "Date",
  "Horaire",
  "Forme",
  "Nature de l'activité",
  "Description",
  "Objectifs du plan de pilotage",
  "Durée",
  "Statut",
  "Participants",
];
const PAGE_MARGIN = 40;
/// Boîte du logo de l'école, centrée en tête du document. `fit` y inscrit
/// l'image en conservant son rapport d'aspect : elle est réduite pour tenir,
/// jamais rognée, quelles que soient ses proportions d'origine.
const HEADER_LOGO_BOX = 62;
/// Hauteur réservée au pied de page, au-dessus de la marge basse. Les lignes
/// du tableau s'arrêtent avant, sinon elles passeraient sous le logo.
const FOOTER_HEIGHT = 62;

export function buildPeriodsPdf(
  rows: ExportPeriodRow[],
  title: string,
  logos?: ExportHeaderLogos,
  identity?: ExportIdentity
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: PAGE_MARGIN, size: "A4", layout: "landscape" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const contentWidth = doc.page.width - PAGE_MARGIN * 2;

    // Pied de page repris de l'affiche du code de rattachement (cf.
    // lib/join-poster.ts) : filet, logo de la plateforme centré, mention de
    // conformité en dessous. Ancré au bas de la page et redessiné à chaque
    // nouvelle page, pour que le document reste signé de bout en bout.
    const drawFooter = () => {
      const footerTop = doc.page.height - PAGE_MARGIN - FOOTER_HEIGHT;
      doc
        .moveTo(PAGE_MARGIN, footerTop)
        .lineTo(doc.page.width - PAGE_MARGIN, footerTop)
        .lineWidth(0.8)
        .strokeColor("#e7e5e4")
        .stroke();

      if (logos?.platform) {
        doc.image(logos.platform.buffer, PAGE_MARGIN, footerTop + 10, {
          fit: [contentWidth, 26],
          align: "center",
          valign: "center",
        });
      }

      // Un relevé imprimé et transmis à l'administration doit porter le cadre
      // dont il relève.
      doc
        .fontSize(7.5)
        .font("Helvetica")
        .fillColor("#78716c")
        .text(CONFORMITY_MENTION, PAGE_MARGIN, footerTop + 44, {
          width: contentWidth,
          align: "center",
        })
        .fillColor("black");
    };

    // `pageAdded` ne se déclenche pas pour la première page, créée par le
    // constructeur : celle-ci est signée à la main, plus bas. Le curseur est
    // remis en haut après coup, sans quoi la page suivante commencerait à
    // écrire sous le pied qu'on vient de dessiner.
    doc.on("pageAdded", () => {
      drawFooter();
      doc.x = PAGE_MARGIN;
      doc.y = PAGE_MARGIN;
    });

    // Signée tout de suite, et non à la fin : `doc.end()` survient alors que
    // le curseur est sur la dernière page, où le pied a déjà été tracé par
    // `pageAdded`. Le pied occupe une position absolue en bas de page, le
    // dessiner avant le contenu ne gêne rien.
    drawFooter();
    doc.x = PAGE_MARGIN;
    doc.y = PAGE_MARGIN;

    let headerBottom = PAGE_MARGIN;
    if (logos?.school) {
      doc.image(logos.school.buffer, PAGE_MARGIN, PAGE_MARGIN, {
        fit: [contentWidth, HEADER_LOGO_BOX],
        align: "center",
        valign: "center",
      });
      headerBottom = PAGE_MARGIN + HEADER_LOGO_BOX;
    }

    doc.y = headerBottom + 14;
    doc
      .fillColor("black")
      .fontSize(16)
      .font("Helvetica-Bold")
      .text(title, PAGE_MARGIN, doc.y, { width: contentWidth, align: "center" });
    doc.moveDown(0.8);

    if (identity) {
      const lignes: [string, string][] = [
        ["Enseignant·e", identity.fullName],
        ["Matricule", identity.matricule],
        ["Enseignement", identity.teaching],
        [
          "Travail collaboratif",
          identity.otherSchools
            ? `${identity.done} période(s) dans cette école · ${identity.otherSchools} dans un autre établissement · ${identity.total} au total, pour un objectif de ${identity.objective}`
            : `${identity.done} période(s) sur un objectif de ${identity.objective}`,
        ],
      ];

      const blocTop = doc.y;
      doc.fontSize(9);
      for (const [label, valeur] of lignes) {
        const y = doc.y;
        doc.font("Helvetica-Bold").fillColor("#57534e").text(label, PAGE_MARGIN + 10, y, { width: 110 });
        doc
          .font("Helvetica")
          .fillColor("black")
          .text(valeur, PAGE_MARGIN + 125, y, { width: contentWidth - 135 });
        doc.y = Math.max(doc.y, y) + 2;
      }
      // Encadré tracé après coup : sa hauteur dépend du retour à la ligne des
      // valeurs longues (enseignement multi-niveaux, notamment).
      doc
        .roundedRect(PAGE_MARGIN, blocTop - 6, contentWidth, doc.y - blocTop + 10, 6)
        .lineWidth(0.8)
        .strokeColor("#e7e5e4")
        .stroke();
      doc.y += 14;
      doc.fillColor("black");
    }

    const drawHeader = () => {
      let x = PAGE_MARGIN;
      const y = doc.y;
      doc.fontSize(9).font("Helvetica-Bold");
      COLUMN_LABELS.forEach((label, i) => {
        doc.text(label, x, y, { width: COLUMN_WIDTHS[i] });
        x += COLUMN_WIDTHS[i];
      });
      doc.moveDown(0.6);
      doc
        .moveTo(PAGE_MARGIN, doc.y)
        .lineTo(PAGE_MARGIN + COLUMN_WIDTHS.reduce((a, b) => a + b, 0), doc.y)
        .strokeColor("#cccccc")
        .stroke();
      doc.moveDown(0.3);
    };

    drawHeader();
    doc.font("Helvetica").fontSize(8.5);

    for (const row of rows) {
      const cells = [
        row.date.toLocaleDateString("fr-BE"),
        row.horaire,
        row.type,
        row.nature,
        row.description,
        row.objectifsPilotage,
        row.dureePeriodes,
        statusLabel(row.status),
        row.participants,
      ];

      const heights = cells.map((cell, i) => doc.heightOfString(cell, { width: COLUMN_WIDTHS[i] }));
      const rowHeight = Math.max(...heights, 12);

      if (doc.y + rowHeight > doc.page.height - PAGE_MARGIN - FOOTER_HEIGHT - 8) {
        doc.addPage();
        drawHeader();
        doc.font("Helvetica").fontSize(8.5);
      }

      let x = PAGE_MARGIN;
      const y = doc.y;
      cells.forEach((cell, i) => {
        doc.text(cell, x, y, { width: COLUMN_WIDTHS[i] });
        x += COLUMN_WIDTHS[i];
      });
      doc.y = y + rowHeight + 4;
    }

    if (rows.length === 0) {
      doc.text("Aucune période à exporter.");
    }

    doc.end();
  });
}
