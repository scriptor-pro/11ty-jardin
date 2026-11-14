import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import yaml from "js-yaml";
import {
  slug, newDraft, parse, getField, setField, delField, computeId, validate,
} from "../scripts/jardin-fm.mjs";

const tmpFile = content => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jardin-fm-"));
  const file = path.join(dir, "note.md");
  fs.writeFileSync(file, content);
  return file;
};

const NOTE = `---
title: "Une note"
layout: note.njk
tags: ["a", "b"]
created: 2026-11-14
---

# Une note

Du contenu.
`;

test("slug suit la règle de Jules", () => {
  assert.equal(slug("Le mystère : “polices” accentuées !"), "le-mystere-polices-accentuees");
  assert.equal(slug("  Terminal linux : copier/coller facile ou pas ?  "), "terminal-linux-copiercoller-facile-ou-pas");
  assert.equal(slug("Déménagement -- 2026"), "demenagement-2026");
});

test("newDraft échappe le titre et produit un YAML valide", () => {
  const titre = 'Il a dit "non" \\ point : fin';
  const draft = newDraft(titre, "2026-11-14");
  const { data, body } = parse(draft);
  assert.equal(data.title, titre);
  assert.equal(data.description, "");
  assert.deepEqual(data.tags, []);
  assert.equal(getField(draft, "created"), "2026-11-14");
  assert.equal(body.trim(), `# ${titre}`);
});

test("getField lit une valeur scalaire, vide si absente", () => {
  assert.equal(getField(NOTE, "title"), "Une note");
  assert.equal(getField(NOTE, "layout"), "note.njk");
  assert.equal(getField(NOTE, "absent"), "");
});

test("setField ajoute puis remplace sans toucher aux autres lignes", () => {
  const added = setField(NOTE, "date", "2026-11-15");
  assert.match(added, /\ncreated: 2026-11-14\ndate: 2026-11-15\n---\n/);
  assert.ok(added.includes('tags: ["a", "b"]'));
  const replaced = setField(added, "date", "2026-11-16");
  assert.match(replaced, /\ndate: 2026-11-16\n/);
  assert.doesNotMatch(replaced, /2026-11-15/);
  assert.equal(replaced.split("\n").length, added.split("\n").length);
});

test("setField met entre guillemets les valeurs non triviales", () => {
  const out = setField(NOTE, "description", 'Un "résumé" : court');
  assert.equal(parse(out).data.description, 'Un "résumé" : court');
});

test("delField supprime la ligne publish: false", () => {
  const withPublish = setField(NOTE, "publish", "false");
  assert.match(withPublish, /\npublish: false\n/);
  const out = delField(withPublish, "publish");
  assert.doesNotMatch(out, /publish:/);
  assert.equal(out, NOTE);
});

test("computeId suit la règle d'assign-note-ids", () => {
  const note = setField(newDraft("Que faire après un cataclysme", "2026-11-14"), "title", "Que faire après un cataclysme");
  assert.equal(computeId(note, "x"), "14112026-que-faire-apres");
  const sansDate = `---\ntitle: "Sans date"\n---\n\ncorps\n`;
  assert.equal(computeId(sansDate, "x"), "00000000-sans-date");
  const dateSeule = `---\ntitle: "Avec date"\ndate: 2025-01-02\n---\n\ncorps\n`;
  assert.equal(computeId(dateSeule, "x"), "02012025-avec-date");
});

test("validate accepte une vraie note", () => {
  assert.deepEqual(validate(NOTE), []);
});

test("validate refuse un brouillon resté au gabarit", () => {
  const errors = validate(newDraft("Titre", "2026-11-14"));
  assert.ok(errors.some(e => e.includes("vide")), errors.join());
});

test("validate refuse un YAML illisible et un titre vide", () => {
  assert.ok(validate("---\ntitle: \"a\nb: [\n---\n\ncorps\n").length > 0);
  assert.ok(validate("---\ntitle: \"\"\n---\n\ncorps\n").some(e => e.includes("titre")));
  assert.ok(validate("pas de front matter\n").length > 0);
});

test("la CLI get/set/del/validate agit sur un fichier", async () => {
  const { execFileSync } = await import("node:child_process");
  const cli = path.resolve("scripts/jardin-fm.mjs");
  const file = tmpFile(NOTE);
  const run = (...args) => execFileSync("node", [cli, ...args], { encoding: "utf8" });
  assert.equal(run("get", file, "title"), "Une note\n");
  run("set", file, "updated", "2026-12-01");
  assert.equal(run("get", file, "updated"), "2026-12-01\n");
  run("del", file, "updated");
  assert.equal(fs.readFileSync(file, "utf8"), NOTE);
  assert.equal(run("slug", "Été à Bruxelles"), "ete-a-bruxelles\n");
  assert.equal(run("id", file), "14112026-une-note\n");
  run("validate", file);
  fs.writeFileSync(file, newDraft("Titre", "2026-11-14"));
  assert.throws(() => execFileSync("node", [cli, "validate", file], { stdio: "pipe" }));
  assert.ok(yaml.load(parse(run("new", "Titre", "2026-11-14").replace(/\n$/, "")).raw));
});

test("la CLI list donne fichier, titre, created, tags, publish par ligne", async () => {
  const { execFileSync } = await import("node:child_process");
  const cli = path.resolve("scripts/jardin-fm.mjs");
  const a = tmpFile(NOTE);
  const b = tmpFile(setField(newDraft("Masquée", "2025-01-02"), "publish", "false"));
  const out = execFileSync("node", [cli, "list", a, b], { encoding: "utf8" });
  assert.equal(out, `${a}\tUne note\t2026-11-14\ta,b\t\n${b}\tMasquée\t2025-01-02\t\tfalse\n`);
});
