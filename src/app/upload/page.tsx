"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

interface UploadResult {
  file: string;
  success: boolean;
  data?: { id: number; transactienummer: string; document_type: string };
  error?: string;
}

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);

  const handleUpload = useCallback(async (files: FileList | File[]) => {
    const pdfFiles = Array.from(files).filter((f) => f.type === "application/pdf");
    if (pdfFiles.length === 0) return;

    setIsUploading(true);
    setResults([]);

    const formData = new FormData();
    pdfFiles.forEach((f) => formData.append("files", f));

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([{ file: "Upload", success: false, error: "Netwerkfout" }]);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleUpload(e.dataTransfer.files);
    },
    [handleUpload]
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">PDF Uploaden</h2>
        <Link
          href="/transactions"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Bekijk transacties &rarr;
        </Link>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 bg-white"
        }`}
      >
        {isUploading ? (
          <div className="text-gray-600">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-3" />
            <p>Verwerken...</p>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-2">
              Sleep PDF-bestanden hierheen
            </p>
            <p className="text-gray-400 text-sm mb-4">of</p>
            <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
              Bestanden kiezen
              <input
                type="file"
                accept=".pdf"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleUpload(e.target.files)}
              />
            </label>
            <p className="text-gray-400 text-xs mt-3">
              Meerdere bestanden tegelijk mogelijk
            </p>
          </>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <span className="text-sm font-medium text-gray-700">
              {results.filter((r) => r.success).length} van {results.length} verwerkt
            </span>
          </div>
          <ul className="divide-y divide-gray-200">
            {results.map((r, i) => (
              <li key={i} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold ${
                      r.success
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {r.success ? "\u2713" : "\u2717"}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{r.file}</p>
                    {r.success && r.data && (
                      <p className="text-xs text-gray-500">
                        {r.data.document_type} — {r.data.transactienummer}
                      </p>
                    )}
                    {!r.success && (
                      <p className="text-xs text-red-600">{r.error}</p>
                    )}
                  </div>
                </div>
                {r.success && r.data && (
                  <Link
                    href={`/transactions/${r.data.id}`}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Bekijken
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
