# Design — `jardin`, publier le jardin depuis le terminal

**Date :** 2026-11-14
**Objectif :** écrire, publier, modifier et dépublier les notes de jndjs.dev sans quitter le terminal.

---

## Intention

L'auteur préfère publier depuis le terminal. Il a déjà une app graphique de publication (Jules, `~/Documents/Projets/Jules`) ; `jardin` est l'outil terminal propre au jardin. Les deux doivent pouvoir publier sur le même dépôt sans se marcher dessus.

### Objectifs
- Une commande pour chaque geste : créer, lister, modifier, publier, dépublier, prévisualiser.
- Brouillons privés **et** sauvegardés (versionnés, poussés).
- Publier sans risque : rien n'est poussé si la note ou le build est invalide.
- Savoir quand la note est réellement en ligne.

### Non-objectifs
- Remplacer ou modifier Jules (ses défauts sont listés dans `~/Documents/Projets/Jules/DEFAUTS.md`, chantier séparé).
- Gérer d'autres sites que jndjs.dev.
- Complétion bash (reportée, voir `TODO.md`).
- Gestion des images / médias.

### Anti-objectifs (échec même si « ça marche »)
- Un brouillon visible publiquement (dépôt public `scriptor-pro/11ty-jardin` ou site).
- Un push qui casse le build du site.
- Un commit qui embarque des fichiers non liés à la note traitée.
- Une perte de brouillon.

---

## Contexte vérifié

- **Site** : `~/Documents/Projets/11ty-jardin`, dépôt **public** `git@github.com:scriptor-pro/11ty-jardin.git`, branche `main`. Notes dans `src/notes/*.md`.
- **Déploiement** : chaque push sur `main` déclenche un webhook → statichost (site `jardin-11`) qui build selon `statichost.yml`. En ligne **4 à 6 min** après le push. Ne jamais supprimer `statichost.yml`.
- **Version en ligne** : `src/layouts/header.njk:25` affiche `<p class="small build-id"> 1.0.N (<sha court>) </p>` ; le sha est celui du commit construit (7 caractères observés).
- **`publish: false`** exclut entièrement une note du build (preprocessor dans `.eleventy.js`, commit `cc4722a`).
- **Brouillons** : `~/Documents/jardin-brouillons`, dépôt **privé** `git@github.com:scriptor-pro/jardin-brouillons.git`, branche `main`, ne contient qu'un `README.md`.
- **Jules** publie dans son propre clone du même dépôt, en créant `src/notes/<slug>.md` (commit `feat: publish "Titre"`, auteur `Jules <jules@app>`) et dépublie en supprimant le fichier (`chore: unpublish "Titre"`). Son front matter : `title`, `layout: note.njk`, `date`, `description`, `tags: ["a", "b"]`.
- **Règle d'`id`** existante (`utils/assign-note-ids.js`, `computeId`) : `JJMMAAAA-<slug>` où la date vient de `created` sinon `date`, et `<slug>` = titre translittéré (NFD, sans diacritiques), minuscules, non-alphanumériques → `-`, **3 premiers mots** max ; sans date : `00000000-<slug>`.
- **Outils disponibles** : bash, git, node 20, npm, `fzf`, `gum` 2.0.2, `glow` 3.0.0, `micro`, `nano` (`$EDITOR=nano`), `curl`, `jq`. Dans `node_modules` du site : `gray-matter`, `js-yaml` (transitifs d'Eleventy).

---

## Approches considérées

| | Approche | Compromis |
|---|---|---|
| **A (retenue)** | Script bash `jardin` dans `11ty-jardin/scripts/`, s'appuyant sur fzf/gum/glow/git | Prototype rapide, spécifique au jardin (id, build de contrôle, attente du déploiement). Deux outils (avec Jules) à garder compatibles. |
| B | Ajouter un mode CLI à Jules (extraire la logique Rust en bibliothèque + binaire) | Un seul outil multi-sites, mais refactorisation préalable de Jules ; besoins propres au jardin mal adaptés à un outil générique. |
| C | Abandonner Jules, `publish: false` dans le dépôt public | Brouillons lisibles publiquement sur GitHub : écarté (anti-objectif). |

**Choix de l'auteur : A.** B reste une évolution possible une fois le besoin terminal éprouvé.

---

## Décisions de l'auteur

1. Brouillons dans le dépôt privé `jardin-brouillons`, **hors** du dépôt du site.
2. Publier = compléter le front matter et **déplacer** le fichier vers `src/notes/` ; dépublier = le ramener dans les brouillons.
3. Désignation d'une note : slug (nom de fichier sans `.md`) ; sans argument → sélection fzf ; argument partiel → fzf pré-filtré, ou action directe si une seule correspondance ; un chemin `.md` explicite est aussi accepté.
4. `gum` et `glow` utilisés pour les confirmations et l'aperçu.
5. Messages de commit identiques à Jules : `feat: publish "Titre"` / `chore: unpublish "Titre"`.
6. `git pull --rebase` avant tout push.
7. Modifier une note **déjà en ligne** via `jardin edit` : mise à jour en ligne **immédiate** après fermeture de l'éditeur (avec confirmation).
8. Pas de Codeberg.

---

## Comportement

### Sous-commandes

```
jardin new "Titre"        crée un brouillon, ouvre l'éditeur, sauvegarde (commit + push brouillons)
jardin drafts             liste les brouillons : titre, created, tags
jardin edit [note]        ouvre un brouillon ou une note en ligne ; enchaîne la sauvegarde / mise à jour
jardin publish [note]     brouillon → en ligne
jardin unpublish [note]   en ligne → brouillon
jardin preview            npm run dev dans le dépôt du site
jardin help               aide (aussi sans argument)
```

### Brouillon (créé par `new`)

Fichier `~/Documents/jardin-brouillons/<slug>.md` :

```markdown
---
title: "Titre"
description: ""
tags: []
created: 2026-11-14
---

# Titre

```

- `<slug>` : même règle que Jules (`toSlug` : NFD sans diacritiques, minuscules, garder `[a-z0-9 -]`, espaces → `-`, tirets fusionnés), **sans** limite de mots, pour que les noms de fichiers des deux outils coïncident.
- Refus si `<slug>.md` existe déjà dans les brouillons **ou** dans `src/notes/`.
- Les chaînes YAML sont échappées (un titre contenant `"` ou `\` doit produire un YAML valide).
- Après fermeture de l'éditeur : commit `brouillon: "Titre"` + push dans `jardin-brouillons`. Si le fichier n'a pas changé par rapport au gabarit, le demander : garder ou supprimer.

### `drafts`

Tableau (titre, `created`, tags) des `*.md` des brouillons (hors `README.md`), le plus récent en premier. Aucun brouillon → message explicite.

### `edit [note]`

- Candidats : brouillons **et** notes de `src/notes/*.md` (hors `index.md`), marqués `[brouillon]` / `[en ligne]` dans fzf.
- Ouvre `$EDITOR` (repli : `nano`).
- **Brouillon** modifié → commit `brouillon: "Titre"` + push brouillons.
- **Note du site** : ordre des opérations *(décision de conception)* :
  1. **Avant** d'ouvrir l'éditeur : refuser si le dépôt du site a des modifications non commitées, puis `git pull --rebase` (pour éditer la dernière version, Jules pouvant pousser depuis un autre clone).
  2. Éditer. Rien modifié → ne rien faire.
  3. Afficher le diff, `gum confirm "Mettre à jour en ligne ?"`. Non → laisser la modification non commitée et le dire.
  4. Oui → mettre à jour `updated` (date du jour ; ajouté s'il manque), valider le YAML, build de contrôle.
  5. Commit du seul fichier `content: mettre à jour "Titre"`, puis `git pull --rebase`, push, attente de la mise en ligne.
  - **Jamais** jeter ce que l'auteur vient d'écrire : si la validation ou le build échoue → la modification reste non commitée, message explicite. Si le rebase de l'étape 5 entre en conflit → `git rebase --abort`, le commit reste local, message expliquant de résoudre puis relancer `git push`.

### `publish [note]`

Candidats : brouillons uniquement. Étapes, dans l'ordre ; tout échec arrête **sans rien pousser** et laisse le brouillon intact :

1. **Valider** : front matter YAML lisible ; `title` non vide ; corps non vide et différent du gabarit (`# Titre` seul).
2. **Aperçu** avec `glow`, puis `gum confirm "Publier « Titre » ?"`.
3. **Dépôt du site** : refuser s'il a des modifications non commitées (hors fichiers ignorés) ; `git pull --rebase`.
4. **Compléter le front matter** (sans réécrire ni réordonner les champs existants) :
   - `layout: note.njk` si absent ;
   - `date:` date du jour si absente ;
   - `id:` calculé selon la règle de `computeId` (ci-dessus), si absent ;
   - **supprimer la ligne `publish: false`** si présente (seule exception à la règle « ajout uniquement » ; sinon la note serait poussée mais absente du site).
5. **Déplacer** vers `src/notes/<slug>.md` (refus si le fichier existe déjà).
6. **Build de contrôle** : `npm run build` dans le dépôt du site. En cas d'échec : remettre le fichier dans les brouillons (contenu original), afficher l'erreur, s'arrêter.
7. **Commit** du seul fichier de la note : `feat: publish "Titre"` ; push. Si le push est refusé : un nouveau `pull --rebase` puis un seul nouvel essai.
8. **Brouillons** : `git rm` du brouillon, commit `publié: "Titre"`, push.
9. **Attendre la mise en ligne** (voir plus bas), puis afficher `En ligne : https://jndjs.dev/notes/<slug>/`.

### `unpublish [note]`

Candidats : notes de `src/notes/*.md` (hors `index.md`).

1. `gum confirm "Dépublier « Titre » ?"`.
2. Dépôt du site propre + `git pull --rebase`.
3. Copier la note dans les brouillons (refus si un brouillon du même slug existe), en conservant tout le front matter (dont `id`, `created`), commit `brouillon: dépublié "Titre"` + push brouillons.
4. `git rm` dans le site, commit `chore: unpublish "Titre"`, push.
5. Attendre la mise en ligne, puis vérifier que `https://jndjs.dev/notes/<slug>/` ne renvoie plus 200.

### Attente de la mise en ligne

- Comparer le sha affiché dans `.build-id` de `https://jndjs.dev/` (requête avec paramètre anti-cache) au début du sha du commit poussé.
- Interroger toutes les 20 s, au plus **8 min**, avec un indicateur `gum spin`.
- Au-delà : message « Poussé, mais pas encore en ligne après 8 min — vérifier statichost » et code de sortie non nul.
- Ctrl-C pendant l'attente : sortie propre (le push est déjà fait, le dire).

### Messages et sortie
- Messages en français, sobres.
- Code de sortie 0 en cas de succès, non nul sinon.
- Dépendance manquante (`fzf`, `gum`, `glow`, `git`, `npm`, `node`) → message qui la nomme.

---

### Notes du site en `publish: false` *(décision de conception)*
Il en existe (ex. `src/notes/cqja-2025-50.md`). Elles ne sont **pas** des brouillons au sens de `jardin` : ni candidates à `publish`, ni listées par `drafts`. `edit` et `unpublish` les proposent, marquées `[masquée]` au lieu de `[en ligne]` ; pour elles, l'attente de mise en ligne et la vérification d'URL sont sautées.

### `src/_data/version.json` *(décision de conception)*
Le `prebuild` (`utils/write-version.js`) réécrit ce fichier suivi par git à chaque build : chaque build de contrôle salirait le dépôt et bloquerait la commande suivante. Il est **retiré du suivi** (`.gitignore` + `git rm --cached`), dans un commit séparé, préalable au script. Sans risque : statichost lance `npm run build`, donc `prebuild` régénère le fichier avant Eleventy (vérifié : le site en ligne affiche bien le sha du commit construit).

---

## Configuration et installation

- Script : `scripts/jardin` (exécutable) dans le dépôt du site.
- Lien : `~/.local/bin/jardin` → `scripts/jardin`.
- Variables d'environnement (avec valeurs par défaut) :
  - `JARDIN_SITE` = répertoire du dépôt du site (par défaut : résolu depuis l'emplacement réel du script, suivi du lien) ;
  - `JARDIN_BROUILLONS` = `~/Documents/jardin-brouillons` ;
  - `JARDIN_URL` = `https://jndjs.dev`.

---

## Laissé au constructeur

- Lecture/écriture du front matter : un petit utilitaire Node (`scripts/jardin-fm.mjs` ou équivalent) est autorisé, notamment pour valider le YAML via `js-yaml` ; dans ce cas, déclarer `js-yaml` explicitement en `devDependencies`. L'ajout de champs doit être **par lignes** (pas de re-sérialisation complète) pour ne pas modifier la mise en forme des notes existantes.
- Découpage interne du script, noms de fonctions.
- Stratégie de test : tests automatisés sur des dépôts git temporaires avec remote nu local (pas de vrai push, pas de réseau ; l'attente de mise en ligne doit pouvoir être désactivée ou simulée, p. ex. variable `JARDIN_NO_WAIT=1`).
- Mise en forme exacte des listes fzf et des messages.

## Hors périmètre, notés pour plus tard
- Complétion bash (`TODO.md`).
- `jardin import-jules` : convertir les brouillons JSON de Jules en Markdown.
