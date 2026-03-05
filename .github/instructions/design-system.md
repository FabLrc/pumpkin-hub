---
description: Ce fichier décrit le design système du projet pour garder un style cohérant sur tout le site et une UX agréable.
applyTo: ./frontend/*
---

# 🎨 Design System & UX Guidelines

Le design de Pumpkin Hub doit inspirer la confiance technique et la robustesse. Dès que possible, il faudra utiliser des composants ShadCN UI plutôt que de développer des composants from scratch et avoir un design cohérant.

## Identité Visuelle
- **Style :** Brutalisme Maia (Angles droits uniquement).
- **Rayon de courbure (Radius) :** `0px` (Strictement aucun arrondi sur les boutons, cartes ou inputs).
- **Couleurs :** 
    - Fond : `Neutral-950` (#0a0a0a).
    - Texte : `Neutral-50` / `Neutral-400`.
    - Accent : `Orange-500` (#f97316). Utilisé pour les CTA et les états actifs.

## Typographie
- **Interface :** `Raleway`. Elégante et géométrique.
- **Données techniques :** `Monospace` (JetBrains Mono ou Roboto Mono). À utiliser pour : versions, hashes SHA, blocs de code, commandes terminal.

## UX (Expérience Utilisateur)
- **Navigation au clavier :** Support du `Cmd+K` pour la recherche globale.
- **Feedback visuel :** États de survol (hover) marqués par des bordures orange plutôt que des ombres.
- **Zéro Friction :** Les commandes d'installation doivent être copiables en un clic.
- **Clarté :** Utiliser des badges de couleur pour les statuts (Stable = Vert, Beta = Orange, Alpha = Rouge).