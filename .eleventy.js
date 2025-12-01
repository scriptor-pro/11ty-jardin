import { DateTime } from "luxon";
import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import fs from "fs";
import path from "path";

// Helper minimal HTML minification (no external deps)
function minifyHtml(content = "") {
  return content
    .replace(/<!--(?!\[if).*?-->/gs, "")  // remove comments except IE conditionals
    .replace(/\s{2,}/g, " ")             // collapse multiple spaces
    .replace(/\n+/g, " ")                // collapse newlines
    .replace(/>\s+</g, "><")             // trim spaces between tags
    .trim();
}

/**
 * Configuration Eleventy (ESM)
 */
export default function (eleventyConfig) {

  /* ----------------------------------------------------------
     Plugins
     ---------------------------------------------------------- */
  eleventyConfig.addPlugin(eleventyNavigationPlugin);


  /* ----------------------------------------------------------
     Passthrough
     ---------------------------------------------------------- */
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/assets/images": "images" });
  // Autorise les images placées à côté des notes à être copiées telles quelles
  eleventyConfig.addPassthroughCopy("src/notes/**/*.{jpg,jpeg,png,gif,svg,webp,avif}");

  /* ----------------------------------------------------------
     Transforms (minification)
     ---------------------------------------------------------- */
  eleventyConfig.addTransform("htmlmin", function (content) {
    if (this.outputPath && this.outputPath.endsWith(".html")) {
      return minifyHtml(content);
    }
    return content;
  });


  /* ----------------------------------------------------------
     FILTRES
     ---------------------------------------------------------- */

  // Filtre année
  eleventyConfig.addFilter("year", () => new Date().getFullYear());

  // Filtre date Luxon
  eleventyConfig.addFilter("date", function (dateObj, format = "yyyy-MM-dd") {
    return DateTime.fromJSDate(dateObj).toFormat(format);
  });

  // Encode/decode propre des slugs tout en conservant les accents
  eleventyConfig.addFilter("safelink", str => {
    try {
      // encodeURI normalise, decodeURI garde les caractères lisibles (é, à, …)
      return decodeURI(encodeURI(str));
    } catch (_) {
      return str;
    }
  });

  // max / min sur tableau de nombres
  eleventyConfig.addFilter("max", arr => Math.max(...arr));
  eleventyConfig.addFilter("min", arr => Math.min(...arr));

  // max/min sur tableau d’objets
  eleventyConfig.addFilter("maxBy", (arr, attr) =>
    Math.max(...arr.map(item => item[attr]))
  );

  eleventyConfig.addFilter("minBy", (arr, attr) =>
    Math.min(...arr.map(item => item[attr]))
  );


  /* ----------------------------------------------------------
     COLLECTIONS
     ---------------------------------------------------------- */

  // Toutes les notes
  eleventyConfig.addCollection("notes", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("src/notes/*.md")
      // Tri par date de création (ou date de fichier si absent), plus récent en premier
      .sort((a, b) => {
        const dateA = new Date(a.data.created || a.date);
        const dateB = new Date(b.data.created || b.date);
        return dateB - dateA;
      });
  });

  // Tags + fréquence
  eleventyConfig.addCollection("tagList", function (collectionApi) {
    const notes = collectionApi.getFilteredByGlob("src/notes/*.md");
    const counts = new Map();

    notes.forEach(note => {
      let tags = note.data.tags || [];

      if (typeof tags === "string") tags = [tags];

      tags.forEach(tag => {
        if (tag !== "note") {
          counts.set(tag, (counts.get(tag) || 0) + 1);
        }
      });
    });

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
  });

  // Backlinks (version async, propre, Eleventy 3-compatible)
  eleventyConfig.addCollection("notesWithBacklinks", async function (collectionApi) {
    const notes = collectionApi.getFilteredByGlob("src/notes/*.md");

    // Lire le contenu de chaque note via API officielle
    const contents = {};
    for (const note of notes) {
      const { content } = await note.template.read();
      contents[note.url] = content;
    }

    // Construire les backlinks
    notes.forEach(note => {
      const backlinks = [];

      notes.forEach(other => {
        if (other.url !== note.url) {
          const content = contents[other.url] || "";
          if (content.includes(note.url)) {
            backlinks.push({
              url: other.url,
              title: other.data.title
            });
          }
        }
      });

      note.data.backlinks = backlinks;
    });

    return notes;
  });

  /* ============================================================
   FILTRE : statusIcon
   ============================================================ */
eleventyConfig.addFilter("statusIcon", function (status) {
  if (!status) return "";

  switch (status.toLowerCase()) {
    case "idée":
    case "idee":
      return "💭"; // idée
    case "chantier":
      return "🔧"; // en cours
    case "terminé":
    case "termine":
      return "✨"; // terminé
    default:
      return "";   // pas d'icône pour les statuts non prévus
  }
});

/* ============================================================
   Filtre : formatDateBE — convertit une date ISO en JJ-MM-YYYY
   ============================================================ */
eleventyConfig.addFilter("formatDateBE", function(value) {
  if (!value) return "";

  // Eleventy donne déjà une date JS native → on normalise
  const date = new Date(value);

  if (isNaN(date)) {
    console.warn("⚠️ formatDateBE : date invalide :", value);
    return value; // fallback sans planter le build
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
});


  /* ----------------------------------------------------------
     CONFIGURATION GÉNÉRALE
     ---------------------------------------------------------- */
  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "layouts",
      data: "_data"
    },

    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md"]
  };
}

/* ----------------------------------------------------------
   Post-build hook : minify CSS output (simple, no deps)
   ---------------------------------------------------------- */
export function onAfterBuild() {
  const cssPath = path.join("_site", "css", "style.css");
  if (fs.existsSync(cssPath)) {
    const css = fs.readFileSync(cssPath, "utf8");
    const minified = css
      .replace(/\/\*[^*]*\*+([^/*][^*]*\*+)*\//g, "") // strip comments
      .replace(/\s{2,}/g, " ")
      .replace(/\n+/g, " ")
      .replace(/\s*([{}:;,])\s*/g, "$1")
      .replace(/;}/g, "}");
    fs.writeFileSync(cssPath, minified, "utf8");
  }
}
