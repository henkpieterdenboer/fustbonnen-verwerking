import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { transactions, fustItems } from "@/lib/db/schema";
import { parsePdf } from "@/lib/pdf-parser";
import { validateApiKey } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const base64Pdf = body.pdf;

    if (!base64Pdf) {
      return NextResponse.json(
        { success: false, error: "Missing pdf field in request body" },
        { status: 400 }
      );
    }

    const pdfBuffer = Buffer.from(base64Pdf, "base64");
    const parsed = await parsePdf(pdfBuffer);

    // Upload PDF to Vercel Blob
    const blob = await put(
      `invoices/${parsed.transactienummer}.pdf`,
      pdfBuffer,
      { access: "public", contentType: "application/pdf" }
    );

    // Insert transaction into database
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

    return NextResponse.json({
      success: true,
      data: {
        id: inserted.id,
        transactienummer: parsed.transactienummer,
        document_type: parsed.document_type,
        pdf_url: blob.url,
        fust_items: parsed.fust_items,
      },
    });
  } catch (error: unknown) {
    // Duplicate transactienummer (Postgres unique violation)
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "23505"
    ) {
      return NextResponse.json(
        { success: false, error: "Duplicate transactienummer" },
        { status: 409 }
      );
    }

    console.error("Error processing invoice:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
