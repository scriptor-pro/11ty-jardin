---
title: Notes
layout: base.njk
publish: true
status: idée
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
