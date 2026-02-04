import init, { calculate_gc_content } from "../binaries/gc_calculator/gc_calculator.js";

interface GcResult {
  name: string;
  length: number;
  gc_count: number;
  gc_content: number;
}

export const tool = {
  id: "gc_calculator",
  name: "GC Calculator",
  description: "GC content of FASTA sequences",

  async init(): Promise<void> {
    await init();
  },

  render(container: HTMLElement): void {
    container.innerHTML =
      '<input type="file" class="fasta-input" accept=".fasta,.fa,.fna">' +
      '<div class="status">Select a FASTA file to begin.</div>' +
      '<div class="results"></div>';

    const input = container.querySelector(".fasta-input") as HTMLInputElement;
    const status = container.querySelector(".status")!;
    const resultsDiv = container.querySelector(".results")!;

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
  },
};

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
