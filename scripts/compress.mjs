import { gzip, brotliCompress } from "node:zlib";
import * as zlib from "node:zlib";
import { promisify } from "node:util";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "path";

const gzipAsync = promisify(gzip);
const brotliAsync = promisify(brotliCompress);

const ROOT = "./_site";

// Extensions utiles à compresser
const TEXT_EXT = /\.(html|css|js|json|xml|txt|svg|map)$/;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const filepath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await walk(filepath);
      continue;
    }

    if (!TEXT_EXT.test(entry.name)) continue;

    const original = await readFile(filepath);

    // --- GZIP ---
    const gz = await gzipAsync(original, { level: 6 });
    await writeFile(filepath + ".gz", gz);

    // --- BROTLI ---
    const br = await brotliAsync(original, {
      params: {
        [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
        [zlib.constants.BROTLI_PARAM_QUALITY]: 5,
      },
    });
    await writeFile(filepath + ".br", br);

    console.log(`Compressed: ${filepath}`);
  }
}

walk(ROOT);
