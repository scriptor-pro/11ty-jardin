# claude.md — Spécification de la page d’accueil

Ce document décrit **de manière normative** la structure, le contenu et le comportement de la page d’accueil du digital garden **« Je note donc je suis »**, basé sur Eleventy (11ty).

Il sert de **référence unique** pour l’implémentation HTML/Nunjucks, les filtres Eleventy et le CSS associé.

---

## 1. Intention générale

La page d’accueil est conçue comme un **seuil** :
- elle oriente sans saturer,
- elle montre que le site est vivant,
- elle laisse au visiteur le choix de son mode d’entrée (lecture ou exploration).

Aucune logique marketing. Aucun tableau de bord. Un lieu.

---

## 2. Structure globale

Ordre visuel (sans hiérarchie de valeur) :

1. Hero section
2. Dernière note publiée
3. Nuage de tags pondéré

---

## 3. Hero section

### 3.1 Contenu

**Titre**  
Je note donc je suis

**Sous-titre**  
Je note pour comprendre. Je publie pour relier.

### 3.2 Source du contenu

Le contenu de la hero est défini dans un **fichier Markdown dédié**, éditable depuis desktop ou mobile (Markor).

Fichier recommandé : `homepage.md`

### 3.3 Contraintes

- HTML sémantique (`<header>` / `<section>`)
- Lisible sans CSS
- Aucun bouton obligatoire

---

## 4. Dernière note publiée

### 4.1 Position

La dernière note apparaît **immédiatement après la hero section**.

### 4.2 Logique d’affichage

**Cas 1 — la note possède une `description`**
- afficher le titre (non cliquable),
- afficher le début de la description,
- le dernier mot réel affiché est un lien vers la note,
- ce mot reçoit un traitement typographique distinct.
- coupure à la première ponctuation forte (`.`, `;`, `:`).

**Cas 2 — la note ne possède pas de `description`**
- afficher uniquement le titre comme lien,
- aucune mention explicative.

---

## 5. Nuage de tags pondéré

- intégré visuellement à la hero (décision provisoire),
- bloc lisible mais non dominant,
- tous les tags affichés,
- ordre alphabétique,
- limite visuelle CSS,
- pondération par taille et graisse,
- jamais basé uniquement sur la couleur (WCAG 2.1 AA).

---

## 6. Contraintes techniques Eleventy

- Aucun JavaScript requis
- HTML sémantique prioritaire

### Filtres à implémenter
- truncateAtPunctuation
- lastWordLink
- tagWeights

---

## 7. Philosophie

Pas de forme sans fonction.  
Lisibilité avant expressivité.  
Un jardin pousse lentement.
