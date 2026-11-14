#!/usr/bin/env bash
# Tests d'intégration de scripts/jardin, sur des dépôts git temporaires
# avec des remotes nus locaux (aucun accès réseau, aucun vrai push).
# Usage : bash tests/jardin.test.sh [nom_du_test...]
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
JARDIN="$ROOT/scripts/jardin"
PASS=0
FAIL=0

export GIT_AUTHOR_NAME=test GIT_AUTHOR_EMAIL=test@example.com
export GIT_COMMITTER_NAME=test GIT_COMMITTER_EMAIL=test@example.com

note() { # titre [champs supplémentaires]
  printf -- '---\ntitle: "%s"\nlayout: note.njk\ndate: 2026-01-01\n%s---\n\n# %s\n\nTexte.\n' "$1" "${2:-}" "$1"
}

setup() {
  T="$(mktemp -d)"
  git init -q --bare -b main "$T/site.git"
  git init -q --bare -b main "$T/brouillons.git"

  git clone -q "$T/site.git" "$T/site" 2>/dev/null
  mkdir -p "$T/site/src/notes"
  note "Une note" > "$T/site/src/notes/une-note.md"
  note "Masquée" "publish: false
" > "$T/site/src/notes/masquee.md"
  note "Index" > "$T/site/src/notes/index.md"
  git -C "$T/site" add -A && git -C "$T/site" commit -qm init && git -C "$T/site" push -q origin main

  git clone -q "$T/brouillons.git" "$T/brouillons" 2>/dev/null
  echo "# Brouillons" > "$T/brouillons/README.md"
  git -C "$T/brouillons" add -A && git -C "$T/brouillons" commit -qm init && git -C "$T/brouillons" push -q origin main

  printf '#!/bin/sh\nprintf "\\nContenu ajouté.\\n" >> "$1"\n' > "$T/editeur"
  chmod +x "$T/editeur"

  export JARDIN_SITE="$T/site" JARDIN_BROUILLONS="$T/brouillons"
  export JARDIN_YES=1 JARDIN_NO_WAIT=1 JARDIN_BUILD_CMD=true JARDIN_TODAY=2026-11-14
  export EDITOR="$T/editeur"
}

teardown() { rm -rf "$T"; }

# --- assertions -------------------------------------------------------------
fail() { echo "    ✗ $*"; return 1; }
assert_file() { [[ -f "$1" ]] || fail "fichier absent : $1"; }
assert_no_file() { [[ ! -e "$1" ]] || fail "fichier présent : $1"; }
assert_contains() { grep -qF -- "$2" "$1" || fail "« $2 » absent de $1"; }
assert_not_contains() { ! grep -qF -- "$2" "$1" || fail "« $2 » présent dans $1"; }
assert_output() { [[ "$OUT" == *"$1"* ]] || fail "sortie sans « $1 » : $OUT"; }
assert_ok() { [[ $STATUS -eq 0 ]] || fail "code $STATUS : $OUT"; }
assert_ko() { [[ $STATUS -ne 0 ]] || fail "aurait dû échouer : $OUT"; }
last_log() { git --git-dir="$T/$1.git" log -1 --format=%s; }
assert_log() { [[ "$(last_log "$1")" == "$2" ]] || fail "dernier commit $1 : « $(last_log "$1") » au lieu de « $2 »"; }
assert_clean_site() { [[ -z "$(git -C "$T/site" status --porcelain)" ]] || fail "dépôt du site sale"; }
run() { OUT="$("$JARDIN" "$@" 2>&1 </dev/null)"; STATUS=$?; }

# --- tests : new, drafts, sélection ----------------------------------------
test_new_cree_et_sauvegarde_le_brouillon() {
  run new "Mon idée"
  assert_ok &&
  assert_file "$T/brouillons/mon-idee.md" &&
  assert_contains "$T/brouillons/mon-idee.md" 'title: "Mon idée"' &&
  assert_contains "$T/brouillons/mon-idee.md" "created: 2026-11-14" &&
  assert_contains "$T/brouillons/mon-idee.md" "Contenu ajouté." &&
  assert_log brouillons 'brouillon: "Mon idée"'
}

test_new_refuse_un_slug_existant() {
  run new "Une note"
  assert_ko && assert_output "existe déjà" &&
  run new "Mon idée" && run new "Mon idée"
  assert_ko && assert_output "existe déjà"
}

test_new_sans_titre_echoue() {
  run new
  assert_ko && assert_output "Usage"
}

test_drafts_liste_les_brouillons() {
  run drafts
  assert_ok && assert_output "Aucun brouillon" &&
  run new "Mon idée" && run drafts
  assert_ok && assert_output "Mon idée" && assert_output "2026-11-14"
}

test_selection_sans_correspondance() {
  run publish zzz
  assert_ko && assert_output "Aucune note ne correspond à « zzz »"
}

test_selection_ambigue_non_interactive() {
  run new "Idée un" && run new "Idée deux" && run publish idee
  assert_ko && assert_output "Plusieurs notes correspondent"
}

# --- tests : publish ----------------------------------------------------------
brouillon() { # slug contenu — ajoute un brouillon commité
  printf '%s' "$2" > "$T/brouillons/$1.md"
  git -C "$T/brouillons" add -A && git -C "$T/brouillons" commit -qm "ajout $1" && git -C "$T/brouillons" push -q
}

test_publish_nominal() {
  run new "Mon idée" && run publish mon-idee
  local f="$T/site/src/notes/mon-idee.md"
  assert_ok &&
  assert_file "$f" &&
  assert_contains "$f" "layout: note.njk" &&
  assert_contains "$f" "date: 2026-11-14" &&
  assert_contains "$f" "id: 14112026-mon-idee" &&
  assert_contains "$f" "Contenu ajouté." &&
  assert_no_file "$T/brouillons/mon-idee.md" &&
  assert_log site 'feat: publish "Mon idée"' &&
  assert_log brouillons 'publié: "Mon idée"' &&
  assert_clean_site
}

test_publish_retire_publish_false() {
  brouillon revenue $'---\ntitle: "Revenue"\nid: 01012025-revenue\npublish: false\ncreated: 2025-01-01\n---\n\n# Revenue\n\nTexte.\n'
  run publish revenue
  assert_ok &&
  assert_not_contains "$T/site/src/notes/revenue.md" "publish:" &&
  assert_contains "$T/site/src/notes/revenue.md" "id: 01012025-revenue"
}

test_publish_build_en_echec_ne_publie_rien() {
  run new "Mon idée"
  JARDIN_BUILD_CMD=false run publish mon-idee
  assert_ko && assert_output "build" &&
  assert_file "$T/brouillons/mon-idee.md" &&
  assert_no_file "$T/site/src/notes/mon-idee.md" &&
  assert_log site "init" &&
  assert_clean_site
}

test_publish_refuse_un_site_sale() {
  run new "Mon idée"
  echo "modif" >> "$T/site/src/notes/une-note.md"
  run publish mon-idee
  assert_ko && assert_output "non commitées" &&
  assert_file "$T/brouillons/mon-idee.md" &&
  assert_no_file "$T/site/src/notes/mon-idee.md"
}

test_publish_refuse_un_slug_deja_en_ligne() {
  brouillon une-note "$(note "Une note")"
  run publish une-note
  assert_ko && assert_output "existe déjà"
}

test_publish_refuse_un_brouillon_vide() {
  EDITOR=true run new "Vide"
  run publish vide
  assert_ko && assert_output "vide" && assert_file "$T/brouillons/vide.md"
}

test_publish_recupere_les_commits_distants() {
  run new "Mon idée"
  git clone -q "$T/site.git" "$T/autre" && note "Jules" > "$T/autre/src/notes/jules.md" &&
    git -C "$T/autre" add -A && git -C "$T/autre" commit -qm 'feat: publish "Jules"' && git -C "$T/autre" push -q
  run publish mon-idee
  assert_ok && assert_file "$T/site/src/notes/jules.md" && assert_log site 'feat: publish "Mon idée"'
}

# --- tests : edit -------------------------------------------------------------
commit_count() { git --git-dir="$T/$1.git" rev-list --count main; }

test_edit_brouillon_sauvegarde() {
  run new "Mon idée" && run edit mon-idee
  assert_ok &&
  [[ $(grep -c "Contenu ajouté." "$T/brouillons/mon-idee.md") -eq 2 ]] || fail "contenu non ajouté" &&
  [[ $(commit_count brouillons) -eq 3 ]] || fail "commits brouillons : $(commit_count brouillons)"
}

test_edit_note_en_ligne_met_a_jour() {
  run edit une-note
  local f="$T/site/src/notes/une-note.md"
  assert_ok &&
  assert_contains "$f" "updated: 2026-11-14" &&
  assert_contains "$f" "Contenu ajouté." &&
  assert_log site 'content: mettre à jour "Une note"' &&
  assert_clean_site
}

test_edit_note_build_en_echec_conserve_le_texte() {
  JARDIN_BUILD_CMD=false run edit une-note
  assert_ko && assert_output "conservée" &&
  assert_contains "$T/site/src/notes/une-note.md" "Contenu ajouté." &&
  assert_log site "init"
}

test_edit_sans_changement_ne_fait_rien() {
  EDITOR=true run edit une-note
  assert_ok && assert_output "Aucune modification" && assert_log site "init" && assert_clean_site
}

test_edit_refuse_un_site_sale() {
  echo "modif" >> "$T/site/src/notes/masquee.md"
  run edit une-note
  assert_ko && assert_output "non commitées" &&
  assert_not_contains "$T/site/src/notes/une-note.md" "Contenu ajouté."
}

test_edit_recupere_la_version_distante_avant_edition() {
  git clone -q "$T/site.git" "$T/autre" && echo "Ajout distant." >> "$T/autre/src/notes/une-note.md" &&
    git -C "$T/autre" commit -qam "distant" && git -C "$T/autre" push -q
  run edit une-note
  assert_ok &&
  assert_contains "$T/site/src/notes/une-note.md" "Ajout distant." &&
  assert_log site 'content: mettre à jour "Une note"'
}

# --- tests : unpublish ------------------------------------------------------
test_unpublish_ramene_la_note_dans_les_brouillons() {
  run new "Mon idée" && run publish mon-idee && run unpublish mon-idee
  assert_ok &&
  assert_no_file "$T/site/src/notes/mon-idee.md" &&
  assert_file "$T/brouillons/mon-idee.md" &&
  assert_contains "$T/brouillons/mon-idee.md" "id: 14112026-mon-idee" &&
  assert_contains "$T/brouillons/mon-idee.md" "created: 2026-11-14" &&
  assert_log site 'chore: unpublish "Mon idée"' &&
  assert_log brouillons 'brouillon: dépublié "Mon idée"' &&
  assert_clean_site
}

test_unpublish_puis_publish_garde_le_meme_id() {
  run new "Mon idée" && run publish mon-idee && run unpublish mon-idee && run publish mon-idee
  assert_ok && assert_contains "$T/site/src/notes/mon-idee.md" "id: 14112026-mon-idee" &&
  [[ $(grep -c "^id:" "$T/site/src/notes/mon-idee.md") -eq 1 ]] || fail "id dupliqué"
}

test_unpublish_refuse_si_brouillon_du_meme_slug() {
  brouillon une-note "$(note "Une note")"
  run unpublish "$T/site/src/notes/une-note.md"
  assert_ko && assert_output "existe déjà" &&
  assert_file "$T/site/src/notes/une-note.md" && assert_log site "init"
}

test_unpublish_ne_propose_pas_index() {
  run unpublish index
  assert_ko && assert_output "Aucune note ne correspond à « index »"
}

# --- tests : preview ----------------------------------------------------------
test_preview_sans_argument_lance_le_site() {
  JARDIN_PREVIEW_CMD="pwd > '$T/vu.txt'" run preview
  assert_ok && assert_contains "$T/vu.txt" "$T/site" && assert_clean_site
}

test_preview_brouillon_dans_le_site_puis_nettoie() {
  run new "Mon idée"
  JARDIN_PREVIEW_CMD="cat src/notes/mon-idee.md > '$T/vu.txt'" run preview mon-idee
  assert_ok && assert_output "/notes/mon-idee/" &&
  assert_contains "$T/vu.txt" "layout: note.njk" &&
  assert_contains "$T/vu.txt" "Contenu ajouté." &&
  assert_no_file "$T/site/src/notes/mon-idee.md" &&
  assert_file "$T/brouillons/mon-idee.md" &&
  assert_not_contains "$T/brouillons/mon-idee.md" "layout:" &&
  assert_clean_site
}

test_preview_recopie_les_modifications_du_brouillon() {
  run new "Mon idée"
  JARDIN_PREVIEW_CMD="echo 'Ajout pendant aperçu.' >> '$T/brouillons/mon-idee.md'; sleep 3; cat src/notes/mon-idee.md > '$T/vu.txt'" \
    run preview mon-idee
  assert_ok && assert_contains "$T/vu.txt" "Ajout pendant aperçu." && assert_contains "$T/vu.txt" "layout: note.njk"
}

test_preview_nettoie_aussi_en_cas_d_echec() {
  run new "Mon idée"
  JARDIN_PREVIEW_CMD="false" run preview mon-idee
  assert_no_file "$T/site/src/notes/mon-idee.md" && assert_clean_site
}

test_preview_refuse_un_slug_deja_en_ligne() {
  brouillon une-note "$(note "Une note")"
  JARDIN_PREVIEW_CMD="true" run preview une-note
  assert_ko && assert_output "existe déjà" &&
  assert_contains "$T/site/src/notes/une-note.md" "Texte."
}

# --- lanceur ----------------------------------------------------------------
tests=("$@")
[[ ${#tests[@]} -eq 0 ]] && mapfile -t tests < <(declare -F | awk '{print $3}' | grep '^test_')
for t in "${tests[@]}"; do
  setup
  if ( "$t" ); then PASS=$((PASS + 1)); echo "  ✓ $t"; else FAIL=$((FAIL + 1)); echo "  ✗ $t"; fi
  teardown
done
echo "$PASS réussi(s), $FAIL échec(s)"
[[ $FAIL -eq 0 ]]
