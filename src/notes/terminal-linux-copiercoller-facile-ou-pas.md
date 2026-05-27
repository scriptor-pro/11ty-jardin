---
title: "Terminal linux : copier/coller facile ou pas ?"
layout: note.njk
date: 2026-05-27
description: ""
tags: ["linux", "terminal", "fonction"]
---

# Terminaux installés

Est-ce que j'ai vraiment installé 17 (dix-sept) logiciels émulateurs de terminal ? Vous n'avez aucune preuve. 

## Le problème du copier/coller

Il y a les terminaux qui pratiquent le copier/coller bon enfant, facile Basile : sélectionner, clic-droit. Et il y a ceux qui font leurs divas du copy/paste. 

## Un problème de taille 

Autant dire que Tabby, Hyper et Warp pourraient dégager et ramener le nombre de terminaux installés à un minuscule, spartiate, famélique quatorze (14)

---

## Partie 1 — Copie via sélection + clic-droit

| Terminal | RAM repos | Technologie |
|----------|-----------|-------------|
| xterm | ~8–15 Mo | X11 pur, Xlib |
| sakura | ~20–30 Mo | GTK3, VTE |
| mate-terminal | ~30–40 Mo | GTK3, VTE |
| xfce4-terminal | ~30–40 Mo | GTK3, VTE |
| gnome-terminal | ~40–60 Mo | GTK3, VTE |
| ptyxis | ~40–60 Mo | GTK4/libadwaita, VTE (Flatpak) |
| tilix | ~50–70 Mo | GTK3, VTE |
| terminator | ~50–70 Mo | Python, GTK3, VTE |
| konsole | ~60–80 Mo | Qt5/KDE |

Sélectionner du texte le place dans le presse-papiers primaire (colle avec clic-milieu) ; le menu clic-droit propose "Copier" pour le presse-papiers système.

---

## Partie 2 — Copie par raccourci clavier ou interface propre

| Terminal | RAM repos | Technologie | Méthode de copie |
|----------|-----------|-------------|------------------|
| alacritty | ~40–60 Mo | Rust, OpenGL | `Ctrl+Shift+C` — pas de menu clic-droit |
| kitty | ~40–60 Mo | C + Python, OpenGL | `Ctrl+Shift+C`, mode sélection clavier |
| wezterm | ~60–80 Mo | Rust, WebGPU | `Ctrl+Shift+C`, clic-droit = coller |
| ghostty | ~60–90 Mo | Zig, GPU natif | `Ctrl+Shift+C`, pas de menu clic-droit |
| contour | ~60–100 Mo | C++, OpenGL (Flatpak) | `Ctrl+Shift+C`, pas de menu clic-droit |
| tabby | ~200–350 Mo | Electron (Chromium) | `Ctrl+C` en mode sélection |
| hyper | ~200–350 Mo | Electron (Chromium) | `Ctrl+C` en mode sélection |
| warp | ~300–500 Mo | Rust, GPU, cloud IA | Sélection + touche, interface IA par blocs |
