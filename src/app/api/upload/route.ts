import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { transactions, fustItems } from "@/lib/db/schema";
import { parsePdf } from "@/lib/pdf-parser";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: "Geen bestanden geüpload" },
        { status: 400 }
      );
    }

    const results: { file: string; success: boolean; data?: unknown; error?: string }[] = [];

    for (const file of files) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const parsed = await parsePdf(buffer);

        // Upload PDF to Vercel Blob
        const blob = await put(
          `invoices/${parsed.transactienummer}.pdf`,
          buffer,
          { access: "public", contentType: "application/pdf" }
        );

        // Insert transaction
        const [inserted] = await db
          .insert(transactions)
          .values({
            transactienummer: parsed.transactienummer,
            document_type: parsed.document_type,
            klantnummer_van: parsed.klantnummer_van,
            klantnaam_van: parsed.klantnaam_van,
            klantnummer_naar: parsed.klantnummer_naar,
            klantnaam_naar: parsed.klantnaam_naar,
            locatie: parsed.locatie,
            transporteur: parsed.transporteur,
            pasnummer: parsed.pasnummer,
            transactiedatum: parsed.transactiedatum,
            creatiedatum: parsed.creatiedatum,
            gerelateerd_tr_nr: parsed.gerelateerd_tr_nr,
            correctie_reden: parsed.correctie_reden,
            opmerkingen: parsed.opmerkingen,
            raw_text: parsed.raw_text,
            pdf_url: blob.url,
          })
          .returning();

        // Insert fust items
        if (parsed.fust_items.length > 0) {
          await db.insert(fustItems).values(
            parsed.fust_items.map((item) => ({
              transaction_id: inserted.id,
              fustcode: item.fustcode,
              description: item.description,
              stuks: item.stuks,
            }))
          );
        }

        results.push({
          file: file.name,
          success: true,
          data: {
            id: inserted.id,
            transactienummer: parsed.transactienummer,
            document_type: parsed.document_type,
            fust_items: parsed.fust_items,
          },
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const isDuplicate =
          err instanceof Error &&
          "code" in err &&
          (err as { code: string }).code === "23505";

        results.push({
          file: file.name,
          success: false,
          error: isDuplicate ? "Duplicate transactienummer" : message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    return NextResponse.json({ success: true, processed: results.length, successCount, results });
  } catch (error: unknown) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
