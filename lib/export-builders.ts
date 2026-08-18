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

// Le relevé reprend les colonnes du formulaire officiel de recensement annexé
// à la circulaire 7167 (type de tâche/production, durée, avec qui, objectifs du
// plan de pilotage). À huit colonnes, l'A4 portrait ne suffit toujours pas : le
// document est produit en paysage, d'où une largeur utile de 842 - 2 * 40.
// Somme des largeurs = 762 pt.
//
// Pas de colonne « Statut » : la validation par les pairs est un mécanisme
// interne à la plateforme, absent du formulaire officiel. Les 50 points qu'elle
// occupait reviennent à la description et aux participants, les deux colonnes
// qui manquaient de place.
const COLUMN_WIDTHS = [58, 66, 82, 105, 170, 105, 38, 138];
const COLUMN_LABELS = [
  "Date",
  "Horaire",
  "Forme",
  "Nature de l'activité",
  "Description",
  "Objectifs du plan de pilotage",
  "Durée",
  "Participants",
];
const PAGE_MARGIN = 40;
/// Boîte du logo de l'école, en haut à gauche. `fit` y inscrit l'image en
/// conservant son rapport d'aspect : elle est réduite pour tenir, jamais
/// rognée, quelles que soient ses proportions d'origine.
const HEADER_LOGO_BOX = 62;
const HEADER_LOGO_WIDTH = 260;
/// Bloc d'identité, en vis-à-vis du logo : deux colonnes alignées à gauche,
/// l'ensemble calé sur la marge droite. Aligner les valeurs à droite les
/// éloignait de leur intitulé à proportion de leur brièveté — « Leandro
/// Anzaldi » laissait cent-soixante-dix points de vide. Ici l'écart ne dépend
/// plus de ce qu'on écrit, et les deux colonnes tombent chacune sur sa
/// verticale.
const IDENTITY_VALUE_WIDTH = 250;
/// Blanc entre la colonne des intitulés et celle des valeurs.
const IDENTITY_GAP = 10;
/// Hauteur réservée au pied de page, au-dessus de la marge basse. Les lignes
/// du tableau s'arrêtent avant, sinon elles passeraient sous le logo.
const FOOTER_HEIGHT = 62;

/// Une ligne de l'en-tête individuel. Le décompte est resserré par rapport à
/// l'ancien encadré pleine largeur : la colonne de droite fait 232 points, une
/// phrase y passerait à la ligne trois fois.
function identityLines(identity: ExportIdentity): [string, string][] {
  return [
    ["Enseignant·e", identity.fullName],
    ["Matricule", identity.matricule],
    ["Enseignement", identity.teaching],
    [
      "Travail collaboratif",
      identity.otherSchools
        ? `${identity.done} / ${identity.objective} périodes · ${identity.otherSchools} dans un autre établissement · ${identity.total} au total`
        : `${identity.done} / ${identity.objective} périodes`,
    ],
  ];
}

export function buildPeriodsPdf(
  rows: ExportPeriodRow[],
  title: string,
  logos?: ExportHeaderLogos,
  identity?: ExportIdentity
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // `bufferPages` retient les pages au lieu de les émettre au fil de l'eau :
    // c'est la seule façon d'écrire « 3/5 » alors que le total n'est connu
    // qu'une fois la dernière ligne posée. On y revient juste avant `end()`.
    const doc = new PDFDocument({
      margin: PAGE_MARGIN,
      size: "A4",
      layout: "landscape",
      bufferPages: true,
    });
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

    // Bandeau d'en-tête : logo de l'école à gauche, titre du relevé à droite,
    // identité de l'enseignant en dessous. Répété sur chaque page — un relevé
    // transmis à l'administration circule feuille par feuille, et une page
    // détachée doit dire à elle seule de qui et de quelle période elle parle.
    const drawDocumentHeader = () => {
      let headerBottom = PAGE_MARGIN;
      // Largeur réellement occupée, et non les 260 points réservés : `fit`
      // réduit l'image à hauteur constante, un logo étroit n'en consomme qu'une
      // fraction. La mesurer rend au titre la place que le logo n'a pas prise.
      let largeurLogo = 0;
      if (logos?.school) {
        largeurLogo = Math.min(
          HEADER_LOGO_WIDTH,
          (HEADER_LOGO_BOX * logos.school.width) / logos.school.height
        );
        doc.image(logos.school.buffer, PAGE_MARGIN, PAGE_MARGIN, {
          fit: [HEADER_LOGO_WIDTH, HEADER_LOGO_BOX],
        });
        headerBottom = PAGE_MARGIN + HEADER_LOGO_BOX;
      }

      // Aligné à droite en vis-à-vis du logo, et non centré sur la page : entre
      // les deux, un titre centré chevaucherait la bannière dès qu'elle est
      // large. La largeur restante lui suffit, et il passe à la ligne au besoin.
      const titreX = PAGE_MARGIN + largeurLogo + 24;
      const largeurTitre = doc.page.width - PAGE_MARGIN - titreX;
      doc.fillColor("black").fontSize(18).font("Helvetica-Bold");
      // Centré verticalement sur la hauteur du logo : mesuré d'abord, car un
      // titre long passe à la ligne et ne se cale pas comme un titre court.
      // Sans logo, il n'y a pas de bande sur laquelle se centrer.
      const hauteurTitre = doc.heightOfString(title, { width: largeurTitre, align: "right" });
      const titreY = logos?.school
        ? PAGE_MARGIN + Math.max(0, (HEADER_LOGO_BOX - hauteurTitre) / 2)
        : PAGE_MARGIN;
      doc.text(title, titreX, titreY, { width: largeurTitre, align: "right" });
      headerBottom = Math.max(headerBottom, doc.y);

      // Les exports collectifs ou par lot n'ont pas d'identité unique : le
      // bandeau s'arrête alors au logo et au titre.
      if (identity) {
        const lignes = identityLines(identity);

        // Colonnes taillées sur leur contenu, mesuré dans la police où il sera
        // écrit — `widthOfString` rapporte la largeur pour la fonte et le corps
        // courants. Des largeurs en dur se dérégleraient au premier intitulé
        // ajouté, et fausseraient le centrage du bloc.
        doc.fontSize(8).font("Helvetica-Bold");
        const largeurIntitules = Math.max(...lignes.map(([label]) => doc.widthOfString(label)));
        doc.font("Helvetica");
        // Plafond de retour à la ligne, non largeur imposée : une valeur plus
        // courte n'occupe que ce qu'elle vaut, le bloc étant aligné à gauche.
        const largeurValeurs = Math.min(
          Math.max(...lignes.map(([, valeur]) => doc.widthOfString(valeur))),
          IDENTITY_VALUE_WIDTH
        );

        // Calé sur la marge gauche, à l'aplomb du logo et de la première
        // colonne du tableau : le regard n'a qu'une verticale à suivre.
        const labelX = PAGE_MARGIN;
        const valueX = labelX + largeurIntitules + IDENTITY_GAP;
        let y = headerBottom + 14;

        for (const [label, valeur] of lignes) {
          doc
            .font("Helvetica-Bold")
            .fillColor("#78716c")
            // +1 point : sans lui, un arrondi de mesure suffit à renvoyer le
            // dernier caractère de l'intitulé le plus long à la ligne suivante.
            .text(label, labelX, y, { width: largeurIntitules + 1, lineBreak: false });
          const apresLabel = doc.y;
          doc
            .font("Helvetica")
            .fillColor("black")
            .text(valeur, valueX, y, { width: largeurValeurs });
          // La valeur peut passer à la ligne (enseignement multi-niveaux), pas
          // l'intitulé : c'est la plus haute des deux qui commande la suivante.
          y = Math.max(apresLabel, doc.y) + 2;
        }
        headerBottom = y;
      }

      doc.fillColor("black");
      doc.x = PAGE_MARGIN;
      doc.y = headerBottom + 14;
    };

    // `pageAdded` ne se déclenche pas pour la première page, créée par le
    // constructeur : celle-ci est coiffée et signée à la main, juste après.
    // Le curseur est remis en haut avant l'en-tête, sans quoi la page
    // commencerait à écrire sous le pied qu'on vient de dessiner.
    doc.on("pageAdded", () => {
      drawFooter();
      doc.x = PAGE_MARGIN;
      doc.y = PAGE_MARGIN;
      drawDocumentHeader();
    });

    // Le pied est tracé tout de suite, et non à la fin : `doc.end()` survient
    // alors que le curseur est sur la dernière page, où `pageAdded` l'a déjà
    // posé. Il occupe une position absolue en bas de page, le dessiner avant
    // le contenu ne gêne rien.
    drawFooter();
    doc.x = PAGE_MARGIN;
    doc.y = PAGE_MARGIN;
    drawDocumentHeader();

    const drawTableHeader = () => {
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

    drawTableHeader();
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
        row.participants,
      ];

      const heights = cells.map((cell, i) => doc.heightOfString(cell, { width: COLUMN_WIDTHS[i] }));
      const rowHeight = Math.max(...heights, 12);

      if (doc.y + rowHeight > doc.page.height - PAGE_MARGIN - FOOTER_HEIGHT - 8) {
        // L'en-tête de page est reposé par `pageAdded`, il ne reste qu'à
        // réafficher les intitulés de colonnes sous lui.
        doc.addPage();
        drawTableHeader();
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

    // Numérotation ajoutée après coup, sur des pages déjà écrites : le total
    // n'existe qu'ici. Portée aussi sur les documents d'une seule page —
    // « 1/1 » atteste qu'il ne manque pas de feuille, ce qui vaut d'être dit
    // sur une pièce transmise à l'administration.
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(pages.start + i);
      doc
        .fontSize(7.5)
        .font("Helvetica")
        .fillColor("#78716c")
        // Sur la ligne de la mention de conformité, à l'opposé : celle-ci est
        // centrée et s'arrête bien avant la marge, la place est libre.
        .text(
          `${i + 1}/${pages.count}`,
          PAGE_MARGIN,
          doc.page.height - PAGE_MARGIN - FOOTER_HEIGHT + 44,
          { width: contentWidth, align: "right" }
        );
    }

    doc.end();
  });
}
