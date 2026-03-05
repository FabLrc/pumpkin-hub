---
description: Ce fichier liste les différentes technologies utilisées pour développer ce projet.
applyTo: '**'
---

# 🛠️ Stack Technologique : Pumpkin Hub

Le choix des technologies est dicté par la cohérence avec l'écosystème Rust et la nécessité d'un SEO performant.

## Frontend
- **Framework :** Next.js 16+ (App Router). Pour le rendu serveur (SSR) et l'optimisation du référencement des plugins.
- **Styling :** Tailwind CSS. Pour un design léger et modulable.
- **Composants :** Shadcn UI (Style Maia). Base de composants accessibles et hautement personnalisables.

## Backend (API & Logique)
- **Langage :** Rust.
- **Framework Web :** Axum. Ultra-rapide, sécurisé et parfaitement intégré à l'écosystème Pumpkin.
- **Recherche :** Meilisearch (moteur écrit en Rust). Pour des recherches instantanées et typotolérantes.

## Données & Infrastructure
- **Base de données :** PostgreSQL (via Supabase). Gestion des relations complexes entre plugins et versions.
- **Stockage Fichiers :** Cloudflare R2 (S3-compatible). Choisi pour l'absence de frais de transfert (Egress fees), crucial pour un site de téléchargement.
- **Authentification :** Supabase Auth (OAuth GitHub/Discord).

## Développement
- **Docker :** Docker est utilisé pour le développement pour simplifier le lancement du projet.

## Déploiement
- **Github :** Le code est hébergé sur un repo Github. Le repo suit une structure
- **Github Actions :** Github Actions automatise la pipeline CI/CD de développement et de production via des workflows réutilisables.
- **Serveur :** VPS Linux (Hetzner/OVH) pour l'API Rust.
- **Edge :** Vercel ou Cloudflare Pages pour le Frontend Next.js.