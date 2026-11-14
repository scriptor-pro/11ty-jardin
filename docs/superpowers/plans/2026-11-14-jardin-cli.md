# `jardin` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** un script terminal `jardin` pour créer, lister, modifier, publier et dépublier les notes de jndjs.dev.

**Architecture:** un script bash `scripts/jardin` (dispatch des sous-commandes, git, fzf/gum/glow) s'appuie sur un utilitaire Node `scripts/jardin-fm.mjs` pour tout ce qui touche au texte (slug, YAML, front matter, id). Tests : `node --test` pour l'utilitaire, un script bash d'intégration sur des dépôts git temporaires avec remotes nus locaux.

**Tech Stack:** bash 5, git, Node 20 (`node:test`), `js-yaml` 4, fzf, gum, glow.

**Spec:** `docs/superpowers/specs/2026-11-14-jardin-cli-design.md`

## Global Constraints

- Messages utilisateur en français.
- Messages de commit du site : `feat: publish "Titre"`, `chore: unpublish "Titre"`, `content: mettre à jour "Titre"`. Dépôt brouillons : `brouillon: "Titre"`, `publié: "Titre"`, `brouillon: dépublié "Titre"`.
- Variables : `JARDIN_SITE` (défaut : parent du dossier réel du script), `JARDIN_BROUILLONS` (défaut `~/Documents/jardin-brouillons`), `JARDIN_URL` (défaut `https://jndjs.dev`).
- Variables de test : `JARDIN_YES=1` (pas de confirmation ni d'aperçu glow), `JARDIN_NO_WAIT=1` (pas d'attente de mise en ligne), `JARDIN_BUILD_CMD` (défaut `npm run build`), `JARDIN_TODAY` (défaut `date +%F`).
- Attente : toutes les 20 s, au plus 8 min ; sha comparé au contenu de `.build-id`.
- Ne jamais committer autre chose que le fichier de la note traitée. Ne jamais toucher `statichost.yml`.
- Jamais de push si validation ou build échoue ; jamais jeter le texte de l'auteur.

## Review Focus

- Titre avec `"`, `\`, `:` ou accents → YAML valide, slug ASCII (test Task 2).
- Brouillon contenant `publish: false` → ligne retirée à la publication (test Task 4).
- Build de contrôle en échec → brouillon intact, site inchangé, rien de poussé (test Task 4).
- Dépôt du site avec modifications non commitées → refus explicite avant toute action (test Task 4).
- Argument partiel ambigu ou sans correspondance → message clair, pas d'action (test Task 3).

---

### Task 1: Préparer le dépôt du site

**Files:** Modify `.gitignore`, `package.json`, `package-lock.json` ; untrack `src/_data/version.json`.

- [ ] `git rm --cached src/_data/version.json`, ajouter `src/_data/version.json` au `.gitignore`.
- [ ] `npm install --save-dev js-yaml@^4.1.0`.
- [ ] Vérifier : `npm run build` réussit puis `git status --short` est vide.
- [ ] Commit `chore: ne plus suivre version.json, déclarer js-yaml`.

### Task 2: `scripts/jardin-fm.mjs`

**Files:** Create `scripts/jardin-fm.mjs`, `tests/jardin-fm.test.mjs`.

**Interfaces (CLI, sortie sur stdout, code ≠ 0 + message sur stderr en cas d'erreur) :**
- `slug <titre>` → règle `toSlug` de Jules (NFD, sans diacritiques, minuscules, `[^a-z0-9\s-]` supprimés, trim, espaces → `-`, tirets fusionnés).
- `new <titre> <date>` → gabarit brouillon de la spec (title échappé, `description: ""`, `tags: []`, `created: <date>`, corps `# <titre>`).
- `get <fichier> <champ>` → valeur scalaire (vide si absent).
- `validate <fichier>` → erreur si pas de front matter, YAML illisible, `title` vide, corps vide ou égal à `# <title>`.
- `set <fichier> <champ> <valeur>` → remplace la ligne `champ:` si elle existe, sinon l'ajoute avant le `---` de fin ; valeur scalaire écrite telle quelle si c'est une date `AAAA-MM-JJ` ou `note.njk`-like sans caractère spécial, sinon entre guillemets échappés (JSON.stringify).
- `del <fichier> <champ>` → supprime la ligne `champ:`.
- `id <fichier>` → règle `computeId` d'`utils/assign-note-ids.js` (date `created` sinon `date`, `JJMMAAAA-` + 3 premiers mots du slug ; sinon `00000000-`).
- Exporte aussi ces fonctions pour les tests.

- [ ] Tests (`node --test tests/`) : `slug("Le mystère : “polices” accentuées !")` = `le-mystere-polices-accentuees` ; `new` avec titre `Il a dit "non" \ point` produit un YAML que js-yaml relit avec le même titre ; `set` ajoute puis remplace sans toucher aux autres lignes ; `del publish` ; `id` avec `created: 2026-11-14`, titre `Que faire après un cataclysme` → `14112026-que-faire-apres` ; `validate` refuse corps = `# Titre`, accepte une vraie note.
- [ ] Implémenter, tests verts, commit `feat(jardin): utilitaire front matter`.

### Task 3: Squelette, `new`, `drafts`, résolution des notes

**Files:** Create `scripts/jardin`, `tests/jardin.test.sh`.

**Interfaces (fonctions bash) :** `fm` (appel de jardin-fm.mjs), `die msg`, `info msg`, `confirm question` (oui si `JARDIN_YES=1`), `need_clean_site`, `site_sync` (`git pull --rebase`), `resolve <draft|site|any> [arg]` → chemin du fichier (arg = chemin `.md`, slug exact, ou filtre : 1 résultat → direct ; 0 → erreur « Aucune note ne correspond à « x » » ; plusieurs → fzf `--query`, erreur si non interactif).

- [ ] Harnais de test : crée dans `mktemp -d` deux remotes nus, clone site (avec `src/notes/une-note.md` publiée) et brouillons, exporte `JARDIN_*`, `EDITOR` = script de test qui ajoute « Contenu. » ; fonctions `assert_file`, `assert_no_file`, `assert_contains`, `assert_log` (dernier message de commit du remote).
- [ ] Tests : `new "Mon idée"` crée `mon-idee.md`, commit `brouillon: "Mon idée"` sur le remote brouillons ; `new` refuse un slug existant (brouillon ou site) ; `drafts` affiche le titre ; `resolve` avec filtre sans correspondance échoue avec le message.
- [ ] Implémenter, `bash tests/jardin.test.sh` vert, commit `feat(jardin): new, drafts, sélection des notes`.

### Task 4: `publish`

- [ ] Tests : publication nominale (fichier dans `src/notes/` avec `layout: note.njk`, `date`, `id`, sans `publish: false` ; brouillon supprimé ; logs `feat: publish "…"` / `publié: "…"`) ; `JARDIN_BUILD_CMD=false` → brouillon intact, rien dans `src/notes/`, remote site inchangé ; site sale → refus, rien bougé ; slug déjà présent dans le site → refus.
- [ ] Implémenter selon la spec (étapes 1–9), push avec un seul réessai après `pull --rebase`, `wait_online <sha>` (sauté si `JARDIN_NO_WAIT=1`).
- [ ] Tests verts, commit `feat(jardin): publish`.

### Task 5: `edit`

- [ ] Tests : édition d'un brouillon → commit brouillons ; édition d'une note du site → `updated` au jour, commit `content: mettre à jour "…"` sur le remote site ; build en échec → modification conservée non commitée ; éditeur sans changement → aucun commit.
- [ ] Implémenter (ordre de la spec, `[masquée]` pour `publish: false`), commit `feat(jardin): edit`.

### Task 6: `unpublish`, `preview`, `help`, installation

- [ ] Tests : unpublish → fichier retiré du site (log `chore: unpublish "…"`), brouillon recréé avec `id` conservé (log `brouillon: dépublié "…"`) ; refus si brouillon du même slug existe.
- [ ] Implémenter `unpublish`, `preview` (`npm run dev` dans le site), `help`, vérification des dépendances.
- [ ] Lien `~/.local/bin/jardin`, essai manuel `jardin help` et `jardin drafts`.
- [ ] Commit `feat(jardin): unpublish, preview, aide`.
