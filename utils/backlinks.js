/**
 * Backlinks generator for Eleventy 3.x
 * Works asynchronously and avoids internal monkey-patching.
 *
 * Logic:
 *  1. Read each note's full rendered content via template.read()
 *  2. Scan for links to /notes/{slug}/
 *  3. Build a map of backlinks
 */

async function generateBacklinks(notes) {
  const map = new Map();

  // Prépare la map avec tous les slugs connus
  notes.forEach(note => {
    map.set(note.fileSlug, []);
  });

  // Lis chaque fichier de manière asynchrone
  for (const note of notes) {
    const output = await note.template.read(); // async
    const thisSlug = note.fileSlug;
    const html = output.content || "";

    // Détecte les liens internes vers d'autres notes
    for (const [targetSlug] of map) {
      if (targetSlug === thisSlug) continue;

      const linkPattern = new RegExp(`/notes/${targetSlug}/`, "i");

      if (linkPattern.test(html)) {
        map.get(targetSlug).push(thisSlug);
      }
    }
  }

  // Injecte la liste dans chaque note
  notes.forEach(note => {
    note.data.backlinks = map.get(note.fileSlug) || [];
  });

  return notes;
}

module.exports = { generateBacklinks };
