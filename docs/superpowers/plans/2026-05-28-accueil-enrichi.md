# Page d'accueil enrichie — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrichir la page d'accueil avec une note surprise dans la colonne gauche et une section "Herbes folles" (6 notes aléatoires) en bas de page, pour favoriser la découverte du jardin.

**Architecture:** On ajoute un filtre `shuffle` dans `.eleventy.js`, on l'utilise dans `home.njk` pour tirer une note surprise (colonne gauche) et 6 notes supplémentaires (zone pleine largeur), en évitant tout doublon entre les deux. Les styles sont ajoutés dans `style.css`.

**Tech Stack:** Eleventy 3 (ESM), Nunjucks, CSS custom properties (palette Bauhaus existante)

---

## Carte des fichiers

| Fichier | Rôle de la modification |
|---|---|
| `.eleventy.js` | Ajout du filtre `shuffle` (Fisher-Yates) |
| `src/layouts/home.njk` | Ajout bloc note surprise + section "Herbes folles" |
| `src/css/style.css` | Styles `.home-surprise`, `.herbes-folles`, `.herbes-folles-grid` |

---

## Task 1 : Filtre `shuffle` dans Eleventy

**Files:**
- Modify: `.eleventy.js` — ajouter le filtre après la ligne `eleventyConfig.addFilter("randomLetters", ...)` (ligne ~286)

- [ ] **Étape 1 : Localiser l'emplacement exact**

  Dans `.eleventy.js`, repérer la fin du bloc filtre `randomLetters` (vers la ligne 286). Le filtre `shuffle` sera ajouté juste après.

- [ ] **Étape 2 : Ajouter le filtre**

  Insérer après la fermeture du filtre `randomLetters` :

  ```js
  eleventyConfig.addFilter("shuffle", function(arr) {
    if (!Array.isArray(arr)) return arr;
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  });
  ```

- [ ] **Étape 3 : Vérifier que le build passe**

  ```bash
  npm run build
  ```

  Attendu : build sans erreur, pas de mention `Unknown filter: shuffle`.

- [ ] **Étape 4 : Commit**

  ```bash
  git add .eleventy.js
  git commit -m "feat: ajouter filtre shuffle (Fisher-Yates) pour la home"
  ```

---

## Task 2 : Note surprise dans la colonne gauche (`home.njk`)

**Files:**
- Modify: `src/layouts/home.njk` — ajouter la section note surprise dans `.home-column-left`, après `</figure>`

- [ ] **Étape 1 : Ajouter la sélection aléatoire en tête du bloc `{% block content %}`**

  Dans `home.njk`, juste après `{% block content %}` et avant `<div class="home-layout">`, insérer :

  ```njk
  {% set shuffled = collections.notes | shuffle %}
  {% set surpriseNote = shuffled[0] %}
  {% set herbesFolles = shuffled | slice(1, 7) %}
  ```

- [ ] **Étape 2 : Ajouter le bloc note surprise dans la colonne gauche**

  Après la balise fermante `</figure>` de `.home-hero-image` (ligne ~19), insérer :

  ```njk
  {# ---------------- Note surprise ---------------- #}
  {% if surpriseNote %}
    <section class="home-surprise" aria-labelledby="surprise-heading">
      <h2 id="surprise-heading" class="home-surprise-label">Note du moment</h2>
      <article class="surprise-note">
        <p class="surprise-note-title">
          <a href="{{ surpriseNote.url }}">{{ surpriseNote.data.title }}</a>
        </p>
        {% if surpriseNote.data.description %}
          {% set truncated = surpriseNote.data.description | truncateAtPunctuation %}
          <p class="surprise-note-description">
            {{ truncated.text }}
            {% if truncated.lastWord %}
              <a href="{{ surpriseNote.url }}" class="last-word-link">
                <em>{{ truncated.lastWord }}</em>
              </a>
            {% endif %}
          </p>
        {% endif %}
        {% if surpriseNote.data.tags and (surpriseNote.data.tags | length) > 0 %}
          <ul class="surprise-note-tags">
            {% for tag in surpriseNote.data.tags %}
              <li><a href="/tags/{{ tag | safelink }}/">{{ tag }}</a></li>
            {% endfor %}
          </ul>
        {% endif %}
        {% if surpriseNote.data.backlinks and (surpriseNote.data.backlinks | length) > 0 %}
          <p class="surprise-note-backlink">
            ↩ lié par :
            <a href="{{ surpriseNote.data.backlinks[0].url }}">{{ surpriseNote.data.backlinks[0].title }}</a>
          </p>
        {% endif %}
      </article>
    </section>
  {% endif %}
  ```

- [ ] **Étape 3 : Vérifier le build**

  ```bash
  npm run build
  ```

  Attendu : build sans erreur.

- [ ] **Étape 4 : Vérifier le rendu**

  Ouvrir `_site/index.html` et confirmer la présence d'un bloc avec un titre de note et ses tags dans la colonne gauche.

  ```bash
  grep -A 5 "home-surprise" _site/index.html | head -20
  ```

  Attendu : présence de `.home-surprise` avec un `<a href="/notes/...">`.

- [ ] **Étape 5 : Commit**

  ```bash
  git add src/layouts/home.njk
  git commit -m "feat: ajouter note surprise aléatoire dans la colonne gauche de la home"
  ```

---

## Task 3 : Section "Herbes folles" (`home.njk`)

**Files:**
- Modify: `src/layouts/home.njk` — ajouter la section pleine largeur après `</div>` du `.home-layout`

- [ ] **Étape 1 : Ajouter la section après le `.home-layout`**

  Après `</div>{# fin .home-layout #}` et avant `{% endblock %}`, insérer :

  ```njk
  {# ============================================================
     SECTION PLEINE LARGEUR — HERBES FOLLES
     ============================================================ #}
  {% if herbesFolles and (herbesFolles | length) > 0 %}
    <section class="herbes-folles" aria-labelledby="herbes-folles-heading">
      <h2 id="herbes-folles-heading" class="herbes-folles-title">Herbes folles</h2>
      <ul class="herbes-folles-grid">
        {% for note in herbesFolles %}
          <li class="herbes-folles-card">
            <a href="{{ note.url }}" class="herbes-folles-card-title">{{ note.data.title }}</a>
            {% if note.data.tags and (note.data.tags | length) > 0 %}
              <ul class="herbes-folles-tags">
                {% for tag in note.data.tags %}
                  <li><a href="/tags/{{ tag | safelink }}/">{{ tag }}</a></li>
                {% endfor %}
              </ul>
            {% endif %}
          </li>
        {% endfor %}
      </ul>
    </section>
  {% endif %}
  ```

- [ ] **Étape 2 : Vérifier le build**

  ```bash
  npm run build
  ```

  Attendu : build sans erreur.

- [ ] **Étape 3 : Vérifier le rendu**

  ```bash
  grep -A 3 "herbes-folles-title" _site/index.html
  ```

  Attendu : présence du titre "Herbes folles" et de 6 liens vers des notes.

- [ ] **Étape 4 : Commit**

  ```bash
  git add src/layouts/home.njk
  git commit -m "feat: ajouter section Herbes folles (6 notes aléatoires) en bas de la home"
  ```

---

## Task 4 : Styles CSS

**Files:**
- Modify: `src/css/style.css` — ajouter les blocs de styles à la fin du fichier, avant la dernière accolade ou en fin de fichier

- [ ] **Étape 1 : Ajouter les styles de la note surprise**

  À la fin de `src/css/style.css`, ajouter :

  ```css
  /* ============================================================
     HOME — Note surprise
     ============================================================ */
  .home-surprise-label {
    font-size: var(--t--1);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-muted);
    margin-bottom: 0.75rem;
  }

  .surprise-note {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .surprise-note-title {
    font-family: var(--font-serif);
    font-size: var(--t1);
    line-height: var(--lh-title);
  }

  .surprise-note-title a {
    color: var(--color-strong);
  }

  .surprise-note-title a:hover {
    color: var(--color-highlight);
  }

  .surprise-note-description {
    font-size: var(--t0);
    color: var(--color-muted);
    line-height: var(--lh-body);
  }

  .surprise-note-tags {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .surprise-note-tags li a {
    font-family: var(--font-mono);
    font-size: var(--t--1);
    color: var(--color-strong);
    background: var(--yellow);
    padding: 0.15rem 0.45rem;
    border-radius: 3px;
  }

  .surprise-note-tags li a:hover {
    color: var(--color-highlight);
  }

  .surprise-note-backlink {
    font-size: var(--t--1);
    color: var(--color-muted);
    font-style: italic;
  }

  .surprise-note-backlink a {
    color: var(--color-highlight);
  }

  /* ============================================================
     HOME — Herbes folles
     ============================================================ */
  .herbes-folles {
    border-top: 2px solid var(--yellow);
    background: #fffdf0;
    padding: 2rem 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  .herbes-folles-title {
    font-size: var(--t--1);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-muted);
    margin-bottom: 1.25rem;
  }

  .herbes-folles-grid {
    list-style: none;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  .herbes-folles-card {
    background: var(--white);
    border: 1px solid #e5e5e5;
    border-radius: 4px;
    padding: 0.85rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .herbes-folles-card-title {
    font-family: var(--font-serif);
    font-size: var(--t0);
    font-weight: 600;
    color: var(--color-strong);
    line-height: var(--lh-title);
  }

  .herbes-folles-card-title:hover {
    color: var(--color-highlight);
  }

  .herbes-folles-tags {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  .herbes-folles-tags li a {
    font-family: var(--font-mono);
    font-size: var(--t--1);
    color: var(--color-strong);
    background: var(--yellow);
    padding: 0.1rem 0.35rem;
    border-radius: 3px;
  }

  .herbes-folles-tags li a:hover {
    color: var(--color-highlight);
  }

  /* Responsive Herbes folles */
  @media (max-width: 900px) {
    .herbes-folles-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 600px) {
    .herbes-folles-grid {
      grid-template-columns: 1fr;
    }

    .herbes-folles {
      padding: 1.5rem 1rem;
    }
  }
  ```

- [ ] **Étape 2 : Vérifier le build**

  ```bash
  npm run build
  ```

  Attendu : build sans erreur.

- [ ] **Étape 3 : Vérifier visuellement**

  Ouvrir `_site/index.html` dans un navigateur ou avec un serveur local :

  ```bash
  npx @11ty/eleventy --serve
  ```

  Vérifier :
  - La note surprise apparaît bien sous la hero image (col. gauche)
  - La section "Herbes folles" apparaît en bas de page, pleine largeur
  - La grille passe à 2 colonnes sous 900px et 1 colonne sous 600px
  - Pas de doublon entre la note surprise et les 6 cartes

- [ ] **Étape 4 : Commit**

  ```bash
  git add src/css/style.css
  git commit -m "feat: styles home-surprise et herbes-folles"
  ```

---

## Remarque sur la sticky column gauche

Le CSS existant rend la colonne gauche sticky sur desktop large (`position: sticky; top: 2rem` au-dessus de 1100px). Avec l'ajout de la note surprise, la colonne gauche sera plus haute et sortira potentiellement du viewport. Si c'est gênant visuellement après test, supprimer ou ajuster la règle `sticky` dans le media query `@media (min-width: 1100px)` dans `style.css` (ligne ~1229).
