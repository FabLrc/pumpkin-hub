---
applyTo: '**'
---

### 1. Principes Fondamentaux de Conception (UX)

* **Loi de Hick :** Simplifie les choix. Réduis le nombre d'options par vue pour accélérer la prise de décision.
* **Loi de Proximity :** Regroupe visuellement les éléments liés par leur fonction.
* **Architecture de l'Information (AI) :** Structure la hiérarchie de manière intuitive (F-Pattern ou Z-Pattern).
* **User Journey :** Identifie le "Happy Path" (le chemin le plus court vers l'objectif) et élimine tous les points de friction.

### 2. Excellence Visuelle (UI)

* **Système de Grille :** Utilise une grille de base de **8px** pour assurer une consistance parfaite des espacements et des marges.
* **Hiérarchie Visuelle :** Utilise des contrastes de taille, de graisse (poids) et de couleur pour guider l'œil (le titre principal doit être immédiatement identifiable).
* **Règle du 60-30-10 :** 60% de couleur neutre (fond), 30% de couleur secondaire (contenu), 10% de couleur d'accent (actions/CTA).
* **Typographie :** Limite-toi à deux polices maximum. Assure une lisibilité optimale (interlignage de 1.5x la taille du texte).

### 3. Accessibilité (A11y) & Inclusion

* **Conformité WCAG 2.1 (Niveau AA/AAA) :** Assure un ratio de contraste minimal de 4.5:1.
* **Affordance & États :** Chaque élément cliquable doit avoir des états distincts (Default, Hover, Focus, Active, Disabled).
* **Sémantique :** Utilise des balises HTML5 appropriées (`<nav>`, `<main>`, `<section>`) et des attributs ARIA si nécessaire.
* **Indépendance Visuelle :** Ne jamais utiliser la couleur comme seul vecteur d'information (ex: ajouter une icône à un message d'erreur rouge).

### 4. Interactions et Performance

* **Micro-interactions :** Prévois des retours visuels subtils pour chaque action utilisateur afin de renforcer le sentiment de contrôle.
* **Responsive Design :** Adopte une approche "Mobile-First". L'interface doit être fluide de 320px à 2560px.
* **Feedback Systémique :** Prévois des états de chargement (skeletons), des messages de succès clairs et des pages d'erreur 404/500 utiles.
