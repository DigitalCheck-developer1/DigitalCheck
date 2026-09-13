import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";
import type { CategoryKey, DigitalCheckReport } from "@/types";
import { scoreLabel } from "@/lib/scoring/weights";

const MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const INK = rgb(0x14 / 255, 0x17 / 255, 0x1c / 255);
const INK_SOFT = rgb(0x3a / 255, 0x3f / 255, 0x47 / 255);
const ACCENT = rgb(0x1f / 255, 0x6f / 255, 0x64 / 255);
const LINE = rgb(0xe3 / 255, 0xe0 / 255, 0xd8 / 255);

const SEVERITY_COLOR = {
  high: rgb(0xb4 / 255, 0x48 / 255, 0x3f / 255),
  medium: rgb(0xc9 / 255, 0x7a / 255, 0x3d / 255),
  low: rgb(0x3f / 255, 0x7d / 255, 0x8f / 255),
} as const;

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  seo: "SEO",
  performance: "Performance",
  mobile: "Mobile",
  content: "Contenuti",
  conversion: "Conversione",
  accessibility: "Accessibilita'",
  technical: "Tecnica",
};

class PdfCursor {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  fontRegular: PDFFont;
  fontBold: PDFFont;

  constructor(doc: PDFDocument, page: PDFPage, fontRegular: PDFFont, fontBold: PDFFont) {
    this.doc = doc;
    this.page = page;
    this.y = PAGE_HEIGHT - MARGIN;
    this.fontRegular = fontRegular;
    this.fontBold = fontBold;
  }

  ensureSpace(height: number) {
    if (this.y - height < MARGIN) {
      this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      this.y = PAGE_HEIGHT - MARGIN;
    }
  }

  private wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  text(
    value: string,
    opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; gap?: number; maxWidth?: number } = {}
  ) {
    const size = opts.size ?? 11;
    const font = opts.bold ? this.fontBold : this.fontRegular;
    const color = opts.color ?? INK;
    const maxWidth = opts.maxWidth ?? CONTENT_WIDTH;
    const lineHeight = size * 1.35;

    const lines = this.wrapText(value, font, size, maxWidth);
    for (const line of lines) {
      this.ensureSpace(lineHeight);
      this.page.drawText(line, { x: MARGIN, y: this.y - size, size, font, color });
      this.y -= lineHeight;
    }
    this.y -= opts.gap ?? 4;
  }

  divider() {
    this.ensureSpace(20);
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: 0.75,
      color: LINE,
    });
    this.y -= 16;
  }
}

export async function generateReportPdf(report: DigitalCheckReport): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const cursor = new PdfCursor(doc, page, fontRegular, fontBold);

  // Header
  cursor.text("DigitalCheck", { size: 20, bold: true, color: ACCENT, gap: 2 });
  cursor.text(report.requestedUrl, { size: 12, color: INK_SOFT, gap: 2 });
  cursor.text(
    `Report generato il ${new Date(report.generatedAt).toLocaleDateString("it-IT")} · ${report.pagesAnalyzed} pagine analizzate`,
    { size: 10, color: INK_SOFT, gap: 14 }
  );

  // Score
  cursor.text(`Digital Score: ${report.overallScore}/100 — ${scoreLabel(report.overallScore)}`, {
    size: 16,
    bold: true,
    gap: 10,
  });
  cursor.divider();

  // Executive summary
  cursor.text("Riepilogo", { size: 13, bold: true, gap: 4 });
  cursor.text(report.businessImpactSummary, { size: 11, color: INK_SOFT, gap: 14 });

  // Category scores
  cursor.text("Punteggi per categoria", { size: 13, bold: true, gap: 6 });
  for (const c of report.categoryScores) {
    const verifiedNote = c.verified ? "" : "  (stima, non verificato)";
    cursor.text(`${CATEGORY_LABELS[c.category]}: ${c.score}/100${verifiedNote}`, {
      size: 11,
      color: INK_SOFT,
      gap: 2,
    });
  }
  cursor.y -= 8;
  cursor.divider();

  // Strengths
  if (report.strengths.length > 0) {
    cursor.text("Punti di forza", { size: 13, bold: true, gap: 6 });
    for (const s of report.strengths) {
      cursor.text(`•  ${s}`, { size: 11, color: INK_SOFT, gap: 4 });
    }
    cursor.y -= 6;
  }

  // Issues
  cursor.text("Problemi individuati", { size: 13, bold: true, gap: 8 });
  for (const issue of report.issues) {
    cursor.ensureSpace(60);
    cursor.text(issue.title, { size: 12, bold: true, gap: 2 });
    cursor.text(
      `Priorita': ${issue.severity === "high" ? "Alta" : issue.severity === "medium" ? "Media" : "Bassa"}`,
      { size: 9, color: SEVERITY_COLOR[issue.severity], gap: 3 }
    );
    cursor.text(issue.description, { size: 10, color: INK_SOFT, gap: 3 });
    cursor.text(`Azione consigliata: ${issue.recommendation}`, { size: 10, gap: 12 });
  }

  cursor.divider();

  // Recommended actions
  if (report.recommendedActions.length > 0) {
    cursor.text("Azioni consigliate (in ordine di priorita')", { size: 13, bold: true, gap: 6 });
    report.recommendedActions.forEach((action, i) => {
      cursor.text(`${i + 1}. ${action}`, { size: 11, color: INK_SOFT, gap: 4 });
    });
  }

  // Unverifiable disclosures
  if (report.unverifiable.length > 0) {
    cursor.y -= 6;
    cursor.text("Cosa non e' stato possibile verificare automaticamente", {
      size: 12,
      bold: true,
      gap: 4,
    });
    for (const u of report.unverifiable) {
      cursor.text(`•  ${u}`, { size: 9, color: INK_SOFT, gap: 3 });
    }
  }

  return doc.save();
}
