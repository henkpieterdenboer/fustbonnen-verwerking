import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, fustItems } from "@/lib/db/schema";
import { desc, inArray } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    const results = await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.transactiedatum))
      .limit(limit)
      .offset(offset);

    // Fetch fust items for all returned transactions
    const transactionIds = results.map((t) => t.id);
    const allFustItems =
      transactionIds.length > 0
        ? await db
            .select()
            .from(fustItems)
            .where(inArray(fustItems.transaction_id, transactionIds))
        : [];

    // Group fust items by transaction_id
    const fustItemsByTransaction: Record<number, typeof allFustItems> = {};
    for (const item of allFustItems) {
      if (!fustItemsByTransaction[item.transaction_id]) {
        fustItemsByTransaction[item.transaction_id] = [];
      }
      fustItemsByTransaction[item.transaction_id].push(item);
    }

    const data = results.map((t) => ({
      ...t,
      raw_text: undefined,
      fust_items: fustItemsByTransaction[t.id] || [],
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
