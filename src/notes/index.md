---
layout: notes-index.njk
id: 00000000-notes
title: Notes
publish: true
status: idée
seo_title: "Notes — Je note donc je suis"
seo_description: "Toutes les notes du digital garden, classées par ordre chronologique."
---
# Notes

{% for note in collections.notesWithBacklinks %}
- <a href="/notes/{{ note.fileSlug }}/">{{ note.data.title }}</a>
  {% if note.data.description %}
  {% set desc = note.data.description %}
  {% set preview = desc | slice(0, 61) %}
  <div>{{ preview }}{% if desc | length > 61 %} —{% endif %}</div>
  {% endif %}
{% endfor %}
