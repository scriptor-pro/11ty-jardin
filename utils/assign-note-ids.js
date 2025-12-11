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

const readField = (front, field) => {
  const regex = new RegExp(`^${field}:\\s*([^\\n]+)\\s*$`, "mi");
  const match = front.match(regex);
  return match ? match[1].trim() : null;
};

const parseDate = iso => {
  if (!iso) return null;
  const m = iso.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})/);
  if (!m) return null;
  const [, year, month, day] = m;
  return { day, month, year };
};

const slugify = (text, fallback) => {
  if (!text) return fallback;
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .filter(Boolean)
    .slice(0, 3)
    .join("-") || fallback;
};

function computeId(front, filenameBase) {
  const title = readField(front, "title");
  const created = readField(front, "created") || readField(front, "date");
  const parsed = parseDate(created);
  const slug = slugify(title, slugify(filenameBase, "note"));

  if (parsed) {
    return `${parsed.day}${parsed.month}${parsed.year}-${slug}`;
  }

  // Fallback: no date found, keep an obvious marker
  return `00000000-${slug}`;
}

function upsertId(front, newId) {
  if (/^id:/m.test(front)) {
    return front.replace(/^id:\s*.*$/m, `id: ${newId}`);
  }

  const lines = front.split("\n");
  let insertAt = lines.findIndex(line =>
    /^layout:\s*note\.njk\s*$/i.test(line.trim())
  );

  if (insertAt === -1) {
    insertAt = lines.findIndex(line => /^title:/i.test(line.trim()));
  }

  insertAt = insertAt === -1 ? lines.length : insertAt + 1;
  lines.splice(insertAt, 0, `id: ${newId}`);

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

  const updates = [];

  mdFiles.forEach(file => {
    const raw = fs.readFileSync(file, "utf8");
    const parsed = extractFrontMatter(raw);
    if (!parsed || !hasNoteLayout(parsed.frontMatter)) return;

    const filenameBase = path.basename(file, ".md");
    const newId = computeId(parsed.frontMatter, filenameBase);
    const currentId = readField(parsed.frontMatter, "id");

    if (currentId === newId) return;

    const updatedFrontMatter = upsertId(parsed.frontMatter, newId);
    const updatedContent = `---\n${updatedFrontMatter}\n---\n${parsed.body}`;
    fs.writeFileSync(file, updatedContent, "utf8");

    updates.push({ file, newId, previous: currentId });
  });

  if (updates.length === 0) {
    console.log("No notes needed an ID update. Nothing changed.");
    return;
  }

  console.log(`Updated IDs for ${updates.length} note(s):`);
  updates.forEach(({ file, newId, previous }) => {
    const name = path.basename(file);
    console.log(`- ${name}: ${previous || "none"} -> ${newId}`);
  });
}

assignIds();
