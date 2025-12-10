import fs from "node:fs";
import path from "node:path";

// Minimal placeholder: Eleventy already minifies HTML via transform, and
// .eleventy.js onAfterBuild minifies CSS. Keep this script as a no-op to
// satisfy the build chain if additional minifiers are not present.

const outDir = path.resolve("_site");
if (fs.existsSync(outDir)) {
  console.log(`Minify step skipped (nothing to do). Output dir: ${outDir}`);
} else {
  console.log("Minify step skipped: _site not found.");
}
