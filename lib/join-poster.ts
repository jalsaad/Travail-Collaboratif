import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import type { LoadedLogo } from "@/lib/export-logos";

// Affiche A4 à imprimer et placarder en salle des profs : un QR code menant au
// formulaire de rattachement avec le code de l'école déjà pré-rempli.
//
// Portrait plein format plutôt que le paysage des relevés : ce document se lit
// de loin, sur un mur, pas sur un écran.

const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 56;
const CONTENT = PAGE.width - MARGIN * 2;

const BRAND_600 = "#1f6fc4";
const BRAND_TEAL = "#14b8a6";
const INK = "#1c1917";
const MUTED = "#78716c";

/// Le QR est rendu large (600 px) puis réduit à l'échelle du PDF : à
/// l'impression, un bitmap sous-dimensionné donnerait des bords crénelés que
/// certains lecteurs peinent à décoder.
async function renderQrCode(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 600,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

export async function buildJoinPosterPdf(params: {
  schoolName: string;
  joinCode: string;
  joinUrl: string;
  /// Logo de l'école (ou sa substitution) et logo vertical de la plateforme,
  /// cf. lib/export-logos.ts.
  schoolLogo: LoadedLogo | null;
  platformLogo: LoadedLogo | null;
}): Promise<Buffer> {
  const { schoolName, joinCode, joinUrl, schoolLogo, platformLogo } = params;
  const qr = await renderQrCode(joinUrl);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: MARGIN });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Filet dégradé en tête, aux couleurs de la plateforme.
    const band = doc.linearGradient(0, 0, PAGE.width, 0);
    band.stop(0, BRAND_600).stop(1, BRAND_TEAL);
    doc.rect(0, 0, PAGE.width, 8).fill(band);

    // --- En-tête : logo de l'école ----------------------------------------
    // `fit` conserve le rapport d'aspect : l'image est réduite pour tenir dans
    // la boîte, jamais rognée. `align`/`valign` la centrent dans cette boîte,
    // ce qui évite de calculer nous-mêmes ses dimensions mises à l'échelle.
    let y = 54;
    if (schoolLogo) {
      doc.image(schoolLogo.buffer, MARGIN, y, {
        fit: [CONTENT, 110],
        align: "center",
        valign: "center",
      });
      y += 110;
    }

    y += 26;
    doc
      .fillColor(INK)
      .font("Helvetica-Bold")
      .fontSize(21)
      .text(schoolName, MARGIN, y, { width: CONTENT, align: "center" });

    y = doc.y + 14;
    doc
      .fillColor(BRAND_600)
      .font("Helvetica-Bold")
      .fontSize(15)
      .text("Enregistrez vos périodes de travail collaboratif", MARGIN, y, {
        width: CONTENT,
        align: "center",
      });

    y = doc.y + 10;
    doc
      .fillColor(MUTED)
      .font("Helvetica")
      .fontSize(11)
      .text(
        "Scannez ce code avec l'appareil photo de votre téléphone : le formulaire " +
          "d'inscription s'ouvre avec le code de l'école déjà rempli.",
        MARGIN,
        y,
        { width: CONTENT, align: "center", lineGap: 3 }
      );

    // --- QR code ----------------------------------------------------------
    const QR_SIZE = 268;
    const qrX = (PAGE.width - QR_SIZE) / 2;
    y = doc.y + 30;
    // Cadre clair : détache le QR du papier et guide le cadrage à l'écran.
    doc
      .roundedRect(qrX - 14, y - 14, QR_SIZE + 28, QR_SIZE + 28, 14)
      .lineWidth(1)
      .strokeColor("#e7e5e4")
      .stroke();
    doc.image(qr, qrX, y, { width: QR_SIZE, height: QR_SIZE });
    y += QR_SIZE + 38;

    // --- Repli sans smartphone -------------------------------------------
    doc
      .fillColor(MUTED)
      .font("Helvetica")
      .fontSize(10.5)
      .text("Ou rendez-vous sur travail-collaboratif.be avec le code", MARGIN, y, {
        width: CONTENT,
        align: "center",
      });

    y = doc.y + 8;
    doc
      .fillColor(INK)
      .font("Courier-Bold")
      .fontSize(26)
      .text(joinCode, MARGIN, y, { width: CONTENT, align: "center", characterSpacing: 3 });

    // --- Pied de page : logo de la plateforme -----------------------------
    // Ancré au bas de la page plutôt qu'à la suite du contenu : l'affiche doit
    // avoir la même allure quelle que soit la longueur du nom de l'école.
    const footerTop = PAGE.height - MARGIN - 96;
    doc
      .moveTo(MARGIN, footerTop)
      .lineTo(PAGE.width - MARGIN, footerTop)
      .lineWidth(1)
      .strokeColor("#e7e5e4")
      .stroke();

    if (platformLogo) {
      doc.image(platformLogo.buffer, MARGIN, footerTop + 16, {
        fit: [CONTENT, 52],
        align: "center",
        valign: "center",
      });
    }

    doc
      .fillColor(MUTED)
      .font("Helvetica")
      .fontSize(9)
      .text("travail-collaboratif.be — plateforme gratuite", MARGIN, footerTop + 74, {
        width: CONTENT,
        align: "center",
      });

    doc.end();
  });
}
