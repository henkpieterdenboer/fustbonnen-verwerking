import { db } from "@/lib/db";
import { transactions, fustItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const txId = parseInt(id);
  if (isNaN(txId)) notFound();

  const [tx] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, txId))
    .limit(1);

  if (!tx) notFound();

  const items = await db
    .select()
    .from(fustItems)
    .where(eq(fustItems.transaction_id, txId));

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

  const typeColors: Record<string, string> = {
    "BON UITGIFTE": "bg-green-100 text-green-800",
    "BON INNAME": "bg-red-100 text-red-800",
    "FUSTBON Overboeking": "bg-blue-100 text-blue-800",
  };

  const fields = [
    { label: "Transactienummer", value: tx.transactienummer },
    { label: "Document type", value: tx.document_type, badge: true },
    { label: "Transactiedatum", value: formatDate(tx.transactiedatum) },
    { label: "Creatiedatum", value: formatDate(tx.creatiedatum) },
    {
      label: "Klant van",
      value:
        tx.klantnaam_van && tx.klantnummer_van
          ? `${tx.klantnaam_van} (${tx.klantnummer_van})`
          : null,
    },
    {
      label: "Klant naar",
      value:
        tx.klantnaam_naar && tx.klantnummer_naar
          ? `${tx.klantnaam_naar} (${tx.klantnummer_naar})`
          : null,
    },
    { label: "Locatie", value: tx.locatie },
    { label: "Transporteur", value: tx.transporteur },
    { label: "Pasnummer", value: tx.pasnummer },
    { label: "Gerelateerd Tr.nr.", value: tx.gerelateerd_tr_nr },
    { label: "Correctie reden", value: tx.correctie_reden },
    { label: "Opmerkingen", value: tx.opmerkingen },
  ];

  return (
    <div>
      <Link
        href="/transactions"
        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mb-4"
      >
        &larr; Terug naar overzicht
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Transactie {tx.transactienummer}
          </h2>

          <dl className="divide-y divide-gray-100">
            {fields.map(
              (field) =>
                field.value && (
                  <div
                    key={field.label}
                    className="py-3 grid grid-cols-3 gap-4"
                  >
                    <dt className="text-sm font-medium text-gray-500">
                      {field.label}
                    </dt>
                    <dd className="text-sm text-gray-900 col-span-2">
                      {field.badge ? (
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${typeColors[field.value] || "bg-gray-100 text-gray-800"}`}
                        >
                          {field.value}
                        </span>
                      ) : (
                        field.value
                      )}
                    </dd>
                  </div>
                )
            )}
          </dl>

          {/* Fust items table */}
          <h3 className="text-md font-semibold text-gray-900 mt-6 mb-3">
            Fust-items
          </h3>
          {items.length === 0 ? (
            <p className="text-sm text-gray-500">Geen fust-items.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Fustcode
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Omschrijving
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Stuks
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2 text-sm font-mono text-gray-900">
                      {item.fustcode}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {item.description}
                    </td>
                    <td
                      className={`px-4 py-2 text-sm text-right font-mono ${item.stuks < 0 ? "text-red-600" : "text-gray-900"}`}
                    >
                      {item.stuks.toLocaleString("nl-NL")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* PDF preview */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            PDF Preview
          </h2>
          {tx.pdf_url ? (
            <iframe
              src={tx.pdf_url}
              className="w-full h-[800px] border border-gray-200 rounded"
              title={`PDF ${tx.transactienummer}`}
            />
          ) : (
            <p className="text-sm text-gray-500">Geen PDF beschikbaar.</p>
          )}
        </div>
      </div>
    </div>
  );
}
