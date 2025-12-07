#!/usr/bin/env bash

NOTES_DIR="./src/notes"

# Génère un nanoid court lisible
generate_nanoid() {
    openssl rand -base64 3 | tr '+/' 'XY' | tr -cd 'a-zA-Z0-9' | cut -c1-4
}

# Extrait le premier tag comme mot-clé
extract_keyword() {
    local file="$1"
    local kw=$(grep "^tags:" "$file" | sed -E 's/tags:\s*\[(.*)\]/\1/' | cut -d',' -f1 | tr -d ' ')
    [[ -z "$kw" ]] && kw="note"
    echo "$kw"
}

# Récupère la date de création git (AAAA-MM-JJ)
get_git_date() {
    local file="$1"
    local iso=$(git log --diff-filter=A --follow --format=%aI -- "$file" | head -n 1)
    if [[ -z "$iso" ]]; then
        date +"%Y-%m-%d"
    else
        date -d "$iso" +"%Y-%m-%d"
    fi
}

# Compte combien de notes ont le même date + mot-clé
compute_increment() {
    local date="$1"
    local keyword="$2"
    local count=$(grep -R "^id: ${date}-${keyword}-" "$NOTES_DIR"/*.md | wc -l)
    printf "%02d" $((count + 1))
}

process_note() {
    local file="$1"

    echo "→ Recréation ID pour $(basename "$file")"

    # Supprimer un éventuel ID existant
    sed -i '/^id:/d' "$file"

    # Supprimer un éventuel layout existant
    sed -i '/^layout:/d' "$file"

    # Récupérer infos nécessaires
    local date=$(get_git_date "$file")
    local keyword=$(extract_keyword "$file")
    local inc=$(compute_increment "$date" "$keyword")
    local nano=$(generate_nanoid)

    # Générer ID final
    local id="${date}-${keyword}-${inc}_${nano}"
    echo "   → ID : $id"

    # Insérer les lignes juste après la première ligne ---
    sed -i "1a id: ${id}" "$file"
    sed -i "1a layout: note.njk" "$file"
}

# Boucle sur toutes les notes
for file in "$NOTES_DIR"/*.md; do
    process_note "$file"
done
