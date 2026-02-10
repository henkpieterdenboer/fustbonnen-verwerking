import { db } from "@/lib/db";
import { transactions, fustItems } from "@/lib/db/schema";
import { desc, inArray } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const results = await db
    .select()
    .from(transactions)
    .orderBy(desc(transactions.transactiedatum))
    .limit(100);

  const transactionIds = results.map((t) => t.id);
  const allFustItems =
    transactionIds.length > 0
      ? await db
          .select()
          .from(fustItems)
          .where(inArray(fustItems.transaction_id, transactionIds))
      : [];

  const fustByTx: Record<number, typeof allFustItems> = {};
  for (const item of allFustItems) {
    if (!fustByTx[item.transaction_id]) fustByTx[item.transaction_id] = [];
    fustByTx[item.transaction_id].push(item);
  }

  function formatDate(date: Date | null) {
    if (!date) return "—";
    return new Intl.DateTimeFormat("nl-NL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  }

  function fustSummary(items: typeof allFustItems) {
    if (!items || items.length === 0) return "—";
    return items.map((i) => `${i.fustcode}: ${i.stuks}`).join(", ");
  }

  const typeColors: Record<string, string> = {
    "BON UITGIFTE": "bg-green-100 text-green-800",
    "BON INNAME": "bg-red-100 text-red-800",
    "FUSTBON Overboeking": "bg-blue-100 text-blue-800",
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">
          Alle transacties ({results.length})
        </h2>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Nog geen transacties verwerkt.
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transactienr
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Datum
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Van
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Naar
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transporteur
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fust
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link
                      href={`/transactions/${tx.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {tx.transactienummer}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${typeColors[tx.document_type] || "bg-gray-100 text-gray-800"}`}
                    >
                      {tx.document_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(tx.transactiedatum)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {tx.klantnaam_van
                      ? `${tx.klantnaam_van} (${tx.klantnummer_van})`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {tx.klantnaam_naar
                      ? `${tx.klantnaam_naar} (${tx.klantnummer_naar})`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {tx.transporteur || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                    {fustSummary(fustByTx[tx.id] || [])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
