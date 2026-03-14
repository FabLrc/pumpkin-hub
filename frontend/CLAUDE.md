# Frontend Next.js — Guide Claude Code

## Stack

- **Framework** : Next.js 16.1 (App Router) + React 19.2
- **Langage** : TypeScript 5 (strict mode)
- **Styling** : Tailwind CSS 4 + tokens CSS custom (globals.css)
- **Data fetching** : SWR 2.x (hooks client-side)
- **Icônes** : Lucide React 0.577
- **Toasts** : Sonner 2.x
- **Tests** : Vitest 4 + React Testing Library + MSW 2

## Structure des fichiers

```
frontend/
├── package.json
├── next.config.ts        # Turbopack, security headers, webpack polling (Docker)
├── tsconfig.json         # Strict, alias @/* → racine
├── tailwind.config.ts    # TailwindCSS v4
├── vitest.config.ts      # jsdom, seuils de couverture
├── vitest.setup.ts       # Import @testing-library/jest-dom
├── app/
│   ├── layout.tsx        # Fonts (Raleway + JetBrains Mono), metadata, Sonner
│   ├── globals.css       # Design tokens, animations, composants custom
│   ├── page.tsx          # Homepage (hero, trending, features, CTA, ticker)
│   ├── error.tsx         # Error boundary global
│   ├── not-found.tsx     # Page 404
│   ├── loading.tsx       # Suspense fallback
│   ├── _components/      # Composants privés de la homepage
│   │   ├── HeroSection.tsx
│   │   ├── TrendingSection.tsx
│   │   ├── FeaturesSection.tsx
│   │   ├── CtaSection.tsx
│   │   └── Ticker.tsx
│   ├── auth/             # Login/Register + OAuth + forgot/reset password + email verify
│   ├── explorer/         # Recherche avec filtres (catégorie, plateforme, version)
│   ├── plugins/
│   │   ├── new/          # Création plugin (formulaire ou import GitHub)
│   │   └── [slug]/       # Détail plugin (onglets: overview, versions, deps, gallery, changelog, reviews)
│   │       └── edit/     # Édition plugin
│   ├── dashboard/        # Analytics auteur, API keys, notifications
│   ├── profile/          # Édition profil utilisateur
│   ├── users/[username]/ # Profil public auteur
│   ├── admin/            # Panel admin (modération)
│   └── api/upload/       # Proxy upload (contourne les limites Docker/Chrome)
├── components/
│   ├── layout/           # Navbar.tsx, Footer.tsx
│   ├── ui/               # Button, Badge, PluginCard, DownloadChart
│   ├── plugins/          # PluginForm, VersionForm, BinaryUpload, MediaUpload, etc.
│   ├── reviews/          # ReviewForm, ReviewCard, StarRating, RatingOverview, ReportModal
│   └── notifications/    # NotificationBell
├── lib/
│   ├── api.ts            # Client REST (apiFetch, swrFetcher, toutes les fonctions API)
│   ├── types.ts          # Interfaces TypeScript (miroir des DTOs Rust)
│   ├── hooks.ts          # Hooks SWR (usePlugin, useCurrentUser, useSearch, etc.)
│   ├── validation.ts     # Validation formulaires côté client
│   ├── category-icons.ts # Map catégories → icônes Lucide
│   └── useViewPreference.ts # Préférence grille/liste (localStorage)
├── test/
│   └── msw/              # Mock Service Worker (handlers.ts, server.ts)
└── public/               # Assets statiques
```

## Conventions de code

### Composants
- **Client Components** : `"use client"` pour tout ce qui utilise des hooks, state, ou event handlers
- **Server Components** : pour les pages avec metadata statique et data fetching côté serveur
- **Données dynamiques** : toujours via SWR côté client (pas de fetch serveur pour les données mutables)

### Nommage
- Composants/Types : PascalCase (`PluginCard.tsx`, `SearchHit`)
- Fonctions/hooks : camelCase (`usePlugin()`, `fetchSearch()`)
- Constantes : UPPER_CASE (`PLUGIN_RULES`, `CATEGORY_ICON_MAP`)
- Fichiers composants : PascalCase ; fichiers utilitaires : camelCase

### API Client (`lib/api.ts`)
- `apiFetch<T>(path, options)` : ajoute `credentials: include`, `Content-Type: application/json`
- URL de base : `NEXT_PUBLIC_API_URL` (défaut `http://localhost:8080`) + `/api/v1`
- Uploads avec progression : `XMLHttpRequest` + `FormData` (pas fetch)
- Path builders pour construire les URLs avec `encodeURIComponent()`

### State Management
- **SWR** pour l'état serveur (lectures avec cache, revalidation, dedup)
- **useState** pour l'état local UI
- **Pas de Redux/Context** — SWR + props suffisent
- Mutation : `mutate()` de SWR pour invalider le cache

### Formulaires
1. `useState()` pour les données et les erreurs
2. Validation locale avant l'appel API (`lib/validation.ts`)
3. Erreurs serveur extraites du JSON avec regex `/"error":\s*"([^"]+)"/`
4. État `isSubmitting` pour désactiver le bouton
5. Feedback via `toast.success()` / `toast.error()` (Sonner)

### Styling
- Tailwind utility classes uniquement (pas de CSS modules)
- Tokens CSS custom dans `globals.css` (couleurs, fonts, effets)
- Mobile-first : breakpoints `md:` et `lg:`
- **Aucun border-radius** — style Brutalist strict
- Polices via variables CSS : `var(--font-raleway)`, `var(--font-mono)`

### Types (`lib/types.ts`)
- Toutes les interfaces miroir des DTOs de l'API Rust
- Enums : `OAuthProvider`, `Platform` (windows/macos/linux), `MediaType`, `ReportReason`
- Types de réponse paginée, search hits, etc.

## Tests

### Configuration
- Vitest + jsdom + @testing-library/react
- MSW pour mocker les appels API
- Seuils de couverture : lines 53%, functions 54%, branches 43%, statements 52%

### Patterns de test
- `vi.mock()` pour les hooks/modules
- `render()` + `screen` de Testing Library
- `userEvent.setup()` pour les interactions
- Fichiers de test à côté des fichiers source : `Component.test.tsx`
- Tests smoke des pages dans `app/pages.smoke.test.tsx`

### Commandes
```bash
npm run test              # Tests en mode CI
npm run test:watch        # Mode interactif
npm run test:coverage     # Avec rapport de couverture
npm run lint              # ESLint strict (0 warnings autorisés)
```

## Points d'attention

- Le proxy `app/api/upload/` existe pour contourner un bug Chrome + Docker Desktop sur les uploads volumineux cross-origin
- Les images GitHub (avatars) sont optimisées via `next.config.ts` (domaines autorisés)
- Le webpack polling est activé en dev pour la compatibilité Docker/WSL2
- `useCurrentUser()` : dedup 10s, pas de retry on error — évite les boucles auth
- `useNotifications()` : polling actif toutes les 30s
