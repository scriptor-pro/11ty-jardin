---
title: "Une app qui peut s'installer dans Windows : comment faire ?"
layout: note.njk
date: 2025-12-23
description: "Alors comme ça, tu voudrais que ton app soit utilisable dans l'univers Windows ? Voici comment faire. Spoiler alert : ça n'est pas simplissime."
statut: chantier
tags:
  - IA
  - vibe-coding
  - windows
---
# Une app qui peut s'installer dans Windows : comment faire ? 

## Checklist chronologique — Release Windows (vue opératoire)

Cette checklist suit strictement l’ordre réel des actions, du code prêt à livrer jusqu’à l’installateur Windows signé et distribuable.

---

## Étape 1 — Préparer l’application
- [ ] L’application fonctionne hors environnement de développement
- [ ] Aucun chemin codé en dur (HOME, machine, build)
- [ ] Gestion propre des erreurs
- [ ] Dépendances intégrées ou documentées

## Étape 2 — Produire l’artefact installable
- [ ] Binaire ou dossier installable clair
- [ ] Ressources incluses
- [ ] Fonctionne depuis un chemin arbitraire
- [ ] Pas d’écriture dans le dossier d’installation

## Étape 3 — Identité logicielle
- [ ] Nom exact de l’application
- [ ] Nom de l’éditeur
- [ ] Version (SemVer)
- [ ] Description courte
- [ ] URL / support / contact

## Étape 4 — Éléments Windows
- [ ] Icône .ico multi‑résolution
- [ ] Licence définie (LICENSE)
- [ ] Choix installation utilisateur ou système
- [ ] Séparation code / données utilisateur

## Étape 5 — Générer l’installateur
- [ ] Outil de packaging choisi
- [ ] Copie correcte des fichiers
- [ ] Raccourcis configurés
- [ ] Désinstallation fonctionnelle

## Étape 6 — Signature
- [ ] Certificat valide
- [ ] Binaire signé
- [ ] Installateur signé
- [ ] Horodatage
- [ ] Vérification signature

## Étape 7 — Tests
- [ ] Test sur Windows “neuf”
- [ ] SmartScreen vérifié
- [ ] Désinstallation testée
- [ ] Mise à jour testée

## Étape 8 — Distribution
- [ ] Nom de fichier clair et versionné
- [ ] Page de téléchargement
- [ ] Instructions utilisateur
- [ ] Artefacts archivés

---

# Checklist globale — Audit release Windows

(… cette checklist sert de contrôle qualité transversal …)

---

## 1. Les formats d’installation Windows
EXE, MSI, MSIX, portable : choix selon le public cible.

## 2. Prérequis généraux
Application livrable, métadonnées définies, icône, licence, stratégie d’installation.

## 3. Cas n°1 — Application compilée
Inno Setup / NSIS.

## 4. Cas n°2 — Python
PyInstaller + installateur.

## 5. Cas n°3 — Electron / Tauri
electron-builder ou tauri build.

## 6. Cas n°4 — .NET
MSIX, ClickOnce, WiX.

## 7. EXE vs MSI
Grand public vs entreprise.

## 8. Signature Windows (principe)
Certificat, SmartScreen, horodatage.

## 9. Signer sous Windows (signtool)
signtool sign /f cert.pfx /fd SHA256 /tr http://timestamp.digicert.com app.exe

## 10. Signer depuis Linux
Trois approches :
- Wine + SignTool
- osslsigncode
- VM ou CI Windows

## 11. Tests finaux
Installation, désinstallation, mise à jour.

## 12. Conclusion
Une release Windows est un **processus**, pas une commande.

