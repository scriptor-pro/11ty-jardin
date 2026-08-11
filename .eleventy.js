import { DateTime } from "luxon";
import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import fs from "fs";
import path from "path";
import eleventyPluginRss from "@11ty/eleventy-plugin-rss";

// Helper minimal HTML minification (no external deps)
function minifyHtml(content = "") {
  return content
    .replace(/<!--(?!\[if).*?-->/gs, "")  // remove comments except IE conditionals
    .replace(/\s{2,}/g, " ")             // collapse multiple spaces
    .replace(/\n+/g, " ")                // collapse newlines
    .replace(/>\s+</g, "><")             // trim spaces between tags
    .trim();
}

// Escape string for safe use inside RegExp
function escapeRegExp(str = "") {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Configuration Eleventy (ESM)
 */
export default function (eleventyConfig) {

  const hasCqjaTag = data => {
    let tags = data?.tags || [];
    if (typeof tags === "string") tags = [tags];
    return Array.isArray(tags) && tags.includes("cqja");
  };

  /* ----------------------------------------------------------
     Plugins
     ---------------------------------------------------------- */
  eleventyConfig.addPlugin(eleventyNavigationPlugin);
  eleventyConfig.addPlugin(eleventyPluginRss);

  /* RSS */

  


  /* ----------------------------------------------------------
     Passthrough
     ---------------------------------------------------------- */
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/assets/images": "images" });
  eleventyConfig.addPassthroughCopy("src/robots.txt");
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

  // Serialize data safely for JSON-LD
  eleventyConfig.addFilter("json", value => JSON.stringify(value));

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

  // Supprime le premier <h1> du contenu (souvent doublon avec "title")
  eleventyConfig.addFilter("stripLeadingTitle", function (content = "", title = "") {
    const html = String(content);
    if (!html.trim()) return "";

    const normalizedTitle = title.trim();
    if (normalizedTitle) {
      const escaped = escapeRegExp(normalizedTitle);

      // Match <h1>Title</h1> avec ou sans ancres automatiques
      const exact = new RegExp(`^\\s*<h1[^>]*>\\s*${escaped}\\s*<\\/h1>\\s*`, "i");
      const withAnchor = new RegExp(
        `^\\s*<h1[^>]*>\\s*<a [^>]*>\\s*${escaped}\\s*<\\/a>\\s*<\\/h1>\\s*`,
        "i"
      );

      if (exact.test(html)) return html.replace(exact, "");
      if (withAnchor.test(html)) return html.replace(withAnchor, "");
    }

    // Fallback : retirer le premier h1 quoi qu'il contienne
    const generic = new RegExp("^\\s*<h1[^>]*>[\\s\\S]*?<\\/h1>\\s*", "i");
    return html.replace(generic, "");
  });


  /* ----------------------------------------------------------
     COLLECTIONS
     ---------------------------------------------------------- */

  // Helper : filtre les notes non publiées et la page d'index elle-même
  // (src/notes/index.md liste toutes les notes — ce n'est pas une note.
  // Son fileSlug vaut "notes", pas "index" : Eleventy dérive le slug d'un
  // fichier index.md du nom de son dossier parent — donc on teste le
  // chemin d'entrée plutôt que fileSlug, sans ambiguïté possible.)
  const isPublished = note =>
    note.data.publish !== false &&
    !hasCqjaTag(note.data) &&
    note.inputPath !== "./src/notes/index.md";

  // Ne génère pas de page HTML pour les contenus taggés "cqja"
  eleventyConfig.addGlobalData("eleventyComputed.permalink", data => {
    if (hasCqjaTag(data)) {
      return false;
    }

    return data?.permalink;
  });

  // Toutes les notes
  eleventyConfig.addCollection("notes", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("src/notes/*.md")
      .filter(isPublished)
      // Tri par date de création (ou date de fichier si absent), plus récent en premier
      .sort((a, b) => {
        const dateA = new Date(a.data.created || a.date);
        const dateB = new Date(b.data.created || b.date);
        return dateB - dateA;
      });
  });

  // Tags + fréquence
  eleventyConfig.addCollection("tagList", function (collectionApi) {
    const notes = collectionApi
      .getFilteredByGlob("src/notes/*.md")
      .filter(isPublished);
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
    const notes = collectionApi
      .getFilteredByGlob("src/notes/*.md")
      .filter(isPublished);

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

  /* ============================================================
     Filtre : unixTime — renvoie le timestamp (secondes)
     ============================================================ */
  eleventyConfig.addFilter("unixTime", function(value) {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);

    if (isNaN(date)) {
      console.warn("⚠️ unixTime : date invalide :", value);
      return "";
    }

    return Math.floor(date.getTime() / 1000);
  });

  /* ============================================================
     Filtre : randomLetters — retourne N lettres majuscules aléatoires
     ============================================================ */
  eleventyConfig.addFilter("randomLetters", function(input, length = 3) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const n = Number(length) || 3;
    let result = "";

    for (let i = 0; i < n; i += 1) {
      const idx = Math.floor(Math.random() * alphabet.length);
      result += alphabet[idx];
    }

    return result;
  });

  /* ============================================================
     Filtre : shuffle
     Mélange aléatoirement les éléments d'un tableau (Fisher-Yates)
     ============================================================ */
  eleventyConfig.addFilter("shuffle", function(arr) {
    if (!Array.isArray(arr)) return arr;
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  });

  /* ============================================================
     Filtre : truncateAtPunctuation
     Coupe le texte à la première ponctuation forte (. ; :)
     Retourne { text, lastWord } pour permettre lastWordLink
     ============================================================ */
  eleventyConfig.addFilter("truncateAtPunctuation", function(text) {
    if (!text) return { text: "", lastWord: "" };
    
    const str = String(text).trim();
    
    // Cherche la première ponctuation forte
    const match = str.match(/^(.*?[.;:])/);
    let truncated = match ? match[1] : str;
    
    // Retire la ponctuation finale pour extraire le dernier mot
    const withoutPunctuation = truncated.replace(/[.;:]$/, "").trim();
    const words = withoutPunctuation.split(/\s+/);
    const lastWord = words.pop() || "";
    const textBeforeLastWord = words.join(" ");
    
    return {
      text: textBeforeLastWord,
      lastWord: lastWord
    };
  });

  /* ============================================================
     Filtre : lastWordLink
     Transforme le dernier mot en lien vers l'URL donnée
     ============================================================ */
  eleventyConfig.addFilter("lastWordLink", function(text, url) {
    if (!text || !url) return text || "";
    
    const str = String(text).trim();
    const words = str.split(/\s+/);
    
    if (words.length === 0) return "";
    
    const lastWord = words.pop();
    const rest = words.join(" ");
    
    if (rest) {
      return `${rest} <a href="${url}" class="last-word-link">${lastWord}</a>`;
    }
    return `<a href="${url}" class="last-word-link">${lastWord}</a>`;
  });

  /* ============================================================
     Collection : tagListAlpha — tags triés alphabétiquement avec count
     ============================================================ */
  eleventyConfig.addCollection("tagListAlpha", function (collectionApi) {
    const notes = collectionApi
      .getFilteredByGlob("src/notes/*.md")
      .filter(isPublished);
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
      .sort((a, b) => a[0].localeCompare(b[0], "fr")) // tri alphabétique
      .map(([tag, count]) => ({ tag, count }));
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
