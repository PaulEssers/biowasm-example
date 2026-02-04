import { tool as gcCalculator } from "./tools/gc_calculator.js";
import { tool as kalign } from "./tools/kalign.js";

// ?debug in the URL enables verbose logging (both ours and aioli's internals).
const DEBUG = new URLSearchParams(location.search).has("debug");

// Each tool module exports an object conforming to this shape.
// init() is called once (lazily, on first sidebar click).
// render() is called once immediately after; the container persists.
interface Tool {
  id: string;
  name: string;
  description: string;
  aioliTools?: string[];            // e.g. ["muscle/5.1.0"] — omit for wasm-pack tools
  init(cli?: Aioli): Promise<void>; // cli is the shared Aioli instance (undefined for wasm-pack tools)
  render(container: HTMLElement): void;
}

const TOOLS: Tool[] = [gcCalculator, kalign];

// ---------------------------------------------------------------------------
// Shared Aioli instance — all C/C++ tools run in one WebWorker with a shared
// virtual filesystem so that output from one tool can be piped into the next.
// Created lazily (on first C/C++ tool click) so a wasm-pack-only page pays
// nothing.
// ---------------------------------------------------------------------------
let sharedAioli: Aioli | undefined;

async function ensureAioli(): Promise<Aioli> {
  if (!sharedAioli) {
    const specs = TOOLS.flatMap((t) => t.aioliTools ?? []);
    if (DEBUG) console.log("[aioli] initializing with", specs);
    // Serve binaries from the local dev server instead of the biowasm CDN.
    // Aioli resolves each tool spec as <urlCDN>/<name>/<version>/<name>.{js,wasm}.
    const urlCDN = new URL("binaries", location.href).href;
    sharedAioli = await new Aioli(specs, { urlCDN, debug: DEBUG });
  }
  return sharedAioli;
}

async function main(): Promise<void> {
  const sidebar = document.getElementById("sidebar")!;
  const toolArea = document.getElementById("tool-area")!;

  const initialized = new Set<string>();
  let activeId: string | null = null;

  for (const tool of TOOLS) {
    // --- sidebar button ---
    const btn = document.createElement("button");
    btn.dataset.toolId = tool.id;
    btn.innerHTML =
      escapeHtml(tool.name) +
      `<span class="desc">${escapeHtml(tool.description)}</span>`;
    sidebar.appendChild(btn);

    // --- persistent panel (shown/hidden on switch) ---
    const panel = document.createElement("div");
    panel.className = "tool-panel";
    toolArea.appendChild(panel);

    btn.addEventListener("click", async () => {
      // lazy init + render on first activation
      if (!initialized.has(tool.id)) {
        btn.classList.add("loading");
        try {
          const cli = tool.aioliTools ? await ensureAioli() : undefined;
          await tool.init(cli);
          tool.render(panel);
          initialized.add(tool.id);
        } catch (e: unknown) {
          panel.textContent = `Failed to load: ${e instanceof Error ? e.message : String(e)}`;
          console.error("[main] tool init failed", tool.id, e);
        }
        btn.classList.remove("loading");
      }

      // swap active panel
      if (activeId !== tool.id) {
        document.querySelectorAll(".tool-panel").forEach((p) =>
          p.classList.remove("active"),
        );
        document.querySelectorAll("#sidebar button").forEach((b) =>
          b.classList.remove("active"),
        );
        panel.classList.add("active");
        btn.classList.add("active");
        activeId = tool.id;
      }
    });
  }

  // auto-select first tool
  sidebar.querySelector("button")?.click();
}

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

main();
