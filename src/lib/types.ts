export interface FustItem {
  fustcode: string;
  description: string;
  stuks: number;
}

export interface ParsedTransaction {
  transactienummer: string;
  document_type: string;
  klantnummer_van: string | null;
  klantnaam_van: string | null;
  klantnummer_naar: string | null;
  klantnaam_naar: string | null;
  locatie: string | null;
  transporteur: string | null;
  pasnummer: string | null;
  transactiedatum: Date | null;
  creatiedatum: Date | null;
  gerelateerd_tr_nr: string | null;
  correctie_reden: string | null;
  opmerkingen: string | null;
  raw_text: string;
  fust_items: FustItem[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
