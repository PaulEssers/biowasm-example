import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { align } from "../web/kalign.js";
const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLE_FASTA = readFileSync(resolve(__dirname, "..", "test-data", "mafft_example.fasta"), "utf8");
function createMockAioli(execOutput) {
    const log = [];
    return {
        log,
        instance: {
            async mount(files) {
                log.push({ method: "mount", args: [files] });
            },
            async exec(cmd) {
                log.push({ method: "exec", args: [cmd] });
                return execOutput;
            },
            async download(path) {
                log.push({ method: "download", args: [path] });
                return "blob:fake";
            },
            fs: {
                async writeFile(_path, _content) { },
                async readFile(_path) {
                    return "";
                },
            },
        },
    };
}
const MOCK_ALIGNED = ">s1\nA-TGC\n>s2\nATTGC\n";
describe("align()", () => {
    it("mounts input as input.fa", async () => {
        const { instance, log } = createMockAioli(MOCK_ALIGNED);
        await align(instance, SAMPLE_FASTA);
        const m = log.find((e) => e.method === "mount");
        assert.ok(m);
        assert.deepStrictEqual(m.args[0], [
            { name: "input.fa", data: SAMPLE_FASTA },
        ]);
    });
    it("invokes kalign with the correct command", async () => {
        const { instance, log } = createMockAioli(MOCK_ALIGNED);
        await align(instance, SAMPLE_FASTA);
        const e = log.find((c) => c.method === "exec");
        assert.ok(e);
        assert.strictEqual(e.args[0], "kalign input.fa -f fasta");
    });
    it("returns exec stdout as aligned FASTA", async () => {
        const { instance } = createMockAioli(MOCK_ALIGNED);
        const result = await align(instance, SAMPLE_FASTA);
        assert.strictEqual(result, MOCK_ALIGNED);
    });
    it("calls mount then exec in order", async () => {
        const { instance, log } = createMockAioli(MOCK_ALIGNED);
        await align(instance, SAMPLE_FASTA);
        assert.deepStrictEqual(log.map((e) => e.method), ["mount", "exec"]);
    });
    it("propagates an exec error to the caller", async () => {
        const errInstance = {
            exec: async () => {
                throw new Error("kalign: invalid input");
            },
            mount: async () => { },
            download: async () => "",
            fs: {
                writeFile: async () => { },
                readFile: async () => "",
            },
        };
        await assert.rejects(() => align(errInstance, "bad\n"), {
            message: "kalign: invalid input",
        });
    });
});
