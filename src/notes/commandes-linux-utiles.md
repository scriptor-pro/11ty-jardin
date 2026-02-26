---
title: "Quelques commandes CLI utiles mais pas fréquentes - Linux"
layout: note.njk
date: 2025-12-23
description: "Linux : Les commandes terminal CLI qui me sauvent et que je n'emploie pas assez souvent au point de m'en souvenir par coeur. bureau XFCE"
statut: chantier
tags:
  - linux
  - cli
  - terminal
---

# Quelques commandes CLI utiles mais pas fréquentes - Linux

Les commandes que j'utilise assez souvent pour avoir envie de m'en souvenir et assez rarement pour ne pas les connaître par coeur.


## Audio 

Pour vérifier le bon fonctionnement du système audio : `wpctl status && pactl list short sinks`

## AMD ou ARM

Pour savoir quelle est la bonne version à télécharger :



    `dpkg --print-architecture`




## Bureau XFCE

Je n'utilise actuellement que XFCE. Autrement dit, ça ne vaus pas forcément pour les autres environnements.



## Installer une police de caractères

### Pour une police TTF (True Type Font)


 1. Télécharger la police. 
 2. Déplacer le terminal dans le répertoire où se trouvent les fichiers ttf ou otf 

    'cp *.ttf ~/.local/share/fonts/truetype/'

### Pour une police Open Type (.otf)

    ''cp *.ttf ~/.local/share/fonts/''

## Au secours, je suis prisonnier de Alt-Tab — XFCE

Pas moyen de changer de passer d'une app à une autre autrement que par Alt-Tab

''xfwm4 --replace & ''