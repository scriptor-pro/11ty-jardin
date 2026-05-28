# Design — Page d'accueil enrichie

**Date :** 2026-05-28  
**Objectif :** Donner accès à plus de notes depuis la page d'accueil, avec un accent sur la découverte et l'esprit jardin numérique.

---

## Contexte

La page d'accueil actuelle (`src/layouts/home.njk`) affiche :
- Colonne gauche : hero image seule
- Colonne droite : 2 dernières notes publiées + nuage de tags

Avec 35 notes publiées et un jardin en croissance, la page d'accueil ne reflète pas la richesse du contenu.

---

## Structure cible

```
┌─────────────────┬─────────────────┐
│  Hero image     │  2 dernières    │
│  (inchangée)    │  notes          │
│                 │                 │
│  Note surprise  │  Nuage de tags  │
│  (aléatoire)    │                 │
├─────────────────┴─────────────────┤
│  "Herbes folles" — 6 notes        │
│  aléatoires                       │
└───────────────────────────────────┘
```

---

## Composant 1 — Note surprise (colonne gauche, sous le hero)

**Emplacement :** `home.njk`, colonne gauche, sous la `<figure class="home-hero-image">`

**Sélection :** une note tirée aléatoirement parmi `collections.notes` au build via un filtre Eleventy `shuffle`. La hero image garde ses dimensions actuelles.

**Contenu affiché :**
- Badge "Note du moment"
- Titre de la note (lien vers la note)
- Description tronquée (filtre `truncateAtPunctuation` existant)
- Tags de la note
- Backlink éventuel : "↩ lié par : [titre]" — affiché uniquement si `note.data.backlinks` est non vide

**Style :** sobre, cohérent avec les cartes `.latest-note` existantes de la colonne droite. Pas de fond coloré.

---

## Composant 2 — "Herbes folles" (zone pleine largeur, bas de page)

**Emplacement :** `home.njk`, après le `.home-layout` à 2 colonnes, section pleine largeur.

**Titre :** "Herbes folles"

**Sélection :** 6 notes tirées aléatoirement parmi `collections.notes` au build, en excluant la note déjà affichée en "note surprise" (pas de doublon).

**Contenu par carte :**
- Titre de la note (lien)
- Tags de la note

Pas de description — cartes compactes, rôle de découverte rapide.

**Style :**
- Séparateur : bordure supérieure `2px solid var(--yellow)` pleine largeur
- Fond de section : `#fffdf0` (légèrement différent du fond page)
- Disposition : grille CSS responsive (3 colonnes sur desktop, 2 sur tablette, 1 sur mobile)

---

## Implémentation technique

### Filtre Eleventy `shuffle`

Ajouter dans `.eleventy.js` un filtre `shuffle` (Fisher-Yates) :

```js
eleventyConfig.addFilter("shuffle", (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
});
```

### Sélection sans doublon dans le template

```njk
{% set shuffled = collections.notes | shuffle %}
{% set surpriseNote = shuffled[0] %}
{% set herbasFolles = shuffled | slice(1, 7) %}
```

### Fichiers à modifier

| Fichier | Modification |
|---|---|
| `src/layouts/home.njk` | Ajouter note surprise + section "Herbes folles" |
| `src/css/style.css` | Styles pour `.home-surprise`, `.herbes-folles`, `.herbes-folles-grid` |
| `.eleventy.js` | Ajouter filtre `shuffle` |

---

## Ce qui ne change pas

- La hero image (dimensions, position, alt text)
- La colonne droite (2 dernières notes + nuage de tags)
- Toutes les autres pages
