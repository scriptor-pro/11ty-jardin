---
layout: notes-index.njk
id: 00000000-notes
title: Notes
publish: true
status: idée
seo_title: "Notes — Je note donc je suis"
seo_description: "Explorez les notes du jardin numérique par sujet ou recherchez un mot-clé."
---

# Toutes les notes

<p class="catalog-intro">Un carnet vivant : astuces, expériences, idées en chantier et découvertes. Choisissez un sujet ou cherchez un mot pour trouver votre prochaine lecture.</p>

<div class="catalog-controls">
  <label for="notes-search">Rechercher dans les notes</label>
  <input id="notes-search" type="search" placeholder="Ex. photo, Linux, révéler…" autocomplete="off">
  <p id="notes-count" class="catalog-count" aria-live="polite"></p>
</div>

<ul class="notes-catalog-grid" id="notes-catalog">
  {% for note in collections.notesWithBacklinks | sort(attribute="data.title") %}
    <li class="catalog-card" data-search="{{ (note.data.title ~ ' ' ~ (note.data.description or '') ~ ' ' ~ (note.data.tags | join(' '))) | lower | escape }}">
      <article>
        <h2><a href="{{ note.url }}">{{ note.data.title }}</a></h2>
        {% if note.data.description %}<p>{{ note.data.description }}</p>{% endif %}
        {% if note.data.tags and (note.data.tags | length) > 0 %}
          <ul class="catalog-tags" aria-label="Sujets">
            {% for tag in note.data.tags %}
              <li><a href="/tags/{{ tag | safelink }}/">{{ tag }}</a></li>
            {% endfor %}
          </ul>
        {% endif %}
      </article>
    </li>
  {% endfor %}
</ul>

<p class="catalog-empty" id="notes-empty" hidden>Aucune note ne correspond à cette recherche. Essayez un autre mot.</p>

<script>
  (() => {
    const search = document.getElementById("notes-search");
    const cards = [...document.querySelectorAll(".catalog-card")];
    const count = document.getElementById("notes-count");
    const empty = document.getElementById("notes-empty");
    const normalize = value => value.toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const update = () => {
      const query = normalize(search.value.trim());
      let visible = 0;
      cards.forEach(card => {
        const matches = !query || normalize(card.dataset.search).includes(query);
        card.hidden = !matches;
        if (matches) visible += 1;
      });
      count.textContent = `${visible} note${visible > 1 ? "s" : ""}`;
      empty.hidden = visible !== 0;
    };
    search.addEventListener("input", update);
    update();
  })();
</script>
