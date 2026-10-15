import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export interface SignInput {
  title: string;
  /** The exact text the signer reviewed. Its hash goes in the audit trail. */
  text: string;
  signer: { name: string; email: string };
  signature: { method: "drawn" | "typed"; value: string };
  signedAt: Date;
  userAgent: string;
  agency: string;
}

export const CONSENT =
  "I agree to sign electronically. My e-signature is as valid as my handwritten one.";

export async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const INK = rgb(0.075, 0.14, 0.12);
const MUTED = rgb(0.36, 0.42, 0.4);
const M = 56; // page margin in points

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  for (const para of text.split(/\n+/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > width && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
  }
  return lines;
}

/** Builds the signed PDF: the document, the signature, then an audit-trail page. Returns a data URL and the document hash. */
export async function buildSignedPdf(input: SignInput) {
  const hash = await sha256(input.text);
  const pdf = await PDFDocument.create();
  pdf.setTitle(input.title);
  pdf.setAuthor(input.signer.name);
  pdf.setProducer(`${input.agency} HQ`);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const script = await pdf.embedFont(StandardFonts.TimesRomanItalic);

  let page: PDFPage = pdf.addPage([612, 792]);
  let y = 792 - M;
  const width = 612 - 2 * M;
  const write = (text: string, font = regular, size = 11, color = INK) => {
    for (const line of wrap(text, font, size, width)) {
      if (y < M + 40) {
        page = pdf.addPage([612, 792]);
        y = 792 - M;
      }
      page.drawText(line, { x: M, y, size, font, color });
      y -= size * 1.45;
    }
  };

  write(input.title, bold, 16);
  y -= 6;
  write(input.text);
  y -= 24;

  if (y < M + 120) {
    page = pdf.addPage([612, 792]);
    y = 792 - M;
  }
  write("Signed electronically", bold, 12);
  y -= 4;
  if (input.signature.method === "drawn") {
    const png = await pdf.embedPng(input.signature.value);
    const h = 60, w = (png.width / png.height) * h;
    page.drawImage(png, { x: M, y: y - h + 10, width: Math.min(w, 260), height: h });
    y -= h + 4;
  } else {
    page.drawText(input.signature.value, { x: M, y: y - 18, size: 26, font: script, color: INK });
    y -= 36;
  }
  page.drawLine({ start: { x: M, y }, end: { x: M + 260, y }, thickness: 0.8, color: INK });
  y -= 14;
  write(`${input.signer.name} · ${input.signedAt.toUTCString()}`, regular, 10, MUTED);

  page = pdf.addPage([612, 792]);
  y = 792 - M;
  write("Audit trail", bold, 16);
  y -= 6;
  const rows: [string, string][] = [
    ["Document", input.title],
    ["Document SHA-256", hash],
    ["Signer", `${input.signer.name} <${input.signer.email}>`],
    ["Signature method", input.signature.method === "drawn" ? "Drawn on screen" : "Typed name"],
    ["Consent", CONSENT],
    ["Signed at (UTC)", input.signedAt.toISOString()],
    ["Device", input.userAgent],
    ["Platform", `${input.agency} HQ`],
  ];
  for (const [k, v] of rows) {
    write(k, bold, 10, MUTED);
    write(v, regular, 10);
    y -= 6;
  }

  const dataUrl = await pdf.saveAsBase64({ dataUri: true });
  return { dataUrl, hash };
}
