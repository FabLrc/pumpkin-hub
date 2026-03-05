---
applyTo: '**'
---

### 1. Principes de Design Logiciel (SOLID & Co)

Applique rigoureusement les principes suivants :

* **S.O.L.I.D. :** * **Single Responsibility :** Une classe/fonction = une seule raison de changer.
* **Open/Closed :** Ouvert à l'extension, fermé à la modification.
* **Liskov Substitution :** Les sous-classes doivent pouvoir remplacer leurs classes mères.
* **Interface Segregation :** Préfère plusieurs petites interfaces spécifiques à une grosse généraliste.
* **Dependency Inversion :** Dépends des abstractions, pas des implémentations concrètes.


* **DRY (Don't Repeat Yourself) :** Abstrais la logique répétitive sans tomber dans la sur-ingénierie.
* **KISS (Keep It Simple, Stupid) :** La solution la plus simple est souvent la meilleure.
* **YAGNI (You Ain't Gonna Need It) :** N'implémente pas de fonctionnalités "au cas où".

---

### 2. Clean Code & Lisibilité

* **Nommage Sémantique :** * Variables : Noms de domaines explicites (ex: `isUserAuthenticated` au lieu de `isAuth`).
* Fonctions : Doivent commencer par un verbe d'action (`calculateTotalTax`).
* Pas de "Magic Numbers" : Remplace-les par des constantes nommées.


* **Fonctions :** Elles doivent être courtes, avoir peu d'arguments (3 max) et un seul niveau d'abstraction.
* **Commentaires :** Le code doit s'expliquer de lui-même. Utilise les commentaires uniquement pour expliquer le **"Pourquoi"** (décisions complexes), jamais le "Quoi".

---

### 3. Architecture et Structure des Fichiers

* **Separation of Concerns (SoC) :** Sépare strictement la logique métier (Domain), l'accès aux données (Infrastructure) et l'affichage (UI/API).
* **Structure de dossiers claire :** Adopte une structure modulaire (ex: par fonctionnalité/feature plutôt que par type de fichier).
* **Modularité :** Favorise les composants découplés pour faciliter les tests unitaires.

---

### 4. Robustesse et Sécurité

* **Gestion des erreurs :** Pas de `try-catch` vide. Implémente une gestion d'erreurs granulaire et explicite.
* **Validation :** "Trust no one". Valide systématiquement les entrées (Inputs) et les sorties (Outputs).
* **Tests :** Le code doit être conçu pour être testable (Testability). Priorise les tests unitaires sur la logique métier critique.

### 6. Refactorisation Continue & Maintenance

* **La Règle du Boy Scout :** "Laisse toujours le code un peu plus propre que tu ne l'as trouvé." Toute modification doit être l'occasion d'améliorer la lisibilité globale.
* **Détection des "Code Smells" :** Identifie et élimine activement les mauvaises odeurs :
* *Long Methods/Classes :* Découpe si une fonction dépasse 20 lignes ou une classe 200 lignes.
* *Duplicate Code :* Factorise la logique commune sans créer d'abstractions prématurées.
* *Primitive Obsession :* Remplace les types primitifs complexes par des petits objets dédiés (Value Objects).

* **Refactorisation sans Changement de Comportement :** La refactorisation ne doit jamais modifier le comportement externe du programme. Elle se concentre uniquement sur la structure interne.
* **Cycle Red-Green-Refactor :** Intègre la refactorisation dans le flux TDD (Test-Driven Development). On écrit un test (Rouge), on fait passer le test (Vert), puis on nettoie le code (Refactor).
* **Composabilité :** Favorise la composition plutôt que l'héritage pour rendre le code plus flexible aux changements futurs.
* **Découplage :** Si deux modules sont trop liés, utilise des événements ou des interfaces pour briser la dépendance directe.

### 7. Documentation

* **Documentation Technique :** Chaque module doit être accompagné d'une documentation claire (/docs) expliquant son rôle, ses interfaces et ses dépendances.
* **README :** Le README doit être à jour, clair et inclure des exemples d'utilisation pour les développeurs externes.
* **Changelog :** Maintiens un changelog rigoureux pour suivre l'évolution du projet et faciliter la communication avec la communauté (CHANGELOG.md).