import fs from "fs";
import path from "path";

const NOTES_DIR = path.resolve("src", "notes");

/**
 * Extracts front matter and body from a Markdown file.
 * Returns null if no valid front matter block is found.
 */
function extractFrontMatter(raw) {
  const normalized = raw.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) return null;

  const endIndex = normalized.indexOf("\n---", 4);
  if (endIndex === -1) return null;

  const frontMatter = normalized.slice(4, endIndex);
  let bodyStart = endIndex + 4; // jump past "\n---"
  if (normalized[bodyStart] === "\n") bodyStart += 1; // skip trailing newline

  const body = normalized.slice(bodyStart);
  return { frontMatter, body };
}

const hasNoteLayout = front => /^layout:\s*note\.njk\s*$/m.test(front);

const readId = front => {
  const match = front.match(/^id:\s*(\d+)\s*$/m);
  return match ? Number(match[1]) : null;
};

function injectId(front, id) {
  const lines = front.split("\n");
  let insertAt = lines.findIndex(line =>
    /^layout:\s*note\.njk\s*$/i.test(line.trim())
  );

  if (insertAt === -1) {
    insertAt = lines.findIndex(line => /^title:/i.test(line.trim()));
  }

  insertAt = insertAt === -1 ? lines.length : insertAt + 1;
  lines.splice(insertAt, 0, `id: ${id}`);

  return lines.join("\n");
}

function assignIds() {
  if (!fs.existsSync(NOTES_DIR)) {
    throw new Error(`Notes directory not found: ${NOTES_DIR}`);
  }

  const mdFiles = fs
    .readdirSync(NOTES_DIR)
    .map(name => path.join(NOTES_DIR, name))
    .filter(file => fs.statSync(file).isFile() && file.endsWith(".md"));

  let maxId = 0;
  mdFiles.forEach(file => {
    const raw = fs.readFileSync(file, "utf8");
    const parsed = extractFrontMatter(raw);
    if (!parsed || !hasNoteLayout(parsed.frontMatter)) return;

    const id = readId(parsed.frontMatter);
    if (id !== null) {
      maxId = Math.max(maxId, id);
    }
  });

  let nextId = maxId + 1;
  let added = 0;
  const additions = [];

  mdFiles.forEach(file => {
    const raw = fs.readFileSync(file, "utf8");
    const parsed = extractFrontMatter(raw);
    if (!parsed || !hasNoteLayout(parsed.frontMatter)) return;

    const existingId = readId(parsed.frontMatter);
    if (existingId !== null) return;

    const updatedFrontMatter = injectId(parsed.frontMatter, nextId);
    const updatedContent = `---\n${updatedFrontMatter}\n---\n${parsed.body}`;
    fs.writeFileSync(file, updatedContent, "utf8");

    additions.push({ file, id: nextId });
    nextId += 1;
    added += 1;
  });

  console.log(`Highest existing ID: ${maxId || "none"}`);
  if (added === 0) {
    console.log("No notes needed an ID. Nothing changed.");
    return;
  }

  console.log(`Added IDs to ${added} note(s):`);
  additions.forEach(({ file, id }) => {
    console.log(`- ${path.basename(file)} -> ${id}`);
  });
}

assignIds();
