# Rapport d'audit preproduction beta

Date: 2026-03-11
Projet: Pumpkin Hub
Perimetre: API Rust, frontend Next.js, documentation, UX, accessibilite, securite, tests, preparation de mise en production beta.

## Resume executif

Verdict: no-go pour une beta publique immediatement exposee sur Internet en l'etat.

Verdict nuance: go conditionnel pour une beta fermee ou privee apres correction des points P0 ci-dessous.

Le projet est techniquement avance et deja tres solide sur plusieurs axes:

- backend bien structure, testable et globalement robuste
- fonctionnalites coeur deja riches: auth multi-provider, registre plugins, versions, dependances, reviews, media, dashboard, admin, notifications, API keys
- build frontend OK
- tests backend et frontend existants et executables
- experience visuelle differenciante et coherente avec l'identite Pumpkin Hub

En revanche, plusieurs ecarts bloquent une mise en production beta publique serieuse:

- hardening production incomplet cote cookies et en-tetes HTTP
- qualite frontend non verte: lint KO
- liens critiques morts dans la navigation publique
- environnement de production non decrit dans le depot
- quelques ecarts UX/A11y et du contenu marketing encore statique ou trompeur

## Methodologie

Audit realise par:

- lecture ciblee des points d'entree backend et frontend
- revue des modules critiques: auth, middleware, config, API client, pages majeures, composants UI
- verification de la documentation et de l'infrastructure presentes dans le depot
- execution des validations automatiques
- verification live sur stack locale via `docker compose up -d`
- controle Lighthouse sur la page d'accueil en environnement local

## Resultats verifies

### Commandes executees

- `cargo test` dans `api/`: OK
  - 99 tests unitaires passes
  - 21 tests d'integration passes
  - total backend verifie: 120 tests
- `npm run test` dans `frontend/`: OK
  - 79 tests passes
- `npm run build` dans `frontend/`: OK
- `npm run lint` dans `frontend/`: ECHEC
  - 2 erreurs
  - 7 warnings

### Audit live homepage

Application verifiee en local sur `http://localhost:3000`.

Lighthouse snapshot desktop:

- Accessibility: 94
- Best Practices: 100
- SEO: 83

Echecs Lighthouse observes:

- contraste insuffisant sur certains elements `kbd`
- absence de landmark principal `main`
- `robots.txt` absent

## Forces du projet

### 1. Backend mature pour une beta

Le backend inspire confiance pour une premiere beta:

- `api/src/lib.rs` construit une application propre avec timeout, compression, request id, tracing et CORS
- `api/src/error.rs` expose une gestion d'erreurs centralisee propre et non bavarde cote client
- les flows critiques auth/plugins/versions sont testes en integration dans `api/tests/api_integration.rs`
- le middleware d'API keys et les quotas apportent deja un niveau d'industrialisation superieur a beaucoup de projets beta

### 2. Couverture fonctionnelle deja large

Le produit couvre deja bien les besoins coeur du registre:

- authentification email/password + GitHub + Google + Discord
- CRUD plugins et versions
- binaires multi-plateformes
- dependances entre plugins
- reviews et moderation
- dashboard auteur
- administration
- notifications
- GitHub integration

### 3. Identite produit claire

Le frontend a une vraie personnalite:

- direction artistique coherente
- bon usage des fonts et du systeme visuel
- homepage forte, lisible, memorisable
- structure generale deja exploitable pour une beta utilisateur

## Findings prioritises

## P0 - A corriger avant beta publique

### P0.1 - Cookies de session et CSRF non marques `Secure`

Constat:

- les cookies JWT et CSRF sont `HttpOnly` et `SameSite=Lax`, mais pas `Secure`
- constate dans `api/src/routes/auth.rs` autour de `set_csrf_and_redirect`, `issue_jwt_cookie` et `issue_jwt_redirect`

Impact:

- sur un environnement de production HTTPS, ne pas marquer les cookies `Secure` est un ecart de hardening important
- augmente le risque d'exposition du cookie sur un transport non protege si le domaine est accessible en HTTP

Recommandation:

- ajouter `.secure(true)` en production pour les cookies d'auth et CSRF
- idealement piloter ce comportement par configuration d'environnement selon dev/prod

### P0.2 - Endpoint de logout en GET, donc CSRFable par navigation externe

Constat:

- `GET /api/v1/auth/logout` efface le cookie dans `api/src/routes/auth.rs`
- le frontend appelle ce logout par redirection navigateur dans `frontend/components/layout/Navbar.tsx`

Impact:

- une page externe peut forcer la deconnexion de l'utilisateur par simple navigation ou chargement cible
- ce n'est pas une compromission de compte, mais c'est un comportement CSRF inutilement exposable

Recommandation:

- passer le logout en `POST`
- utiliser `fetch` avec credentials et un appel explicite depuis le frontend

### P0.3 - Aucun hardening HTTP visible cote frontend

Constat:

- `frontend/next.config.ts` ne configure aucun header de securite
- aucun middleware Next.js n'est present dans le depot
- les en-tetes observes en live sur `http://localhost:3000/` ne montrent ni CSP, ni HSTS, ni `X-Frame-Options`, ni `Referrer-Policy`
- l'en-tete `x-powered-by: Next.js` est expose

Impact:

- surface d'attaque plus large que necessaire
- aucune politique CSP pour reduire l'impact d'une future injection HTML/JS
- cadre insuffisant pour une beta publique si un reverse proxy ne complete pas ces headers

Recommandation:

- definir au minimum:
  - `Content-Security-Policy`
  - `Strict-Transport-Security`
  - `X-Frame-Options` ou `frame-ancestors` via CSP
  - `Referrer-Policy`
  - `Permissions-Policy`
- desactiver `x-powered-by`
- documenter explicitement si ces headers sont delegues a un reverse proxy/CDN

### P0.4 - Qualite frontend non verte: lint en echec

Constat:

- `npm run lint` echoue
- erreur 1: `frontend/app/_components/HeroSection.tsx`
- erreur 2: `frontend/lib/useViewPreference.ts`
- cause: `setState` appele directement dans un `useEffect`

Warnings complementaires:

- `frontend/components/plugins/GalleryTab.tsx`: alt text et `img`
- `frontend/components/plugins/Lightbox.tsx`: usage de `img`
- `frontend/components/plugins/MediaUpload.tsx`: usage de `img`
- `frontend/components/plugins/MediaUpload.tsx`: style inline releve par l'editeur

Impact:

- la qualite n'est pas au niveau d'une release candidate beta
- si la CI enforce lint, la branche release n'est pas propre
- cela signale des points de dette visibles tres tot pour les contributeurs externes

Recommandation:

- revenir a un etat `lint = vert`
- corriger les hooks React concernes avant la beta
- traiter les warnings A11y sur les medias avant ouverture large

### P0.5 - Liens morts dans la navigation publique

Constat:

- `frontend/components/layout/Navbar.tsx`: liens `Docs` et `Status` pointent vers `#`
- `frontend/components/layout/Footer.tsx`: `GitHub`, `Discord`, `API Docs`, `Status` pointent vers `#`
- `frontend/app/_components/CtaSection.tsx`: bouton `Publish a Plugin` pointe vers `#`
- verifie aussi sur la page live

Impact:

- detruit immediatement la credibilite d'une beta publique
- cree une impression d'incomplet ou de faux CTA
- penalise les premiers retours utilisateurs

Recommandation:

- soit brancher ces liens vers de vraies destinations
- soit les supprimer temporairement de l'interface publique

### P0.6 - Le depot ne fournit pas encore un dispositif de production

Constat:

- `docker-compose.yml` annonce explicitement: `DEVELOPPEMENT LOCAL UNIQUEMENT — Ne pas utiliser en production.`
- aucune stack de prod, aucun reverse proxy, aucun manifest de deploiement, aucune doc de rollout beta public n'est fournie
- seulement deux workflows GitHub sont visibles: `ci.yml` et `docs.yml`

Impact:

- le projet est proche de la mise en production cote application, mais pas cote exploitation
- il manque la partie la plus risquee pour une beta publique: TLS, routing, headers, secrets, backups, monitoring, restore, CD

Recommandation:

- produire avant ouverture publique:
  - architecture de deploiement cible
  - gestion des secrets
  - politique de backup/restauration
  - healthchecks externes
  - observabilite logs/erreurs/metriques
  - procedure rollback

## P1 - A corriger avant ouverture large ou juste apres beta fermee

### P1.1 - Accessibilite correcte mais pas encore beta-ready

Constat:

- Lighthouse A11y a 94, ce qui est bon mais pas encore propre
- `main` absent sur la homepage, confirme par Lighthouse `landmark-one-main`
- contraste insuffisant sur certains `kbd`, confirme par Lighthouse `color-contrast`

Impact:

- experience clavier et lecteurs d'ecran incomplete
- dette A11y visible des les premiers tests utilisateurs

Recommandation:

- envelopper le contenu principal dans un `<main>`
- corriger les contrastes des elements decoratifs/utilitaires
- verifier les states focus visibles sur toute l'UI

### P1.2 - Une partie du contenu de confiance est encore statique ou placeholder

Constat:

- `frontend/app/_components/Ticker.tsx` affiche des messages statiques, dont `98.7% uptime`
- `frontend/app/_components/HeroSection.tsx` affiche `Authors` et `Downloads` a `—`
- `frontend/app/_components/HeroSection.tsx` affiche `0.38s Avg Build` en dur

Impact:

- cela peut etre percu comme du faux chiffre produit
- en beta, les utilisateurs pardonnent une feature manquante, pas une promesse douteuse

Recommandation:

- soit brancher ces indicateurs a de vraies donnees
- soit les remplacer par un wording explicite `Coming soon` ou les retirer

### P1.3 - Protection des pages privees essentiellement cote client

Constat:

- `frontend/app/dashboard/page.tsx` et `frontend/app/admin/page.tsx` redirigent les non-authentifies/non-admin via logique client
- le build montre que ces routes sont generees et servies cote frontend

Impact:

- les APIs protegent encore la vraie donnee, donc ce n'est pas une faille critique
- en revanche, l'UX peut presenter un flash d'ecran ou exposer la structure de l'interface admin

Recommandation:

- deplacer la protection au plus tot possible:
  - middleware Next.js
  - guards serveur
  - ou layout serveur quand applicable

### P1.4 - Couverture de tests frontend trop etroite pour la richesse fonctionnelle actuelle

Constat:

- tests frontend trouves uniquement sur:
  - `frontend/components/ui/Button.test.tsx`
  - `frontend/components/ui/Badge.test.tsx`
  - `frontend/components/ui/PluginCard.test.tsx`
  - `frontend/lib/validation.test.ts`
- aucun test automatise visible pour auth UI, explorer, plugin detail, dashboard, admin, reviews, media, notifications, GitHub integration

Impact:

- forte probabilite de regressions sur les parcours beta reellement utilises
- le frontend est bien moins protege que le backend

Recommandation:

- ajouter au minimum avant ouverture large:
  - auth flow happy path
  - explorer/search/filter
  - plugin page tabs et actions majeures
  - dashboard author
  - admin gate et moderation

### P1.5 - SEO et pages systemes incompletes

Constat:

- Lighthouse SEO echoue sur `robots.txt`
- aucun fichier `robots`, `sitemap`, `status`, `privacy`, `terms` trouve dans le workspace
- `frontend/app/auth/page.tsx` affiche pourtant: `By signing in, you agree to our Terms of Service and Privacy Policy.` sans fournir les pages associees

Impact:

- SEO limite
- legal/compliance brouillon pour une beta publique ouverte a des utilisateurs externes

Recommandation:

- ajouter au minimum:
  - `robots.txt`
  - `sitemap.xml`
  - page status ou lien externe reel
  - pages privacy/terms ou suppression temporaire de la mention

### P1.6 - Documentation secondaire encore inachevee ou desynchronisee

Constat:

- `frontend/README.md` est encore le README generique de `create-next-app`
- la doc de roadmap mentionne des `secure cookies`, alors que le code ne positionne pas `Secure`

Impact:

- confusion pour les contributeurs et pour la mise en prod
- dette documentaire qui augmente le risque de mauvaise configuration

Recommandation:

- remettre le README frontend en phase avec le projet reel
- aligner la documentation sur l'etat exact de la securite et du deploiement

## Audit par domaine

## Fonctionnalites

Etat global: bon pour une beta fermee.

Points positifs:

- coeur metier deja riche
- backend et DB semblent bien alignes
- les parcours techniques essentiels existent
- tests backend confirment plusieurs parcours critiques

Risques residuels:

- certaines couches produit annexes restent partiellement demonstratives ou placeholders
- la fiabilite frontend sur les parcours complexes n'est pas encore suffisamment verrouillee par les tests

## UI/UX

Etat global: tres bon potentiel, finition inegale.

Points positifs:

- personnalite visuelle forte
- bonne hierarchie generale
- hero memorable
- experience plugin/explorer deja convaincante en structure

Points a corriger:

- liens morts dans les zones les plus visibles
- elements de confiance marketing encore non relies a des donnees
- accessibilite encore partiellement incomplete

## Securite

Etat global: bonnes bases applicatives, hardening web incomplet.

Points positifs:

- Argon2id pour les mots de passe
- JWT HttpOnly
- hash SHA-256 des tokens et API keys
- rate limiting
- audit logs
- permissions sur API keys

Points a corriger en priorite:

- cookies non `Secure`
- logout en GET
- en-tetes de securite absents du codebase visible
- politique de production non documentee

## Tests et qualite

Etat global: backend fiable, frontend sous-teste.

Points positifs:

- backend: excellent signal pour une beta
- frontend: build et tests unitaires de base passent

Points faibles:

- lint KO
- couverture frontend insuffisante pour la complexite actuelle

## Documentation et exploitation

Etat global: la doc produit existe, la doc d'exploitation manque.

Points positifs:

- documentation statique du projet presente
- roadmap et architecture deja materialisees

Points faibles:

- pas de plan de production dans le depot
- README frontend non maintenu
- pages publiques attendues absentes

## Recommandation de mise en beta

### Decision recommandee

- beta publique ouverte: NON tant que les P0 ne sont pas traites
- beta fermee (petit groupe controle): OUI, apres correction des P0.1 a P0.5 minimum

### Lot minimal avant premiere beta fermee

1. remettre le frontend au vert sur le lint
2. corriger les liens morts ou les retirer
3. marquer les cookies `Secure` en production
4. basculer le logout en `POST`
5. definir les headers de securite attendus
6. enlever ou brancher les chiffres/claims statiques trompeurs
7. ajouter `main`, corriger le contraste `kbd`

### Lot minimal avant beta publique large

1. documenter et valider le deploiement production
2. ajouter monitoring, alerting et backup/restore
3. ajouter privacy/terms/status/robots/sitemap
4. etendre les tests frontend sur les parcours critiques
5. proteger plus proprement les routes privees cote frontend

## Plan d'action concret sur 7 jours

### Jour 1-2

- corriger lint errors/warnings critiques
- corriger les cookies et le logout
- brancher ou supprimer les liens morts

### Jour 3

- ajouter headers de securite
- ajouter `robots.txt`
- ajouter `main` et correctifs contraste

### Jour 4-5

- ajouter tests frontend sur auth + explorer + plugin page
- remplacer les chiffres statiques par de vraies donnees ou des labels explicites

### Jour 6

- ecrire la doc de deploiement beta
- decrire secrets, backups, logs, rollback

### Jour 7

- smoke test complet
- relancer lint/test/build/backend tests
- lancer une beta fermee avec 10 a 20 utilisateurs cibles

## Instrumentation conseillee pour la beta

Avant les premiers retours utilisateurs, ajouter:

- error tracking frontend/backend
- analytics produit sur funnels critiques
  - inscription
  - login
  - publication plugin
  - upload binaire
  - consultation plugin
  - telechargement
- monitoring uptime externe
- suivi DB, stockage objet et moteur de recherche
- canal de feedback explicite dans l'app ou via Discord

## Checklist de sortie beta

- `cargo test` vert
- `npm run lint` vert
- `npm run test` vert
- `npm run build` vert
- cookies securises en prod
- headers de securite actifs
- aucun lien public cassant
- pages legales/statut/SEO minimales presentes
- backups testes
- rollback teste
- monitoring et alerting actives

## Conclusion

Pumpkin Hub n'est pas loin d'une vraie premiere beta exploitable. Le coeur applicatif est deja serieux, et le backend est plus mature que la moyenne pour ce stade. Le frein principal n'est plus la fonctionnalite brute, mais la finition de mise en production: hardening web, hygiene frontend, navigation publique, documentation d'exploitation et quelques details de confiance produit.

Si les P0 sont traites rapidement, le projet peut raisonnablement entrer en beta fermee dans un delai court. Pour une beta publique plus large, il faut encore un tour de finition operationnelle et UX.