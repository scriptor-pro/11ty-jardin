import { DateTime } from "luxon";
import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import fs from "fs";

/**
 * Petite fonction de minification HTML (sans dépendances externes).
 */
function minifyHtml(content = "") {
  return content
    .replace(/<!--(?!\[if).*?-->/gs, "") // supprime les commentaires
    .replace(/\s{2,}/g, " ")            // espaces multiples → un seul
    .replace(/\n+/g, " ")               // newlines → un espace
    .replace(/>\s+</g, "><")            // retire les espaces entre balises
    .trim();
}

export default function (eleventyConfig) {

  /* ----------------------------------------------------------
     Plugins
     ---------------------------------------------------------- */
  eleventyConfig.addPlugin(eleventyNavigationPlugin);


  /* ----------------------------------------------------------
     Passthrough (statics)
     ---------------------------------------------------------- */

  // CSS
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });

  // Images générales
  eleventyConfig.addPassthroughCopy({ "src/assets/images": "images" });

  // Images placées à côté des notes
  eleventyConfig.addPassthroughCopy("src/notes/**/*.{jpg,jpeg,png,gif,svg,webp,avif}");

  // Favicons + manifest (copiés à la racine du site)
  eleventyConfig.addPassthroughCopy({ "src/assets/favicons": "/" });


  /* ----------------------------------------------------------
     Filtres
     ---------------------------------------------------------- */

  // Filtre: formatage de date avec Luxon
  eleventyConfig.addFilter("readableDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj).toFormat("dd LLL yyyy");
  });


  /* ----------------------------------------------------------
     Transforms
     ---------------------------------------------------------- */

  // Minification HTML
  eleventyConfig.addTransform("htmlmin", function (content) {
    if (this.outputPath && this.outputPath.endsWith(".html")) {
      return minifyHtml(content);
    }
    return content;
  });


  /* ----------------------------------------------------------
     Eleventy Config Return
     ---------------------------------------------------------- */
  return {
    dir: {
      input: "src",
      output: "_site"
    },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
}
