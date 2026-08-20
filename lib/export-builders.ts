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
/// Bandeau d'identité : les quatre informations côte à côte sur toute la
/// largeur, chacune sous son intitulé, plutôt qu'empilées dans une colonne.
/// L'intitulé est en petites capitales grises, la valeur en dessous.
/// Titre du document, et période couverte juste en dessous — plus discrète,
/// c'est une précision et non l'objet du document.
const TITLE_SIZE = 15;
const TITLE_PERIOD_SIZE = 11;
const IDENTITY_LABEL_SIZE = 6.5;
/// Interlettrage des intitulés. Constante et non littéral : il doit entrer
/// dans la MESURE comme dans le tracé, sans quoi la colonne est taillée trop
/// étroite et l'intitulé passe à la ligne.
const IDENTITY_LABEL_SPACING = 0.4;
const IDENTITY_VALUE_SIZE = 9;
/// Gouttière entre deux colonnes du bandeau.
const IDENTITY_GAP = 16;
/// Le bandeau est peint aux couleurs de la plateforme : il détache l'identité
/// du tableau, que rien d'autre ne séparait — les deux étaient en petites
/// capitales grises sur toute la largeur.
///
/// Le sarcelle de la charte (#14b8a6) est écarté au profit de sa déclinaison
/// sombre : blanc sur #14b8a6 ne donne que 2,5 de contraste, sous le seuil de
/// 4,5 exigé pour du petit texte, et il vire au gris moyen (133/255) à
/// l'impression noir et blanc. Les deux bornes retenues tiennent 5,1 et 5,5 en
/// couleur, et descendent à 97 et 86 sur 255 en niveaux de gris — le blanc y
/// reste franc sur une imprimante de salle des profs.
const IDENTITY_BG_FROM = "#1f6fc4";
const IDENTITY_BG_TO = "#0f766e";
/// Les intitulés cèdent leur gris pour un blanc cassé : 4,7 de contraste sur
/// le bleu, contre 2,0 pour l'ancien #a8a29e devenu illisible sur ce fond.
const IDENTITY_LABEL_COLOR = "#f5f5f4";
const IDENTITY_PAD_X = 14;
const IDENTITY_PAD_Y = 8;
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

/// Le titre d'un relevé : ce dont il s'agit, puis la période qu'il couvre.
/// Deux lignes plutôt qu'une phrase à rallonge — la seconde est la seule qui
/// change d'un export à l'autre, et c'est celle qu'on cherche des yeux sur un
/// exemplaire classé.
export type ExportTitle = {
  /// « Relevé individuel de travail collaboratif ».
  main: string;
  /// « du 01/09/2025 au 30/06/2026 », ou null si aucune borne n'est connue.
  periode: string | null;
};

export function buildPeriodsPdf(
  rows: ExportPeriodRow[],
  title: ExportTitle,
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

      // Centré sur la page, les deux lignes partageant le même axe. La zone
      // libre commence après le logo : si un titre long y déborderait, il se
      // recentre dans ce qu'il reste plutôt que de passer sur la bannière.
      const zoneGauche = PAGE_MARGIN + largeurLogo + 24;
      const zoneDroite = doc.page.width - PAGE_MARGIN;

      doc.fontSize(TITLE_SIZE).font("Helvetica-Bold");
      const largeurMain = doc.widthOfString(title.main);
      doc.fontSize(TITLE_PERIOD_SIZE).font("Helvetica");
      const largeurPeriode = title.periode ? doc.widthOfString(title.periode) : 0;

      const largeurTitre = Math.min(
        Math.max(largeurMain, largeurPeriode),
        zoneDroite - zoneGauche
      );
      const titreX = Math.max((doc.page.width - largeurTitre) / 2, zoneGauche);

      doc.fontSize(TITLE_SIZE).font("Helvetica-Bold");
      const hautMain = doc.heightOfString(title.main, { width: largeurTitre });
      doc.fontSize(TITLE_PERIOD_SIZE).font("Helvetica");
      const hautPeriode = title.periode
        ? doc.heightOfString(title.periode, { width: largeurTitre }) + 3
        : 0;

      // Le couple est centré verticalement sur la hauteur du logo — mesuré
      // d'abord, un titre qui passe à la ligne ne se calant pas comme un titre
      // court. Sans logo, il n'y a pas de bande sur laquelle se centrer.
      const titreY = logos?.school
        ? PAGE_MARGIN + Math.max(0, (HEADER_LOGO_BOX - (hautMain + hautPeriode)) / 2)
        : PAGE_MARGIN;

      doc
        .fillColor("#1c1917")
        .fontSize(TITLE_SIZE)
        .font("Helvetica-Bold")
        .text(title.main, titreX, titreY, { width: largeurTitre, align: "center" });
      if (title.periode) {
        doc
          .fillColor("#57534e")
          .fontSize(TITLE_PERIOD_SIZE)
          .font("Helvetica")
          .text(title.periode, titreX, titreY + hautMain + 3, {
            width: largeurTitre,
            align: "center",
          });
      }
      headerBottom = Math.max(headerBottom, doc.y);

      // Les exports collectifs ou par lot n'ont pas d'identité unique : le
      // bandeau s'arrête alors au logo et au titre.
      if (identity) {
        const lignes = identityLines(identity);

        // Quatre colonnes en bandeau plutôt que quatre lignes empilées :
        // l'identité tenait sur un quart de la largeur en occupant le tiers
        // de la hauteur utile, sur une page qui en fait 762 points de large.
        //
        // Chaque colonne reçoit une part de la largeur proportionnelle à ce
        // qu'elle a à dire — mesuré, et non deviné : un matricule tient en
        // douze caractères, un décompte de périodes en soixante. Répartir à
        // parts égales aurait fait passer le second à la ligne pendant que le
        // premier laissait la moitié de sa colonne vide.
        // Mesuré tel qu'il sera écrit — en capitales et interlettré. Mesurer
        // `label` en minuscules sous-estimait sa largeur d'un bon dixième :
        // « TRAVAIL COLLABORATIF » passait alors à la ligne dans une colonne
        // taillée pour « Travail collaboratif ».
        doc.fontSize(IDENTITY_LABEL_SIZE).font("Helvetica-Bold");
        const intitules = lignes.map(([label]) => label.toUpperCase());
        const largeursIntitules = intitules.map((label) =>
          doc.widthOfString(label, { characterSpacing: IDENTITY_LABEL_SPACING })
        );
        doc.fontSize(IDENTITY_VALUE_SIZE).font("Helvetica");
        const largeursValeurs = lignes.map(([, valeur]) => doc.widthOfString(valeur));

        const naturelles = lignes.map((_, i) => Math.max(largeursIntitules[i], largeursValeurs[i]));
        const somme = naturelles.reduce((a, b) => a + b, 0);
        const disponible =
          contentWidth - IDENTITY_PAD_X * 2 - IDENTITY_GAP * (lignes.length - 1);

        // Chaque colonne voudrait sa largeur naturelle — celle qui tient son
        // intitulé ET sa valeur sur une ligne. Son plancher est la largeur de
        // son seul intitulé : en dessous, c'est le libellé qui se replie, et
        // « TRAVAIL COLLABORATIF » sur deux lignes écrasait sa valeur.
        //
        // S'il reste de la place, chacune la reçoit au prorata de ce qu'elle
        // occupe. S'il en manque, le déficit est prélevé sur la MARGE de
        // chacune au-dessus de son plancher : « Enseignement », qui peut
        // aligner trois disciplines, en a beaucoup ; « Matricule », douze
        // chiffres immuables, n'en a presque pas. Le premier se replie donc,
        // le second reste entier.
        const planchers = largeursIntitules.map((w) => Math.min(w, disponible / lignes.length));
        const marges = naturelles.map((n, i) => Math.max(0, n - planchers[i]));

        let largeurs: number[];
        if (somme <= disponible) {
          const surplus = disponible - somme;
          largeurs = naturelles.map((n) => n + surplus * (n / somme));
        } else {
          // Prélevé en cascade, de la colonne la plus large vers la plus
          // étroite, et non au prorata : « Enseignement » peut réclamer 690
          // points quand le bandeau n'en offre que 686, et un prorata ôtait
          // alors cinq pour cent à tout le monde — assez pour couper un
          // matricule en deux. Ici cette seule colonne absorbe le manque, les
          // autres gardent leur largeur naturelle.
          largeurs = [...naturelles];
          let deficit = somme - disponible;
          const ordre = marges.map((_, i) => i).sort((a, b) => marges[b] - marges[a]);
          for (const i of ordre) {
            if (deficit <= 0) break;
            const retirable = Math.min(marges[i], deficit);
            largeurs[i] -= retirable;
            deficit -= retirable;
          }
        }

        // Le fond est peint avant le texte, donc sa hauteur doit être connue
        // d'avance : on mesure ce que chaque colonne occupera réellement.
        // L'intitulé est mesuré lui aussi plutôt que supposé d'une ligne —
        // c'est ce qui faisait écrire la valeur par-dessus quand il en prenait
        // deux.
        doc.fontSize(IDENTITY_LABEL_SIZE).font("Helvetica-Bold");
        const hauteursIntitules = intitules.map((label, i) =>
          doc.heightOfString(label, {
            width: largeurs[i] + 1,
            characterSpacing: IDENTITY_LABEL_SPACING,
          })
        );
        doc.fontSize(IDENTITY_VALUE_SIZE).font("Helvetica");
        const hauteursValeurs = lignes.map(([, valeur], i) =>
          doc.heightOfString(valeur, { width: largeurs[i] })
        );
        const hauteurBande = Math.max(
          ...lignes.map((_, i) => hauteursIntitules[i] + 3 + hauteursValeurs[i])
        );

        const bandeY = headerBottom + 14;
        const fond = doc.linearGradient(PAGE_MARGIN, 0, doc.page.width - PAGE_MARGIN, 0);
        fond.stop(0, IDENTITY_BG_FROM).stop(1, IDENTITY_BG_TO);
        doc
          .roundedRect(PAGE_MARGIN, bandeY, contentWidth, hauteurBande + IDENTITY_PAD_Y * 2, 4)
          .fill(fond);

        const y = bandeY + IDENTITY_PAD_Y;
        let x = PAGE_MARGIN + IDENTITY_PAD_X;

        lignes.forEach(([, valeur], i) => {
          doc
            .fontSize(IDENTITY_LABEL_SIZE)
            .font("Helvetica-Bold")
            .fillColor(IDENTITY_LABEL_COLOR)
            .text(intitules[i], x, y, {
              // +1 point : à largeur strictement égale à celle mesurée, un
              // arrondi suffit à renvoyer le dernier mot à la ligne.
              width: largeurs[i] + 1,
              characterSpacing: IDENTITY_LABEL_SPACING,
            });
          doc
            .fontSize(IDENTITY_VALUE_SIZE)
            .font("Helvetica")
            .fillColor("#ffffff")
            // Posée sous SON intitulé, dont la hauteur est mesurée : un
            // décalage fixe supposait que tous tiennent sur une ligne.
            .text(valeur, x, y + hauteursIntitules[i] + 3, { width: largeurs[i] });
          x += largeurs[i] + IDENTITY_GAP;
        });

        headerBottom = bandeY + hauteurBande + IDENTITY_PAD_Y * 2;
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
      doc.fontSize(9).font("Helvetica-Bold").fillColor("black");

      // Le filet se cale sur l'intitulé le PLUS HAUT, pas sur le dernier
      // écrit : « Objectifs du plan de pilotage » tient sur deux lignes dans sa
      // colonne, et `doc.y` laissé à la fin de la boucle valait la hauteur de
      // « Participants », d'une seule ligne — le mot « pilotage » passait alors
      // par-dessus le trait.
      const hauteur = Math.max(
        ...COLUMN_LABELS.map((label, i) => doc.heightOfString(label, { width: COLUMN_WIDTHS[i] }))
      );
      COLUMN_LABELS.forEach((label, i) => {
        doc.text(label, x, y, { width: COLUMN_WIDTHS[i] });
        x += COLUMN_WIDTHS[i];
      });

      doc.y = y + hauteur;
      doc.moveDown(0.4);
      doc
        .moveTo(PAGE_MARGIN, doc.y)
        .lineTo(PAGE_MARGIN + COLUMN_WIDTHS.reduce((a, b) => a + b, 0), doc.y)
        .lineWidth(0.8)
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
