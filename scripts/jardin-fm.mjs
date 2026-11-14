#!/usr/bin/env node
// Utilitaire de front matter pour l'outil `jardin` (scripts/jardin).
// Les modifications se font ligne par ligne pour ne pas reformater les notes.
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import yaml from "js-yaml";

const FM_RE = /^---\n([\s\S]*?)\n---(?:\n|$)/;

// Même règle que toSlug() de Jules (src/utils/slug.ts)
export function slug(title) {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function newDraft(title, date) {
  return `---
title: ${JSON.stringify(title)}
description: ""
tags: []
created: ${date}
---

# ${title}
`;
}

export function parse(content) {
  const text = content.replace(/\r\n/g, "\n");
  const match = text.match(FM_RE);
  if (!match) throw new Error("Pas de front matter");
  // CORE_SCHEMA : les dates restent des chaînes AAAA-MM-JJ
  const data = yaml.load(match[1], { schema: yaml.CORE_SCHEMA }) ?? {};
  return { data, raw: match[1], body: text.slice(match[0].length) };
}

export function getField(content, field) {
  const value = parse(content).data[field];
  if (value === undefined || value === null) return "";
  return Array.isArray(value) ? value.join(",") : String(value);
}

// Sans guillemets si la valeur est simple et relue à l'identique (dates, id, note.njk…)
const formatValue = value => {
  if (value === "true" || value === "false") return value;
  const plain = /^[A-Za-z0-9][\w.\/-]*$/.test(value) &&
    yaml.load(value, { schema: yaml.CORE_SCHEMA }) === value;
  return plain ? value : JSON.stringify(value);
};

// Indices [début, fin[ des lignes du front matter (entre les deux ---)
function frontMatterLines(content) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  if (lines[0] !== "---") throw new Error("Pas de front matter");
  const end = lines.indexOf("---", 1);
  if (end === -1) throw new Error("Front matter non fermé");
  return { lines, end };
}

// Ligne `champ:` et ses éventuelles lignes de continuation indentées
function fieldSpan(lines, end, field) {
  const start = lines.findIndex((l, i) => i > 0 && i < end && l.startsWith(`${field}:`));
  if (start === -1) return null;
  let stop = start + 1;
  while (stop < end && /^\s+\S/.test(lines[stop])) stop++;
  return [start, stop];
}

export function setField(content, field, value) {
  const { lines, end } = frontMatterLines(content);
  const line = `${field}: ${formatValue(value)}`;
  const span = fieldSpan(lines, end, field);
  if (span) lines.splice(span[0], span[1] - span[0], line);
  else lines.splice(end, 0, line);
  return lines.join("\n");
}

export function delField(content, field) {
  const { lines, end } = frontMatterLines(content);
  const span = fieldSpan(lines, end, field);
  if (span) lines.splice(span[0], span[1] - span[0]);
  return lines.join("\n");
}

// Même règle que computeId() d'utils/assign-note-ids.js
const idSlug = text =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .filter(Boolean)
    .slice(0, 3)
    .join("-");

export function computeId(content, filenameBase) {
  const { data } = parse(content);
  const s = idSlug(String(data.title ?? "")) || idSlug(filenameBase) || "note";
  const m = String(data.created ?? data.date ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}${m[2]}${m[1]}-${s}` : `00000000-${s}`;
}

// Front matter d'une note publiée : layout, date et id ajoutés s'ils manquent,
// `publish: false` retiré. Les champs existants ne sont pas modifiés.
export function completeNote(content, filenameBase, today) {
  let out = content;
  if (!getField(out, "layout")) out = setField(out, "layout", "note.njk");
  if (!getField(out, "date")) out = setField(out, "date", today);
  if (!getField(out, "id")) out = setField(out, "id", computeId(out, filenameBase));
  if (getField(out, "publish") === "false") out = delField(out, "publish");
  return out;
}

export function validate(content) {
  let parsed;
  try {
    parsed = parse(content);
  } catch (e) {
    return [e.message.startsWith("Pas de") ? e.message : `YAML illisible : ${e.message.split("\n")[0]}`];
  }
  const errors = [];
  const title = String(parsed.data.title ?? "").trim();
  if (!title) errors.push("Le titre est vide");
  const body = parsed.body.trim();
  if (!body || body === `# ${title}`) errors.push("Le contenu est vide (seulement le titre)");
  return errors;
}

function main([cmd, ...args]) {
  const read = file => fs.readFileSync(file, "utf8");
  switch (cmd) {
    case "slug":
      return console.log(slug(args[0] ?? ""));
    case "new":
      return process.stdout.write(newDraft(args[0], args[1]));
    case "get":
      return console.log(getField(read(args[0]), args[1]));
    case "set":
      return fs.writeFileSync(args[0], setField(read(args[0]), args[1], args[2]));
    case "del":
      return fs.writeFileSync(args[0], delField(read(args[0]), args[1]));
    case "complete": // complete <brouillon> <cible> <date du jour>
      return fs.writeFileSync(
        args[1],
        completeNote(read(args[0]), args[0].replace(/^.*\//, "").replace(/\.md$/, ""), args[2]),
      );
    case "id":
      return console.log(computeId(read(args[0]), args[0].replace(/^.*\//, "").replace(/\.md$/, "")));
    case "list":
      // Une ligne par fichier : chemin, titre, created, tags, publish (séparés par des tabulations)
      for (const file of args) {
        let fields;
        try {
          const content = read(file);
          fields = ["title", "created", "tags", "publish"].map(f => getField(content, f));
        } catch {
          fields = [file.replace(/^.*\//, ""), "", "", ""];
        }
        console.log([file, ...fields.map(v => v.replace(/[\t\n]/g, " "))].join("\t"));
      }
      return;
    case "validate": {
      const errors = validate(read(args[0]));
      if (errors.length) {
        errors.forEach(e => console.error(e));
        process.exit(1);
      }
      return;
    }
    default:
      console.error(`jardin-fm : commande inconnue « ${cmd ?? ""} »`);
      process.exit(2);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
