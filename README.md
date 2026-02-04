# wasm-example

A sandbox for running bioinformatics CLI tools in the browser via WebAssembly.

Two approaches are demonstrated side by side:

- **GC Calculator** — a Rust tool compiled with `wasm-pack`. It exports a typed
  JavaScript function; the browser calls it directly, like any other function.
- **Kalign** — a C tool compiled with Emscripten. It is a CLI program (reads
  files, writes to stdout). It runs via **Aioli**, a runtime from the
  [biowasm](https://biowasm.com) project. How that works is explained below.

---

## How Aioli runs CLI tools in the browser

Kalign is, at heart, a command-line program. In a terminal you would run it like
this:

```sh
kalign input.fa -f fasta
```

It opens `input.fa`, aligns the sequences, and prints the result to the terminal
(stdout). No browser, no JavaScript — just a program reading and writing files.

Aioli bridges that gap. It gives a CLI tool everything it needs to run inside a
browser tab: a background thread to run on, an in-memory filesystem to read and
write, and a way to capture its stdout. Your code does not call a function in the
traditional sense — it hands the tool a file and a command line, exactly the way
a terminal would.

### Step by step: what happens when you click "Align"

#### 1. Loading the tool (once, on first click)

`index.html` loads `aioli.js` from the biowasm CDN with a plain `<script>` tag.
That registers a global `Aioli` constructor but does nothing else yet.

When you click "Kalign" in the sidebar, `main.ts` notices that the Kalign module
declared:

```typescript
aioliTools: ["kalign/3.3.1"]
```

So it calls `ensureAioli()`, which runs:

```typescript
new Aioli(["kalign/3.3.1"], { debug: DEBUG })
```

This downloads `kalign.wasm` (the compiled binary) and `kalign.js` (the glue code
that lets wasm talk to JavaScript) from the biowasm CDN, then spins up a
**WebWorker** — a background thread in the browser. The tool is loaded and ready
but has not run yet. The Aioli instance is saved and reused for all C/C++ tools
in the app.

#### 2. Mounting the input file

You upload a FASTA file and click "Align". The click handler calls
`align(cli, fileContent)`. The first thing that function does is:

```typescript
await instance.mount([{ name: "input.fa", data: input }]);
```

`mount()` copies your file text into the tool's virtual filesystem as `input.fa`.
From Kalign's point of view there is now a real file called `input.fa` it can
open and read — just like on disk. The file actually lives in memory inside the
WebWorker; nothing touches your hard drive.

#### 3. Running the tool

```typescript
return instance.exec("kalign input.fa -f fasta");
```

`exec()` sends that command string to the WebWorker. Inside the worker, Kalign
starts up with `input.fa` and `-f fasta` as its command-line arguments. It opens
the file, runs the alignment, and writes the result to stdout — exactly what it
would do in a terminal.

Aioli intercepts that stdout stream and collects it into a string. When Kalign
finishes, `exec()` resolves with that string. That string is your aligned FASTA —
no output file to read, no extra step.

#### 4. Back in the browser

`align()` returns the aligned FASTA string to the click handler. The handler
renders it in a `<pre>` block and wires up a download button. Done.

### Common questions

**Why `mount()` and not `fs.writeFile()`?**
The virtual filesystem lives inside a WebWorker. `mount()` is Aioli's own API for
moving data from the main thread into that worker's filesystem. There is also a
lower-level `fs` object that wraps Emscripten's filesystem directly, but it does
not work reliably through Aioli's abstraction. Always use `mount()` to provide
input files.

**Why does `exec()` return the output directly?**
Emscripten rewires a compiled C program's `stdout` through JavaScript. Aioli
captures that stream and returns it as the resolved value of the `exec()`
promise. If the tool prints to stdout you get the output with no extra steps. If
a tool writes to a named output file instead of stdout, you would use
`download()` to retrieve it.

**Why one shared Aioli instance for all tools?**
All C/C++ tools share a single Aioli instance and therefore a single virtual
filesystem. This matters for pipelines: Kalign's aligned output will eventually
become the input for the next tool (e.g. FastTree for building phylogenetic
trees). With a shared filesystem the output of one tool is already there for the
next tool to read — no re-uploading needed.

`ensureAioli()` in `main.ts` creates the instance lazily (only when the first
C/C++ tool is clicked) and collects every tool's `aioliTools` spec upfront so all
tools are downloaded in a single `new Aioli(...)` call.
