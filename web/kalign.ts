// Kalign multiple-sequence aligner, loaded at runtime via aioli.
// The binary is fetched from the biowasm CDN; see tools/kalign/download.sh
// for the equivalent local copy that mirrors the tools/*/pkg/ convention.

let cli: Aioli | null = null;

// Core logic — exported so it can be unit-tested without a browser.
export async function align(instance: Aioli, input: string): Promise<string> {
  await instance.mount([{ name: "input.fa", data: input }]);
  return instance.exec("kalign input.fa -f fasta");
}

export const tool = {
  id: "kalign",
  name: "Kalign Aligner",
  description: "Multiple sequence alignment",

  // Declared here so main.ts can collect all aioli specs before constructing
  // the single shared instance.
  aioliTools: ["kalign/3.3.1"],

  async init(sharedCli?: Aioli): Promise<void> {
    if (!sharedCli) throw new Error("Aioli instance not provided to kalign.init()");
    cli = sharedCli;
  },

  render(container: HTMLElement): void {
    container.innerHTML =
      '<input type="file" class="fasta-input" accept=".fasta,.fa,.fna">' +
      '<button class="run-btn" disabled>Align</button>' +
      '<div class="status">Select a FASTA file to begin.</div>' +
      '<div class="results"></div>';

    const input = container.querySelector(".fasta-input") as HTMLInputElement;
    const btn = container.querySelector(".run-btn") as HTMLButtonElement;
    const status = container.querySelector(".status")!;
    const resultsDiv = container.querySelector(".results")!;

    let fileContent: string | null = null;

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;
      btn.disabled = false;
      const reader = new FileReader();
      reader.onload = () => {
        fileContent = reader.result as string;
      };
      reader.readAsText(file);
    });

    btn.addEventListener("click", async () => {
      if (!fileContent || !cli) return;
      btn.disabled = true;
      resultsDiv.innerHTML = "";

      try {
        status.textContent = "Aligning…";
        const aligned = await align(cli, fileContent);

        status.textContent = "Alignment complete.";

        let html =
          '<button class="run-btn download-btn">Download aligned FASTA</button>';
        html += `<pre>${escapeHtml(aligned)}</pre>`;
        resultsDiv.innerHTML = html;

        resultsDiv.querySelector(".download-btn")!.addEventListener("click", () => {
          downloadFile("aligned.fasta", aligned);
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        status.textContent = `Error: ${msg}`;
        console.error("[kalign]", e);
      }

      btn.disabled = false;
    });
  },
};

function downloadFile(name: string, content: string): void {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
