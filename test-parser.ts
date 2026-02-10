import * as fs from "fs";
import * as path from "path";
import { parsePdf } from "./src/lib/pdf-parser";

const EXAMPLES_DIR = path.resolve(__dirname, "../examples");

async function main() {
  const files = fs
    .readdirSync(EXAMPLES_DIR)
    .filter((f) => f.endsWith(".pdf"))
    .sort();

  console.log(`Found ${files.length} PDF files\n`);

  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  const typeCounts: Record<string, number> = {};

  for (const file of files) {
    const filePath = path.join(EXAMPLES_DIR, file);
    const buffer = fs.readFileSync(filePath);

    try {
      const result = await parsePdf(buffer);

      typeCounts[result.document_type] =
        (typeCounts[result.document_type] || 0) + 1;

      // Validate essential fields
      if (!result.transactienummer) throw new Error("Missing transactienummer");
      if (!result.document_type) throw new Error("Missing document_type");
      if (result.fust_items.length === 0) throw new Error("No fust items found");

      console.log(
        `OK  ${file} → ${result.document_type} | ${result.transactienummer} | ` +
          `fust: ${result.fust_items.map((i) => `${i.fustcode}:${i.stuks}`).join(", ")} | ` +
          `naar: ${result.klantnaam_naar || "—"} | van: ${result.klantnaam_van || "—"}`
      );
      success++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`FAIL ${file} → ${msg}`);
      errors.push(`${file}: ${msg}`);
      failed++;
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Results: ${success} OK, ${failed} FAILED out of ${files.length}`);
  console.log(`Types: ${JSON.stringify(typeCounts)}`);

  if (errors.length > 0) {
    console.log(`\nErrors:`);
    errors.forEach((e) => console.log(`  - ${e}`));
  }
}

main().catch(console.error);
