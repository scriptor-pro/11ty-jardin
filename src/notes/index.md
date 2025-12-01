---
title: Notes
layout: base.njk
publish: true
status: idée
---
# Notes

{% for note in collections.notesWithBacklinks %}
- <a href="/notes/{{ note.fileSlug }}/">{{ note.data.title }}</a>
{% endfor %}
