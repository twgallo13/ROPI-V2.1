import '@testing-library/jest-dom';

// File polyfill for Node/vitest environment
// Ensures File.prototype.text() is available in tests
if (typeof global.File === 'undefined') {
  global.File = class MockFile extends Blob {
    name: string;
    lastModified: number;

    constructor(bits: any[] = [], name = 'file.txt', opts: any = {}) {
      super(bits, opts);
      this.name = name;
      this.lastModified = opts.lastModified || Date.now();
    }

    async text(): Promise<string> {
      if (typeof super.arrayBuffer === 'function') {
        const buf = await this.arrayBuffer();
        return new TextDecoder().decode(buf);
      }
      return String(this);
    }
  } as any;
}
