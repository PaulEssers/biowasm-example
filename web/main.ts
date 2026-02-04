// wasm-pack output is copied into web/tools/<name>/ at build time so that the
// dev server can serve web/ as its root.  The .d.ts declarations ship alongside
// the .js glue, so TypeScript resolves types automatically.
import init, { calculate_gc_content } from "./tools/gc_calculator/gc_calculator.js";

interface GcResult {
  name: string;
  length: number;
  gc_count: number;
  gc_content: number;
}

async function main(): Promise<void> {
  await init();

  const input = document.getElementById("fastaInput") as HTMLInputElement;
  const status = document.getElementById("status")!;
  const resultsDiv = document.getElementById("results")!;

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;

    status.textContent = "Reading file…";
    resultsDiv.innerHTML = "";

    const reader = new FileReader();
    reader.onload = () => {
      const results: GcResult[] = JSON.parse(
        calculate_gc_content(reader.result as string),
      );

      if (results.length === 0) {
        status.textContent = "No sequences found in file.";
        return;
      }

      status.textContent = `Found ${results.length} sequence(s).`;

      let html =
        "<table>" +
        "<thead><tr>" +
        "<th>Sequence</th>" +
        "<th>Length (bp)</th>" +
        "<th>GC Count</th>" +
        "<th>GC Content</th>" +
        "</tr></thead>" +
        "<tbody>";

      for (const r of results) {
        const pct = (r.gc_content * 100).toFixed(2);
        html +=
          "<tr>" +
          `<td>${escapeHtml(r.name)}</td>` +
          `<td>${r.length}</td>` +
          `<td>${r.gc_count}</td>` +
          `<td>${pct}%</td>` +
          "</tr>";
      }

      html += "</tbody></table>";
      resultsDiv.innerHTML = html;
    };
    reader.readAsText(file);
  });
}

// Prevent XSS if a FASTA header ever contains HTML-like characters.
function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

main();
