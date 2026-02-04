// Type declarations for the Aioli global, loaded via <script> from the
// biowasm CDN.  https://biowasm.com/documentation/
//
// Aioli's constructor is async (returns a Promise), so usage is:
//   const cli = await new Aioli(["muscle/5.1.0"]);

interface AioliConfig {
  urlCDN?: string;
  debug?: boolean;
}

interface AioliMountEntry {
  name: string;
  data?: string | Blob;
  url?: string;
}

interface Aioli {
  exec(cmd: string): Promise<string>;
  mount(files: AioliMountEntry | AioliMountEntry[]): Promise<void>;
  download(path: string): Promise<string>; // returns a blob URL
  fs: {
    writeFile(path: string, content: string): Promise<void>;
    readFile(path: string): Promise<string>;
  };
}

interface AioliConstructor {
  new (tools: string[], config?: AioliConfig): Promise<Aioli>;
}

declare const Aioli: AioliConstructor;
