# Plan : PumpkinHub Studio — Éditeur No-Code Node-Based

## 1. Vision & Résumé Exécutif

PumpkinHub Studio est un éditeur visuel node-based (inspiré d'Unreal Engine Blueprint) permettant à tout utilisateur de créer des plugins Pumpkin MC sans écrire de Rust. L'éditeur s'adapte automatiquement à l'évolution de l'API Pumpkin via l'analyse des fichiers WIT du dépôt officiel.

**Flux utilisateur MVP :**
1. L'utilisateur arrive sur `/studio` → liste de ses projets ou création
2. Dans l'éditeur (`/studio/edit/[id]`) : canvas node-based avec palette de nœuds, panneau de propriétés
3. Auto-save toutes les 3 secondes (serveur si connecté, localStorage si invité)
4. Tutoriel interactif (tooltips guidés) au premier lancement
5. Bouton **Compiler** : envoi au backend, génération Rust → WASM → stockage dans un espace dédié Studio
6. Bouton **Publier** : redirection vers le formulaire de publication existant (`/plugins/new`) pré-rempli avec le binaire compilé et les métadonnées du projet

**Principes directeurs :**
- **MVP fonctionnel** : 6 événements, 6 actions, logique basique. Pas de bloc Rust custom en MVP.
- **Auto-adaptation WIT** : le backend fetch et parse les WIT de Pumpkin MC pour générer le registre de nœuds.
- **Compilation serveur** : queue PostgreSQL + worker Tokio en arrière-plan.
- **Design cohérent** : style UE5 Blueprint (fond sombre, nœuds colorés par catégorie) mais cohérent avec le système de design Maia (pas de radius, typographie Raleway/JetBrains Mono).

---

## 2. Choix Techniques & Justifications

### 2.1 Éditeur Node-Based : @xyflow/react (React Flow v12)

**Pourquoi pas Rete.js ?**
- Rete.js est en maintenance mode, mal documenté, et la v2 est instable.
- React Flow est **commercial-backed**, très actif, excellent support TypeScript, compatible React 19.
- Utilisé en production par n8n, Stripe, Twilio. Performance éprouvée.
- Fournit MiniMap, Controls, Background grid, pan/zoom, sélection multi, undo/redo natifs.

**Pourquoi pas une solution maison ?**
- Trop coûteux en temps de dev pour un MVP. React Flow résout 90% des problèmes de canvas.

### 2.2 Parser WIT : `wit-parser` (crate Rust)

- Pumpkin expose son API via WIT (WebAssembly Interface Types) dans `pumpkin-plugin-wit/v0.1/`.
- Le backend fetch régulièrement les fichiers WIT depuis GitHub, les parse avec `wit-parser`, et génère un **Node Registry** JSON.
- Le frontend consomme ce registry pour afficher dynamiquement les nœuds disponibles.
- **Avantage** : quand Pumpkin ajoute un nouvel événement ou une nouvelle action, un simple redémarrage du service de parsing met à jour l'éditeur sans modification manuelle du code.

### 2.3 Queue de compilation : PostgreSQL (pattern "skip locked")

**Pourquoi pas Redis/RabbitMQ ?**
- L'infrastructure actuelle utilise déjà PostgreSQL. Pas besoin d'ajouter un nouveau service.
- Le pattern `SELECT ... FOR UPDATE SKIP LOCKED` est un queue robuste et battle-tested pour un volume MVP.
- **Migration future** : si la charge devient importante, on peut migrer vers une vraie queue (Redis/RabbitMQ) sans changer l'interface.

### 2.4 Environnement de compilation

- Le conteneur `api-dev` (et l'image de prod) doit embarquer :
  - Toolchain Rust stable + target `wasm32-wasip1`
  - `cargo-component` ou `wit-bindgen` pour la génération de bindings
  - Le crate `pumpkin-plugin-api` (via dépendance git vers le repo Pumpkin)
- Le worker génère un `Cargo.toml` + `src/lib.rs` temporaires dans un dossier de build, compile, et upload le `.wasm` résultant vers **un espace S3 séparé** des plugins publiés (`studio-builds/`).
- **Rotation des artefacts** : le worker conserve les 3 dernières compilations réussies d'un projet. Les anciens binaires sont supprimés de S3 et leurs entrées `build_jobs` marquées pour nettoyage.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                              │
│  ┌──────────────┐  ┌─────────────────────────────────────────────────────┐  │
│  │ /studio      │  │ /studio/edit/[id]                                   │  │
│  │ Liste projets│  │  ┌─────────────┐  ┌──────────┐  ┌────────────────┐  │  │
│  │ + Nouveau    │  │  │ Node Palette│  │  Canvas  │  │ Property Panel │  │  │
│  └──────────────┘  │  │ (sidebar)   │  │ (React   │  │ (sidebar)      │  │  │
│                    │  │             │  │  Flow)   │  │                │  │  │
│                    │  └─────────────┘  └──────────┘  └────────────────┘  │  │
│                    │              Auto-save (SWR / localStorage)           │  │
│                    └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼ API REST /api/v1/studio/*
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (Axum/Rust)                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐   │
│  │ WIT Fetcher  │  │ Node Registry│  │ Code Gen     │  │ Build Worker   │   │
│  │ (GitHub)     │──│ Service      │──│ (JSON→Rust)  │──│ (PG Queue)     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────────┘   │
│         │                   │                                       │         │
│         ▼                   ▼                                       ▼         │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  Routes : GET /nodes | /projects | /projects/:id | /builds/:id      │    │
│  │           POST /projects | /projects/:id/build | /projects/:id/pub  │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
                              ┌────────────────┐
                              │  PostgreSQL    │
                              │  plugin_projects│
                              │  build_jobs    │
                              └────────────────┘
```

---

## 4. Modèle de Données

### 4.1 Nouvelle Migration : `033_create_studio_tables.up.sql`

```sql
-- Projets no-code (brouillons)
CREATE TABLE plugin_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    -- Flow JSON : représentation sérialisée du graphe React Flow
    flow_data JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}',
    -- Version de Pumpkin ciblée (compatibilité serveur)
    pumpkin_version_min VARCHAR(50),
    pumpkin_version_max VARCHAR(50),
    -- Snapshot du WIT utilisé par ce projet (hash du contenu WIT)
    wit_snapshot_hash VARCHAR(64),
    -- Statut du projet
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'building', 'published')),
    -- Dernier build
    latest_build_id UUID,
    -- Compteur de builds pour la rotation (incrémenté à chaque build)
    build_count INTEGER NOT NULL DEFAULT 0,
    -- Lien vers le plugin publié (si applicable)
    published_plugin_id UUID REFERENCES plugins(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plugin_projects_user_id ON plugin_projects(user_id);
CREATE INDEX idx_plugin_projects_status ON plugin_projects(status);

-- Jobs de compilation WASM
CREATE TABLE build_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES plugin_projects(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'running', 'success', 'failed', 'cancelled')),
    -- Logs de compilation (stdout/stderr)
    logs TEXT,
    -- Numéro de version du build (pour rotation 3 max)
    build_number INTEGER NOT NULL DEFAULT 1,
    -- Clé S3 de l'artefact WASM (préfixe studio-builds/, jamais plugins/)
    artifact_storage_key VARCHAR(500),
    artifact_checksum_sha256 VARCHAR(64),
    -- Message d'erreur si échec
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_build_jobs_project_id ON build_jobs(project_id);
CREATE INDEX idx_build_jobs_status ON build_jobs(status);

-- Snapshots du WIT (historique)
CREATE TABLE node_registry_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Hash SHA-256 du contenu agrégé des fichiers WIT
    snapshot_hash VARCHAR(64) NOT NULL UNIQUE,
    -- Date de fetch
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- URL source (GitHub raw)
    source_url TEXT NOT NULL,
    -- Commit GitHub le plus proche (si détectable)
    source_commit VARCHAR(40)
);

-- Registre de nœuds (généré depuis les WIT, versionné par snapshot)
CREATE TABLE node_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Référence au snapshot
    snapshot_hash VARCHAR(64) NOT NULL REFERENCES node_registry_snapshots(snapshot_hash) ON DELETE CASCADE,
    -- Identifiant unique du nœud dans ce snapshot : "event.player-join", "action.send-message"
    node_id VARCHAR(100) NOT NULL,
    -- Catégorie : event, action, logic, data, math, flow
    category VARCHAR(20) NOT NULL,
    -- Définition JSON du nœud (inputs, outputs, parameters, couleur)
    definition JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Unicité par snapshot + node_id
    UNIQUE(snapshot_hash, node_id)
);

CREATE INDEX idx_node_registry_snapshot ON node_registry(snapshot_hash);
CREATE INDEX idx_node_registry_category ON node_registry(category);
```

### 4.2 Migration Down : `033_create_studio_tables.down.sql`

```sql
DROP TABLE IF EXISTS build_jobs;
DROP TABLE IF EXISTS plugin_projects;
DROP TABLE IF EXISTS node_registry;
DROP TABLE IF EXISTS node_registry_snapshots;
```

---

## 5. Backend — API & Services

### 5.1 Nouvelles Routes (`/api/v1/studio/*`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/studio/nodes` | Public | Liste des nœuds disponibles (from node_registry) |
| GET | `/studio/projects` | JWT | Liste des projets de l'utilisateur connecté |
| POST | `/studio/projects` | JWT | Créer un nouveau projet |
| GET | `/studio/projects/:id` | JWT / Owner | Détails + flow_data d'un projet |
| PUT | `/studio/projects/:id` | JWT / Owner | Sauvegarder le flow (auto-save) |
| DELETE | `/studio/projects/:id` | JWT / Owner | Supprimer un projet |
| POST | `/studio/projects/:id/build` | JWT / Owner | Déclencher une compilation |
| GET | `/studio/builds/:id` | JWT / Owner | Statut + logs d'un build |
| GET | `/studio/projects/:id/publish-data` | JWT / Owner | Données pour pré-remplir le formulaire de publication |
| POST | `/studio/projects/:id/transfer-binary` | JWT / Owner | Transfère le binaire build vers le bucket de publication |

### 5.2 DTOs (`api/src/routes/studio/dto.rs`)

```rust
// Request
pub struct CreateProjectRequest {
    pub name: String,
    pub description: Option<String>,
    pub pumpkin_version_min: Option<String>,
    pub pumpkin_version_max: Option<String>,
}

pub struct UpdateProjectRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub flow_data: Option<serde_json::Value>,
    pub pumpkin_version_min: Option<String>,
    pub pumpkin_version_max: Option<String>,
}

pub struct TriggerBuildRequest {
    // Optionnel : pour forcer une version spécifique
    pub pumpkin_version: Option<String>,
}

// Response
pub struct ProjectResponse {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub status: String,
    pub pumpkin_version_min: Option<String>,
    pub pumpkin_version_max: Option<String>,
    pub latest_build_id: Option<Uuid>,
    pub published_plugin_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

pub struct ProjectDetailResponse {
    pub project: ProjectResponse,
    pub flow_data: serde_json::Value,
}

pub struct BuildResponse {
    pub id: Uuid,
    pub project_id: Uuid,
    pub status: String,
    pub logs: Option<String>,
    pub artifact_checksum_sha256: Option<String>,
    pub error_message: Option<String>,
    pub created_at: DateTime<Utc>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
}

pub struct NodeRegistryResponse {
    pub nodes: Vec<NodeDefinition>,
    pub snapshot_hash: String,
    pub fetched_at: DateTime<Utc>,
}
```

### 5.3 Service WIT Fetcher (`api/src/services/wit_fetcher.rs`)

**Responsabilité** : Télécharger et parser les fichiers WIT depuis GitHub.

```rust
const PUMPKIN_WIT_BASE_URL: &str =
    "https://raw.githubusercontent.com/Pumpkin-MC/Pumpkin/master/pumpkin-plugin-wit/v0.1";

pub async fn fetch_and_parse_wit() -> Result<Vec<NodeDefinition>, AppError> {
    // 1. Fetch les fichiers WIT (event.wit, server.wit, world.wit, command.wit, etc.)
    // 2. Parser avec wit-parser
    // 3. Mapper vers des NodeDefinition
    // 4. Upsert dans la table node_registry
}
```

**Mapping WIT → Nœuds :**
- Chaque `record ...-event-data` dans `event.wit` → nœud **Event** (1 output : les données de l'événement)
- Chaque `func` dans `server.wit` ou `world.wit` → nœud **Action** (inputs : params, output : résultat)
- Types primitifs (`string`, `u32`, `bool`) → nœuds **Data** (constantes)
- Logique de contrôle (`if`, `for`, `and`, `or`) → nœuds **Logic** (hardcodés, non issus du WIT)

### 5.4 Service Code Generator (`api/src/services/code_generator.rs`)

**Responsabilité** : Transformer le `flow_data` JSON en code Rust valide.

**Architecture du code généré :**

```rust
// Template généré
use pumpkin_plugin_api::*;
use std::sync::Mutex;

static STATE: Mutex<PluginState> = Mutex::new(PluginState::new());

pub struct PluginState {
    // Variables définies par l'utilisateur dans le graphe
}

#[no_mangle]
pub extern "C" fn init_plugin() {
    // Appelé une fois au chargement
}

#[no_mangle]
pub extern "C" fn on_load(context: Context) -> Result<(), String> {
    // Initialisation
    Ok(())
}

#[no_mangle]
pub extern "C" fn on_unload(context: Context) -> Result<(), String> {
    // Cleanup
    Ok(())
}

#[no_mangle]
pub extern "C" fn handle_event(
    event_id: u32,
    server: Server,
    event: Event,
) -> Event {
    match event {
        // Généré dynamiquement selon les nœuds Event présents dans le graphe
        Event::PlayerJoinEvent(data) => {
            handle_player_join(data, server);
            Event::PlayerJoinEvent(data)
        }
        // ... autres événements
        _ => event,
    }
}

// Fonctions générées pour chaque chaîne d'actions
fn handle_player_join(mut data: PlayerJoinEventData, server: Server) {
    // Exécution des nœuds Action connectés au nœud PlayerJoin
    // Le générateur topologique parcourt le graphe dans l'ordre des edges
}
```

**Algorithme de génération :**
1. Extraire les nœuds et edges du `flow_data`
2. Pour chaque nœud **Event**, trouver les nœuds connectés en aval (BFS)
3. Générer une fonction `handle_{event_name}` qui exécute les actions dans l'ordre topologique
4. Pour chaque nœud **Action**, générer l'appel de fonction correspondant avec les paramètres mappés depuis les inputs
5. Pour les nœuds **Logic** (`if`), générer des blocs `if/else`

### 5.5 Build Worker (`api/src/services/build_worker.rs`)

**Responsabilité** : Compiler le code Rust généré en WASM et gérer la rotation des artefacts.

```rust
pub async fn run_build_worker(state: Arc<AppState>) {
    loop {
        // 1. Récupérer le prochain job queued (SELECT ... FOR UPDATE SKIP LOCKED)
        // 2. Marquer comme 'running', assigner build_number = project.build_count + 1
        // 3. Générer le code Rust
        // 4. Écrire dans un dossier temporaire /tmp/pumpkin-build/{build_id}/
        // 5. Exécuter : cargo build --target wasm32-wasip1 --release
        // 6. Si succès :
        //    a. Upload .wasm vers S3 avec clé : studio-builds/{project_id}/{build_number}/{slug}.wasm
        //    b. Marquer 'success'
        //    c. Appeler cleanup_old_builds(project_id) -> supprime les builds n-3 de S3 et DB
        // 7. Si échec : capturer stderr, marquer 'failed'
        // 8. Nettoyer le dossier temporaire
        tokio::time::sleep(Duration::from_secs(5)).await;
    }
}

async fn cleanup_old_builds(pool: &PgPool, project_id: Uuid) {
    // Supprimer les builds dont build_number < (max - 2)
    // Pour chaque build supprimé, delete l'objet S3 via artifact_storage_key
}
```

**Dépendances du conteneur de build :**
- `rustup target add wasm32-wasip1`
- `cargo install cargo-component` (ou `wit-bindgen-cli`)
- Clone du repo Pumpkin MC dans `/opt/pumpkin-src` pour référencer les crates locales

**Sécurité :**
- Build dans un dossier temporaire unique par job
- Timeout de compilation (5 minutes)
- Limitation ressources (CPU/mem) via `cgroups` en production

### 5.6 Publish Flow

Quand l'utilisateur clique **Publier** dans Studio :
1. Vérifier que le dernier build est `success`
2. Appeler `GET /studio/projects/:id/publish-data` qui retourne :
   - `project_name`, `description`, `slug`
   - `build_id`, `artifact_url` (presigned, 15 min TTL)
   - `checksum_sha256`, `file_size`
3. **Redirection frontend** : `window.location.href = /plugins/new?studio_project={id}&studio_build={build_id}`
4. La page `/plugins/new` détecte les query params et :
   - Pré-remplit le `PluginForm` (nom, description)
   - Affiche le binaire comme "déjà uploadé" (impossible de changer)
   - Cache le `BinaryUpload` ou le remplace par un récapitulatif
   - À la soumission, appelle `POST /studio/projects/:id/transfer-binary` pour copier le binaire du bucket `studio-builds/` vers le bucket `plugins/` (clé officielle `plugins/{slug}/{version}/{filename}`)
   - Puis création normale du plugin/version via les handlers existants
5. Mettre à jour `plugin_projects.published_plugin_id = plugins.id`

**Pourquoi passer par le formulaire existant ?**
- Réutilise la logique de validation existante (semver, catégories, licence)
- Permet à l'utilisateur de finaliser les métadonnées (icône, screenshots, catégories)
- Cohérence UX : tous les plugins passent par le même flux de publication

**Mise à jour d'un plugin existant (post-MVP) :**
- Ajouter un bouton "Nouvelle version" sur le projet Studio
- Redirection vers `/plugins/{slug}/versions/new` avec le binaire pré-rempli
- Nécessite que l'utilisateur soit l'auteur du plugin lié

---

## 6. Frontend — Éditeur Node-Based

### 6.1 Nouvelles Routes

| Route | Description |
|-------|-------------|
| `/studio` | Landing page : liste des projets, bouton "Nouveau projet" |
| `/studio/edit/new` | Nouveau projet dans l'éditeur (localStorage si invité) |
| `/studio/edit/[id]` | Éditer un projet existant (fetch depuis API) |

### 6.2 Dépendances NPM à ajouter

```bash
npm install @xyflow/react zustand
```

- `@xyflow/react` : le canvas node-based
- `zustand` : state management pour le graphe (React Flow recommande un store externe pour les gros graphes)

### 6.3 Architecture Composants

```
frontend/app/studio/
├── page.tsx                    # Landing / liste projets
├── edit/
│   ├── page.tsx                # Layout principal de l'éditeur
│   └── [id]/
│       └── page.tsx            # Édition projet existant

frontend/components/studio/
├── StudioCanvas.tsx            # Wrapper React Flow
├── NodePalette.tsx             # Sidebar gauche : palette de nœuds drag-and-drop
├── PropertyPanel.tsx           # Sidebar droite : propriétés du nœud sélectionné
├── NodeComponents/             # Rendu custom des nœuds
│   ├── EventNode.tsx           # Nœuds d'événement (header orange)
│   ├── ActionNode.tsx          # Nœuds d'action (header bleu)
│   ├── LogicNode.tsx           # Nœuds logiques (header violet)
│   └── DataNode.tsx            # Nœuds de données (header vert)
├── Toolbar.tsx                 # Barre du haut (nom projet, save status, build, publish)
├── TutorialOverlay.tsx         # Tutoriel interactif (tooltips)
├── BuildStatus.tsx             # Panneau de statut de compilation
└── useStudioStore.ts           # Zustand store (nodes, edges, selectedNode)
```

### 6.4 Types du graphe (`frontend/lib/studio/types.ts`)

```typescript
export interface StudioNodeData {
  label: string;
  category: 'event' | 'action' | 'logic' | 'data';
  // Définition des paramètres (inputs visuels)
  parameters: NodeParameter[];
  // Valeurs actuelles des paramètres
  values: Record<string, unknown>;
  // Couleur du header
  color: string;
  // Description (tooltip)
  description?: string;
}

export interface NodeParameter {
  id: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'player' | 'world' | 'position';
  options?: string[]; // Pour les selects
  required: boolean;
  defaultValue?: unknown;
}

export interface StudioFlow {
  nodes: Node<StudioNodeData>[];
  edges: Edge[];
}
```

### 6.5 Design System de l'Éditeur

Le design est **inspiré d'UE5 Blueprint** mais cohérent avec Maia :

**Canvas :**
- Fond : `#0f0f1a` (bleu-noir très sombre, distinct du `#0a0a0a` du site)
- Grid : lignes subtiles `#1a1a2e` avec espacement 20px

**Nœuds :**
- **Pas de border-radius** (cohérence Maia)
- Bordure : `1px solid #333`
- Header : couleur selon catégorie
  - Event : `#f97316` (orange accent)
  - Action : `#3b82f6` (bleu)
  - Logic : `#a855f7` (violet)
  - Data : `#22c55e` (vert)
- Body : `#1a1a2e` (fond légèrement plus clair)
- Texte : `#e5e5e5`
- Handles (ports) : cercles pleins, couleur du type
  - Exec (flux d'exécution) : `#fff` blanc
  - Data (string, number) : couleur du type

**Sélection :**
- Bordure glow : `box-shadow: 0 0 0 2px #f97316`

**Sidebar & UI :**
- Fond : `#0a0a0a` (cohérence site)
- Bordures : `#262626`
- Typographie : Raleway pour UI, JetBrains Mono pour code/labels techniques

### 6.6 Auto-Save

**Pour utilisateur connecté :**
- Debounce de 3 secondes après chaque modification (node ajouté, edge créé, propriété modifiée)
- Appel `PUT /api/v1/studio/projects/:id` avec le `flow_data` sérialisé
- Indicateur visuel dans la toolbar : "Sauvegardé" / "Sauvegarde..." / "Modifications non sauvegardées"

**Pour invité :**
- Sauvegarde dans `localStorage` sous la clé `pumpkin-studio-draft`
- Avertissement persistent en haut de page : bandeau orange
- Au login, propose de migrer le draft local vers le serveur

**Sauvegarde on-unload :**
- `beforeunload` listener pour sauvegarder immédiatement si des modifications sont en attente

### 6.7 Tutoriel Interactif

**Implémentation custom** (pas de lib externe lourde) :
- Tableau d'étapes : `[{ target: '.node-palette', text: '...' }, ...]`
- Overlay sombre avec un "trou" CSS (`box-shadow` inset) autour de l'élément cible
- Bulle de dialogue avec flèche
- Boutons "Suivant", "Passer", "Recommencer"
- Stockage dans `localStorage` : `pumpkin-studio-tutorial-shown: true`
- Se relance aussi si `pumpkin-studio-tutorial-shown` n'existe pas ET l'utilisateur est déconnecté

**Étapes MVP :**
1. Bienvenue dans Pumpkin Studio
2. Palette de nœuds (glisser-déposer)
3. Zone de travail (pan/zoom)
4. Connecter les nœuds (cliquer-glisser entre les ports)
5. Propriétés (cliquer un nœud pour éditer)
6. Compiler et tester
7. Publier

---

## 7. MVP — Nœuds Supportés

### 7.1 Événements (Event Nodes)

| Nœud | Source WIT | Output |
|------|-----------|--------|
| `Player Join` | `player-join-event` | `player: Player` |
| `Player Leave` | `player-leave-event` | `player: Player` |
| `Player Chat` | `player-chat-event` | `player: Player, message: string` |
| `Block Break` | `block-break-event` | `player: Option<Player>, block: string, position: BlockPos` |
| `Player Move` | `player-move-event` | `player: Player, from: Position, to: Position` |
| `Player Interact` | `player-interact-event` | `player: Player, action: InteractAction` |

### 7.2 Actions (Action Nodes)

| Nœud | Source WIT | Inputs |
|------|-----------|--------|
| `Send Message` | `server.broadcast` | `message: string` |
| `Send Message to Player` | `player.send_message` (si existe) ou text component | `player: Player, message: string` |
| `Teleport Player` | `entity.teleport` | `player: Player, position: Position, world: World` |
| `Set Gamemode` | `player.gamemode` | `player: Player, gamemode: GameMode` |
| `Execute Command` | `server.execute_command` | `command: string` |
| `Spawn Particle` | `world.spawn_particle` | `world: World, particle: string, position: Position` |

### 7.3 Logique (Logic Nodes) — Hardcodés

| Nœud | Inputs | Output |
|------|--------|--------|
| `If` | `condition: boolean` | `true` (exec), `false` (exec) |
| `And` | `a: boolean, b: boolean` | `result: boolean` |
| `Or` | `a: boolean, b: boolean` | `result: boolean` |
| `Compare String` | `a: string, b: string, op: ==/!=/contains` | `result: boolean` |
| `Compare Number` | `a: number, b: number, op: ==/!=/</>` | `result: boolean` |

### 7.4 Données (Data Nodes)

| Nœud | Output |
|------|--------|
| `String` | `value: string` (champ texte éditable) |
| `Number` | `value: number` (champ number éditable) |
| `Boolean` | `value: boolean` (toggle) |
| `Player (from event)` | Passe-through du player de l'événement parent |

### 7.5 Math (Math Nodes) — Hardcodés

| Nœud | Inputs | Output |
|------|--------|--------|
| `Add` | `a: number, b: number` | `result: number` |
| `Subtract` | `a: number, b: number` | `result: number` |
| `Multiply` | `a: number, b: number` | `result: number` |
| `Divide` | `a: number, b: number` | `result: number` |

**Hors MVP :** bloc Rust custom, boucles `for`, variables persistantes, custom commands, GUI.

---

## 8. Phases d'Implémentation

### Phase 1 : Fondations (Semaines 1-2)

**Backend :**
- [ ] Migration `033_create_studio_tables`
- [ ] Ajouter dépendances : `wit-parser`, `tempfile`, `tokio-process`
- [ ] Service `WitFetcher` : fetch + parse WIT + populate `node_registry`
- [ ] Routes CRUD projets (`GET/POST/PUT/DELETE /studio/projects`)
- [ ] Route `GET /studio/nodes`
- [ ] Tests d'intégration basiques

**Frontend :**
- [ ] Ajouter `@xyflow/react` et `zustand`
- [ ] Créer routes `/studio` et `/studio/edit/[id]`
- [ ] Layout de base (3 panneaux) avec design system
- [ ] Intégrer React Flow (canvas vide avec grid)

**Livrable :** On peut créer un projet vide et le sauvegarder.

### Phase 2 : Studio UI (Semaines 3-4)

**Frontend :**
- [ ] `NodePalette` : fetch `/studio/nodes`, drag-and-drop vers canvas
- [ ] Rendu custom des nœuds (Event/Action/Logic/Data) avec couleurs
- [ ] `PropertyPanel` : édition des paramètres selon le type
- [ ] Système de connexions (edges) avec validation de types
- [ ] Auto-save (debounced PUT ou localStorage)
- [ ] Bandeau "non connecté" pour invités
- [ ] Toolbar avec nom du projet, statut save, boutons Build/Publish

**Backend :**
- [ ] Valider le `flow_data` (structure JSON minimale)

**Livrable :** On peut construire un graphe visuel complet et le sauvegarder.

### Phase 3 : Génération & Compilation (Semaines 5-7)

**Backend :**
- [ ] Service `CodeGenerator` : JSON → Rust
- [ ] Service `BuildWorker` : queue PG + compilation cargo
- [ ] Route `POST /studio/projects/:id/build`
- [ ] Route `GET /studio/builds/:id` (SSE ou polling pour les logs)
- [ ] Template Cargo.toml + build temporaire
- [ ] Upload artefact WASM vers S3
- [ ] Gestion des erreurs de compilation (retourner logs)

**Docker :**
- [ ] Mettre à jour `api/Dockerfile` pour installer toolchain Rust WASM
- [ ] Volume pour le cache cargo du build worker

**Frontend :**
- [ ] Panneau "Build Status" avec logs temps réel
- [ ] Polling du statut de build

**Livrable :** On peut cliquer "Compiler" et obtenir un `.wasm`.

### Phase 4 : Publication & Polish (Semaines 8-9)

**Backend :**
- [ ] Route `GET /studio/projects/:id/publish-data`
- [ ] Route `POST /studio/projects/:id/transfer-binary`
- [ ] Modifier `/plugins/new` pour accepter les params `studio_project` / `studio_build`

**Frontend :**
- [ ] Tutoriel interactif (7 étapes)
- [ ] Page `/studio` : liste des projets avec vignettes/statuts
- [ ] Animations et micro-interactions (hover nœuds, connexion)
- [ ] Responsive minimal (message "Desktop only" sur mobile)

**Livrable :** Parcours complet : créer → éditer → compiler → formulaire de publication pré-rempli → publier.

### 5.7 Gestion des projets lors de l'évolution de l'API (WIT)

C'est un point critique : que devient un projet en cours quand Pumpkin ajoute, modifie ou supprime des événements/actions dans son WIT ?

**Contexte important : Pumpkin n'a pas de versioning semver à proprement parler.** Son WIT évolue en continu sur la branche `master`. Il n'existe pas de "v1.0", "v1.1" du WIT.

**Principe fondamental : on ne casse jamais un projet existant.**

**Snapshotting par hash :**
- À chaque fetch des WIT depuis GitHub, on calcule un **hash du contenu** (SHA-256 agrégé de tous les fichiers WIT)
- Ce hash représente un "snapshot" unique de l'API à un instant T : `wit_snapshot_hash`
- Chaque projet stocke le snapshot utilisé lors de sa création/dernière sauvegarde : `plugin_projects.wit_snapshot_hash`
- Le `node_registry` est versionné par snapshot : une table `node_registry_snapshots` stocke chaque hash avec sa date de fetch
- Les nœuds d'un snapshot donné sont conservés même quand de nouveaux snapshots arrivent

**Scénarios :**

| Changement API | Comportement |
|----------------|--------------|
| **Nouveau nœud ajouté** | Disponible pour les **nouveaux projets** (qui utilisent le dernier snapshot). Les projets existants restent sur leur snapshot. Bandeau "Nouveaux nœuds disponibles" avec un bouton "Mettre à jour le snapshot de ce projet". |
| **Nœud supprimé du WIT** | Les projets existants qui l'utilisent continuent de fonctionner. Le nœud apparaît en **rouge/grisé** dans l'éditeur avec un avertissement "Ce nœud n'existe plus dans le WIT actuel de Pumpkin". Le build worker utilise le snapshot du projet pour compiler. |
| **Nœud modifié (signature change)** | Traitée comme suppression + ajout. L'ancienne signature reste disponible pour les projets sur l'ancien snapshot. La nouvelle signature est ajoutée au dernier snapshot. |
| **Projet ouvert avec vieux snapshot** | Bandeau d'avertissement en haut du canvas : "Ce projet utilise un snapshot ancien du WIT Pumpkin. Vous pouvez continuer à le compiler, mais il est recommandé de mettre à jour." + bouton **Mettre à jour le snapshot** |

**Mise à jour du snapshot (post-MVP) :**
- Un bouton "Mettre à jour vers le dernier snapshot" crée une **copie** du projet
- Les nœuds qui n'existent plus dans le nouveau snapshot apparaissent en rouge
- L'utilisateur doit les remplacer manuellement ou les supprimer
- La compilation est bloquée tant que des nœuds "orphans" sont présents
- Le projet original reste intact sur l'ancien snapshot

**Impact sur la compilation :**
- Le build worker clone le repo Pumpkin MC au **commit le plus proche** de la date du snapshot (ou utilise une copie locale archivée)
- Le `Cargo.toml` généré pointe vers cette version figée du crate `pumpkin-plugin-api`
- Cela garantit qu'un projet créé il y a 6 mois compile encore aujourd'hui avec l'API telle qu'elle était à l'époque

### Phase 5 : Auto-adaptation WIT (Semaine 10)

**Backend :**
- [ ] Scheduler périodique (toutes les 24h) pour refetch les WIT
- [ ] Détection de changements (hash SHA-256 du contenu agrégé des fichiers WIT)
- [ ] Création d'un nouveau `snapshot_hash` à chaque changement détecté
- [ ] Conservation historique : tous les snapshots et leurs nœuds restent en base
- [ ] Notification frontend si de nouveaux nœuds ou nœuds supprimés détectés
- [ ] Gestion des nœuds "orphans" (snapshot différent du dernier)
- [ ] Le code generator utilise `wit_snapshot_hash` du projet pour choisir le template de compilation
- [ ] Archivage des versions du repo Pumpkin MC correspondant aux snapshots (cloner avec `--depth 1` à la date du fetch)

**Frontend :**
- [ ] Bandeau "Nouveaux nœuds disponibles" quand le dernier snapshot change
- [ ] Rendu spécial pour les nœuds n'appartenant pas au dernier snapshot (rouge, avertissement tooltip)
- [ ] Panneau "Compatibilité" dans les propriétés du projet (snapshot utilisé + date)

**Livrable :** L'éditeur s'adapte à l'évolution continue du WIT Pumpkin sans jamais casser les projets existants.

---

## 9. Intégration Infrastructure

### 9.1 Docker Compose

Ajouter à `docker-compose.yml` :
- **Aucun nouveau service** en dev. Le build worker tourne dans le conteneur `api-dev`.
- En production, envisager un conteneur `api-worker` séparé pour isoler les builds.

### 9.2 Dockerfile API

Mettre à jour `api/Dockerfile.dev` et `api/Dockerfile` :

```dockerfile
# Ajouter après l'installation Rust
RUN rustup target add wasm32-wasip1
RUN cargo install cargo-component

# Cloner Pumpkin MC pour les dépendances WIT
RUN git clone --depth 1 https://github.com/Pumpkin-MC/Pumpkin.git /opt/pumpkin-src
```

### 9.3 Variables d'environnement

Ajouter à `.env.example` :
```
# PumpkinHub Studio
STUDIO_BUILD_ENABLED=true
STUDIO_BUILD_TIMEOUT_SECONDS=300
STUDIO_WIT_FETCH_INTERVAL_HOURS=24
STUDIO_WIT_BASE_URL=https://raw.githubusercontent.com/Pumpkin-MC/Pumpkin/master/pumpkin-plugin-wit/v0.1
STUDIO_MAX_BUILD_CONCURRENCY=2
STUDIO_S3_PREFIX=studio-builds
```

---

## 10. Tests & Qualité

### Backend
- Tests d'intégration pour toutes les routes `/studio/*`
- Tests unitaires pour `CodeGenerator` (vérifier que des flows connus génèrent du Rust valide)
- Tests pour `WitFetcher` (mock HTTP)
- Test de compilation e2e : un flow simple doit compiler en WASM

### Frontend
- Tests composants pour `StudioCanvas`, `NodePalette`, `PropertyPanel`
- Test d'intégration : créer un projet, ajouter des nœuds, sauvegarder
- Vérifier couverture > seuils existants (79% lines)

---

## 11. Risques & Mitigations

| Risque | Impact | Mitigation |
|--------|--------|------------|
| **Compilation WASM trop lente** (>30s) | UX dégradée | Timeout 5min, queue PG, feedback temps réel, cache dépendances |
| **Génération de code incorrecte** | Plugin crash | Tests e2e sur flows de référence, validation statique basique |
| **WIT change breaking** | Nœuds cassés | Snapshotting par hash, conservation historique, projets pin sur leur snapshot |
| **Sécurité builds** | Code malveillant injecté | Build isolé (tmp dir), pas d'accès réseau pendant build, timeout |
| **React Flow bundle size** | Perf frontend | Tree-shaking, lazy load du canvas, code-splitting route `/studio` |
| **Complexité code gen** | Maintenance difficile | MVP très limité (6 events + 6 actions), architecture extensible |

---

## 12. Dépendances à Ajouter

### Frontend (`frontend/package.json`)
```json
{
  "dependencies": {
    "@xyflow/react": "^12.0.0",
    "zustand": "^5.0.0"
  }
}
```

### Backend (`api/Cargo.toml`)
```toml
[dependencies]
# WIT parsing
wit-parser = "0.220"
wit-component = "0.220"

# Process spawning for builds
tokio = { version = "1", features = ["full", "process"] }

# Temp files
tempfile = "3"

# YAML parsing (for WIT files if needed)
# (wit-parser gère le parsing natif)
```

---

## 13. Workflow Git

Tout le développement de PumpkinHub Studio se fait sur une branche dédiée avec des commits réguliers et atomiques.

**Convention de branche :**
```bash
git checkout -b feat/studio-no-code-editor
```

**Convention de commits** (format du repo : `type(scope): description`) :
```
feat(api): add studio database migrations and project CRUD
feat(api): implement WIT fetcher and node registry population
feat(frontend): install React Flow and create studio layout
feat(frontend): add node palette with drag-and-drop
test(api): add integration tests for studio routes
refactor(api): extract build worker into separate module
```

**Rythme de commits :**
- **1 commit par unité de travail logique** (ex: une route API, un composant, un test)
- Jamais de commit WIP ("work in progress") dans l'historique partagé
- `cargo fmt --all` et `npm run lint` passent avant chaque commit
- Les phases du plan peuvent être regroupées en quelques commits de taille moyenne, mais jamais un seul commit monolithique pour toute une phase

**Intégration :**
- La branche `feat/studio-no-code-editor` reste ouverte pendant tout le développement
- Merge dans `develop` uniquement après validation CI complète (eslint → tsc → next build → vitest / cargo fmt → clippy → sqlx → cargo test)
- Si une phase est très longue, on peut créer des sous-branches `feat/studio-phase-1`, `feat/studio-phase-2`, puis les fusionner dans la branche principale de feature

## 14. Conclusion

Ce plan définit une architecture complète et réaliste pour PumpkinHub Studio. L'approche par phases permet de livrer une valeur utilisateur dès la Phase 2 (éditeur visuel fonctionnel), puis d'ajouter la compilation et la publication. Le parser WIT garantit l'adaptabilité future à l'évolution de Pumpkin MC, et le versionning par projet garantit que les projets existants ne sont jamais cassés par une évolution de l'API.

**Prochaine étape recommandée :** Validation de ce plan, puis début de l'implémentation Phase 1 (fondations DB + API scaffold) sur la branche `feat/studio-no-code-editor`.
