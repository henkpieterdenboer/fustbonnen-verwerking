import { NextRequest, NextResponse } from "next/server";
import { parsePdf } from "@/lib/pdf-parser";

export async function POST(request: NextRequest) {
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

    return NextResponse.json({
      success: true,
      data: parsed,
    });
  } catch (error: unknown) {
    console.error("Error parsing PDF:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
