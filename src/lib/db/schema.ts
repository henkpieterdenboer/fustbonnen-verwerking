import { pgTable, serial, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  transactienummer: varchar("transactienummer", { length: 20 }).unique().notNull(),
  document_type: varchar("document_type", { length: 30 }).notNull(),
  klantnummer_van: varchar("klantnummer_van", { length: 20 }),
  klantnaam_van: varchar("klantnaam_van", { length: 255 }),
  klantnummer_naar: varchar("klantnummer_naar", { length: 20 }),
  klantnaam_naar: varchar("klantnaam_naar", { length: 255 }),
  locatie: varchar("locatie", { length: 100 }),
  transporteur: varchar("transporteur", { length: 255 }),
  pasnummer: varchar("pasnummer", { length: 100 }),
  transactiedatum: timestamp("transactiedatum", { withTimezone: true }),
  creatiedatum: timestamp("creatiedatum", { withTimezone: true }),
  gerelateerd_tr_nr: varchar("gerelateerd_tr_nr", { length: 20 }),
  correctie_reden: text("correctie_reden"),
  opmerkingen: text("opmerkingen"),
  raw_text: text("raw_text"),
  pdf_url: text("pdf_url"),
});

export const fustItems = pgTable("fust_items", {
  id: serial("id").primaryKey(),
  transaction_id: integer("transaction_id")
    .references(() => transactions.id, { onDelete: "cascade" })
    .notNull(),
  fustcode: varchar("fustcode", { length: 10 }).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  stuks: integer("stuks").notNull(),
});
