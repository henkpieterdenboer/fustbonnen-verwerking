// Import directly from lib to avoid pdf-parse loading a test file on import
// (causes ENOENT on Vercel serverless)
import pdf from "pdf-parse/lib/pdf-parse.js";
import { ParsedTransaction, FustItem } from "./types";

const DUTCH_MONTHS: Record<string, string> = {
  jan: "Jan", feb: "Feb", mrt: "Mar", apr: "Apr",
  mei: "May", jun: "Jun", jul: "Jul", aug: "Aug",
  sep: "Sep", okt: "Oct", nov: "Nov", dec: "Dec",
};

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  let cleaned = dateStr.replace(/\s*uur$/, "").trim();

  for (const [nl, en] of Object.entries(DUTCH_MONTHS)) {
    cleaned = cleaned.replace(new RegExp(`-${nl}-`, "i"), `-${en}-`);
  }

  const match = cleaned.match(/^(\d{1,2})-(\w+)-(\d{2})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, day, month, , hours, minutes] = match;
  const fullYear = parseInt(match[3]) + 2000;

  const parsed = new Date(`${month} ${day}, ${fullYear} ${hours}:${minutes}:00 +02:00`);
  if (isNaN(parsed.getTime())) return null;

  return parsed;
}

function parseStuks(value: string): number {
  const cleaned = value.replace(/[.,]/g, "");
  return parseInt(cleaned, 10);
}

function detectDocumentType(text: string): string {
  if (text.includes("BON UITGIFTE")) return "BON UITGIFTE";
  if (text.includes("BON INNAME")) return "BON INNAME";
  if (text.includes("FUSTBON")) return "FUSTBON Overboeking";
  throw new Error("Unknown document type");
}

function parseFustItems(text: string): FustItem[] {
  const items: FustItem[] = [];

  // Fust lines: "520 Bloemendoos 19cm726" — stuks is concatenated to description
  // Pattern: 3-digit code + space + description text + number (possibly negative, with thousand separators)
  const fustRegex = /^(\d{3})\s+(.+?)(-?[\d][\d.,]*)$/gm;
  let match;

  while ((match = fustRegex.exec(text)) !== null) {
    items.push({
      fustcode: match[1],
      description: match[2].trim(),
      stuks: parseStuks(match[3]),
    });
  }

  return items;
}

function parseBon(text: string, documentType: string): ParsedTransaction {
  const lines = text.split("\n");

  // Document type line
  const typeLineIndex = lines.findIndex((l) => l.trim() === documentType);
  const transactienummer = lines[typeLineIndex + 1]?.trim() || "";
  const locatie = lines[typeLineIndex + 2]?.trim() || null;

  // Klantnummer: line before "Klantnummer" label
  const klantnummerLabelIdx = lines.findIndex((l) => l.trim() === "Klantnummer");
  const klantnummer = klantnummerLabelIdx > 0 ? lines[klantnummerLabelIdx - 1]?.trim() || null : null;

  // Klantnaam: "KlantnaamXXX" (no space between label and value)
  const klantnaamMatch = text.match(/Klantnaam(.+)/);
  const klantnaam = klantnaamMatch?.[1]?.trim() || null;

  // Transporteur: line after "Transactienummer" label
  let transporteur: string | null = null;
  const txLabelIdx = lines.findIndex((l) => l.trim() === "Transactienummer");
  if (txLabelIdx >= 0) {
    const nextLine = lines[txLabelIdx + 1]?.trim();
    if (nextLine && nextLine !== "FustcodeStuks" && !nextLine.startsWith("Klantnaam")) {
      transporteur = nextLine;
    }
  }

  // Pasnummer: line after transporteur (F + digits pattern)
  const pasnummerMatch = text.match(/(F\d{10,}-\S+)/);
  const pasnummer = pasnummerMatch?.[1] || null;

  // Transactiedatum: first date in the text
  const transactiedatumMatch = text.match(/(\d{1,2}-\w+-\d{2}\s+\d{2}:\d{2}\s*uur)/);
  const transactiedatum = transactiedatumMatch ? parseDate(transactiedatumMatch[1]) : null;

  // Creatiedatum: "CreatiedatumDD-Mon-YY HH:MM uur" (no space after label)
  const creatiedatumMatch = text.match(/Creatiedatum(\d{1,2}-\w+-\d{2}\s+\d{2}:\d{2}\s*uur)/);
  const creatiedatum = creatiedatumMatch ? parseDate(creatiedatumMatch[1]) : null;

  // Gerelateerd Tr.nr. — usually empty, check if the next line is a number
  const gerelateerdIdx = lines.findIndex((l) => l.trim() === "Gerelateerd Tr.nr.");
  let gerelateerd_tr_nr: string | null = null;
  if (gerelateerdIdx >= 0) {
    const nextLine = lines[gerelateerdIdx + 1]?.trim();
    if (nextLine && /^\d+$/.test(nextLine)) {
      gerelateerd_tr_nr = nextLine;
    }
  }

  // Correctie reden — usually empty
  const correctieIdx = lines.findIndex((l) => l.trim() === "Correctie reden");
  let correctie_reden: string | null = null;
  if (correctieIdx >= 0) {
    const nextLine = lines[correctieIdx + 1]?.trim();
    if (nextLine && !/^\d{3}\s+/.test(nextLine)) {
      correctie_reden = nextLine;
    }
  }

  // Opmerkingen: "XXXOpmerkingen :" — text before "Opmerkingen :" on same line
  let opmerkingen: string | null = null;
  const opmerkingenMatch = text.match(/(.+?)Opmerkingen\s*:/);
  if (opmerkingenMatch) {
    const val = opmerkingenMatch[1].trim();
    // Filter out false matches from the disclaimer text
    if (val && !val.includes("Deze bon") && !val.includes("aangebracht")) {
      opmerkingen = val;
    }
  }

  // Fust items from data section (before "Deze bon is het bewijs")
  const dataSection = text.split("Deze bon is het bewijs")[0] || text;
  const fust_items = parseFustItems(dataSection);

  return {
    transactienummer,
    document_type: documentType,
    klantnummer_van: null,
    klantnaam_van: null,
    klantnummer_naar: klantnummer,
    klantnaam_naar: klantnaam,
    locatie,
    transporteur,
    pasnummer,
    transactiedatum,
    creatiedatum,
    gerelateerd_tr_nr,
    correctie_reden,
    opmerkingen,
    raw_text: text,
    fust_items,
  };
}

function parseFustbon(text: string): ParsedTransaction {
  const lines = text.split("\n");

  // FUSTBON line
  const typeLineIndex = lines.findIndex((l) => l.trim() === "FUSTBON");
  const transactienummer = lines[typeLineIndex + 1]?.trim() || "";
  const klantnaamVan = lines[typeLineIndex + 2]?.trim() || null;

  // Klantnummer van: line before "Klantnummer van" label
  const kvLabelIdx = lines.findIndex((l) => l.trim() === "Klantnummer van");
  const klantnummerVan = kvLabelIdx > 0 ? lines[kvLabelIdx - 1]?.trim() || null : null;

  // Klantnaam naar: "KlantnaamXXX" (second occurrence, after FustcodeStuks)
  // The first "Klantnaam" line is the label, the second has the actual naar name
  const klantnaamNaarMatch = text.match(/FustcodeStuks\nKlantnaam(.+)/);
  const klantnaamNaar = klantnaamNaarMatch?.[1]?.trim() || null;

  // Klantnummer naar: line after "Klantnummer naar" label
  const knLabelIdx = lines.findIndex((l) => l.trim() === "Klantnummer naar");
  const klantnummerNaar = knLabelIdx >= 0 ? lines[knLabelIdx + 1]?.trim() || null : null;

  // Transporteur: line after "Transactienummer" label
  let transporteur: string | null = null;
  const txLabelIdx = lines.findIndex((l) => l.trim() === "Transactienummer");
  if (txLabelIdx >= 0) {
    const nextLine = lines[txLabelIdx + 1]?.trim();
    if (nextLine && nextLine !== "FustcodeStuks" && !nextLine.startsWith("Klantnaam")) {
      transporteur = nextLine;
    }
  }

  // Transactiedatum
  const transactiedatumMatch = text.match(/(\d{1,2}-\w+-\d{2}\s+\d{2}:\d{2}\s*uur)/);
  const transactiedatum = transactiedatumMatch ? parseDate(transactiedatumMatch[1]) : null;

  // Creatiedatum (no space between label and value)
  const creatiedatumMatch = text.match(/Creatiedatum(\d{1,2}-\w+-\d{2}\s+\d{2}:\d{2}\s*uur)/);
  const creatiedatum = creatiedatumMatch ? parseDate(creatiedatumMatch[1]) : null;

  // Gerelateerd Tr.nr.
  const gerelateerdIdx = lines.findIndex((l) => l.trim() === "Gerelateerd Tr.nr.");
  let gerelateerd_tr_nr: string | null = null;
  if (gerelateerdIdx >= 0) {
    const nextLine = lines[gerelateerdIdx + 1]?.trim();
    if (nextLine && /^\d+$/.test(nextLine)) {
      gerelateerd_tr_nr = nextLine;
    }
  }

  // Correctie reden
  const correctieIdx = lines.findIndex((l) => l.trim() === "Correctie reden");
  let correctie_reden: string | null = null;
  if (correctieIdx >= 0) {
    const nextLine = lines[correctieIdx + 1]?.trim();
    if (nextLine && nextLine !== "Klantnummer naar" && !/^\d{3}\s+/.test(nextLine)) {
      correctie_reden = nextLine;
    }
  }

  // Opmerkingen
  let opmerkingen: string | null = null;
  const opmerkingenMatch = text.match(/(.+?)Opmerkingen\s*:/);
  if (opmerkingenMatch) {
    const val = opmerkingenMatch[1].trim();
    if (val && !val.includes("Deze bon") && !val.includes("aangebracht")) {
      opmerkingen = val;
    }
  }

  // Fust items
  const dataSection = text.split("Deze bon is het bewijs")[0] || text;
  const fust_items = parseFustItems(dataSection);

  return {
    transactienummer,
    document_type: "FUSTBON Overboeking",
    klantnummer_van: klantnummerVan,
    klantnaam_van: klantnaamVan,
    klantnummer_naar: klantnummerNaar,
    klantnaam_naar: klantnaamNaar,
    locatie: null,
    transporteur,
    pasnummer: null,
    transactiedatum,
    creatiedatum,
    gerelateerd_tr_nr,
    correctie_reden,
    opmerkingen,
    raw_text: text,
    fust_items,
  };
}

export async function parsePdf(pdfBuffer: Buffer): Promise<ParsedTransaction> {
  const data = await pdf(pdfBuffer);
  const text = data.text;

  const documentType = detectDocumentType(text);

  if (documentType === "FUSTBON Overboeking") {
    return parseFustbon(text);
  }

  return parseBon(text, documentType);
}
