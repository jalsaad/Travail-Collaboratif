import PDFDocument from "pdfkit";
import type { LoadedLogo } from "@/lib/export-logos";

export type ExportPeriodRow = {
  date: Date;
  type: string;
  description: string;
  dureePeriodes: string;
  status: "validee" | "attente";
  participants: string;
};

export type ExportHeaderLogos = {
  left: LoadedLogo | null;
  right: LoadedLogo | null;
};

const statusLabel = (status: ExportPeriodRow["status"]) =>
  status === "validee" ? "Validée" : "En attente";

const COLUMN_WIDTHS = [65, 90, 150, 45, 55, 110];
const COLUMN_LABELS = ["Date", "Type", "Description", "Durée", "Statut", "Participants"];
const PAGE_MARGIN = 40;
const PDF_HEADER_LOGO_BOX = 55;

export function buildPeriodsPdf(
  rows: ExportPeriodRow[],
  title: string,
  logos?: ExportHeaderLogos
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: PAGE_MARGIN, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    let headerBottom = PAGE_MARGIN;
    if (logos?.left) {
      doc.image(logos.left.buffer, PAGE_MARGIN, PAGE_MARGIN, { fit: [60, PDF_HEADER_LOGO_BOX] });
      headerBottom = Math.max(headerBottom, PAGE_MARGIN + PDF_HEADER_LOGO_BOX);
    }
    if (logos?.right) {
      const rightWidth = 45;
      doc.image(logos.right.buffer, doc.page.width - PAGE_MARGIN - rightWidth, PAGE_MARGIN, {
        fit: [rightWidth, PDF_HEADER_LOGO_BOX],
      });
      headerBottom = Math.max(headerBottom, PAGE_MARGIN + PDF_HEADER_LOGO_BOX);
    }

    doc.y = headerBottom + 10;
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .text(title, PAGE_MARGIN, doc.y, { width: doc.page.width - PAGE_MARGIN * 2, align: "center" });
    doc.moveDown(0.8);

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
        row.type,
        row.description,
        row.dureePeriodes,
        statusLabel(row.status),
        row.participants,
      ];

      const heights = cells.map((cell, i) => doc.heightOfString(cell, { width: COLUMN_WIDTHS[i] }));
      const rowHeight = Math.max(...heights, 12);

      if (doc.y + rowHeight > doc.page.height - PAGE_MARGIN) {
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
