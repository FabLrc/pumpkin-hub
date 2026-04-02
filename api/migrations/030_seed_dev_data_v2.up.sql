-- Migration 030: Dev seed data v2 (WASM-only era)
-- Replaces seed data wiped by migration 027.
-- Uses fixed UUIDs prefixed f6/g7/h8/i9 for easy reference and cleanup.
-- Categories reference migration 026 IDs (c2000000-...-0009 through 0017).

-- ============================================================
-- Users
-- ============================================================
INSERT INTO users (id, github_id, username, display_name, email, avatar_url, bio, role) VALUES
    ('f6000000-0000-0000-0000-000000000001', 200001, 'rustcraftdev', 'Alex Craft',    'alex@example.com',   'https://avatars.githubusercontent.com/u/200001', 'Rust enthusiast building Pumpkin plugins since day one.', 'admin'),
    ('f6000000-0000-0000-0000-000000000002', 200002, 'blocksmith42',  'Jordan Block',  'jordan@example.com', 'https://avatars.githubusercontent.com/u/200002', 'Full-stack dev & Minecraft modder.',                       'author'),
    ('f6000000-0000-0000-0000-000000000003', 200003, 'oxidebuilder',  'Sam Oxide',     'sam@example.com',    'https://avatars.githubusercontent.com/u/200003', 'Performance-obsessed server plugin author.',               'author'),
    ('f6000000-0000-0000-0000-000000000004', 200004, 'wasmwitch',     'Luna Harvest',  NULL,                 'https://avatars.githubusercontent.com/u/200004', 'Community moderator & plugin reviewer.',                   'moderator')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Plugins
-- ============================================================
INSERT INTO plugins (id, author_id, name, slug, short_description, description, repository_url, license, downloads_total) VALUES
    (
        'g7000000-0000-0000-0000-000000000001',
        'f6000000-0000-0000-0000-000000000001',
        'PumpkinGuard',
        'pumpkin-guard',
        'Lightweight anti-cheat for Pumpkin servers.',
        E'# PumpkinGuard\n\nA blazing-fast anti-cheat engine compiled to WebAssembly.\n\n## Features\n- Movement validation\n- Combat analysis\n- Configurable thresholds\n\n## Installation\nDrop the `.wasm` file in your plugins folder and restart.',
        'https://github.com/rustcraftdev/pumpkin-guard',
        'MIT',
        14750
    ),
    (
        'g7000000-0000-0000-0000-000000000002',
        'f6000000-0000-0000-0000-000000000002',
        'EconoMine',
        'economine',
        'Full-featured server economy with shops and auctions.',
        E'# EconoMine\n\nComplete economy system for Pumpkin MC.\n\n## Features\n- Virtual currency\n- Player-to-player trading\n- Admin shop configuration\n- Auction house\n\n## Compatibility\nBuilt for Pumpkin 0.3.x. Works on all platforms via WebAssembly.',
        'https://github.com/blocksmith42/economine',
        'Apache-2.0',
        9120
    ),
    (
        'g7000000-0000-0000-0000-000000000003',
        'f6000000-0000-0000-0000-000000000003',
        'TerraCraft',
        'terracraft',
        'Procedural world generation with custom biomes.',
        E'# TerraCraft\n\nAdvanced terrain generator for Pumpkin MC compiled to WASM.\n\n## Features\n- 12 custom biomes\n- Configurable ore distribution\n- Structure generation API',
        'https://github.com/oxidebuilder/terracraft',
        'GPL-3.0',
        6340
    ),
    (
        'g7000000-0000-0000-0000-000000000004',
        'f6000000-0000-0000-0000-000000000001',
        'PumpkinCore',
        'pumpkin-core',
        'Shared utilities and API for Pumpkin plugin developers.',
        E'# PumpkinCore\n\nCommon library providing shared traits, macros and utilities for plugin development.\n\n## Usage\nAdd as a dependency in your plugin manifest.',
        'https://github.com/rustcraftdev/pumpkin-core',
        'MIT',
        23800
    ),
    (
        'g7000000-0000-0000-0000-000000000005',
        'f6000000-0000-0000-0000-000000000002',
        'ChatForge',
        'chatforge',
        'Advanced chat formatting and channel management.',
        E'# ChatForge\n\nModular chat system for Pumpkin MC.\n\n## Features\n- Custom prefixes & suffixes\n- Private channels\n- Markdown support in chat',
        'https://github.com/blocksmith42/chatforge',
        'MIT',
        4210
    ),
    (
        'g7000000-0000-0000-0000-000000000006',
        'f6000000-0000-0000-0000-000000000003',
        'QuestForge',
        'questforge',
        'Dynamic quest system with branching dialogue trees.',
        E'# QuestForge\n\nRPG-style quest engine for Pumpkin MC servers.\n\n## Features\n- Visual quest editor\n- Branching dialogue\n- Reward system\n- NPC integration',
        'https://github.com/oxidebuilder/questforge',
        'MIT',
        2980
    )
ON CONFLICT DO NOTHING;

-- ============================================================
-- Plugin ↔ Category associations (using migration 026 IDs)
-- ============================================================
INSERT INTO plugin_categories (plugin_id, category_id) VALUES
    -- PumpkinGuard → Security (c2000000-...-0008 was deleted; use Management 0002-equiv from 026 context)
    -- After migration 027, categories 001-008 are gone. Use 026 categories (009-017):
    -- 009=Adventure, 010=Decoration, 011=Equipment, 012=Minigame, 013=Mobs,
    -- 014=Social, 015=Storage, 016=Transportation, 017=Utility
    ('g7000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000017'),  -- PumpkinGuard → Utility
    ('g7000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000017'),  -- EconoMine → Utility
    ('g7000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000012'),  -- EconoMine → Minigame
    ('g7000000-0000-0000-0000-000000000003', 'c2000000-0000-0000-0000-000000000009'),  -- TerraCraft → Adventure
    ('g7000000-0000-0000-0000-000000000004', 'c2000000-0000-0000-0000-000000000017'),  -- PumpkinCore → Utility
    ('g7000000-0000-0000-0000-000000000005', 'c2000000-0000-0000-0000-000000000014'),  -- ChatForge → Social
    ('g7000000-0000-0000-0000-000000000006', 'c2000000-0000-0000-0000-000000000009'),  -- QuestForge → Adventure
    ('g7000000-0000-0000-0000-000000000006', 'c2000000-0000-0000-0000-000000000013')   -- QuestForge → Mobs
ON CONFLICT DO NOTHING;

-- ============================================================
-- Versions
-- ============================================================
INSERT INTO versions (id, plugin_id, version, changelog, pumpkin_version_min, pumpkin_version_max, downloads, published_at) VALUES
    -- PumpkinGuard
    ('h8000000-0000-0000-0000-000000000001', 'g7000000-0000-0000-0000-000000000001', '0.2.0', E'- Added combat analysis engine\n- Improved speed detection', '0.1.0', '0.2.x', 5100, '2025-08-20T14:30:00Z'),
    ('h8000000-0000-0000-0000-000000000002', 'g7000000-0000-0000-0000-000000000001', '0.3.0', E'- Configurable thresholds via TOML\n- False-positive reduction\n- WASM recompile for Pumpkin 0.3.x', '0.2.0', '0.3.x', 9650, '2025-11-01T09:00:00Z'),

    -- EconoMine
    ('h8000000-0000-0000-0000-000000000003', 'g7000000-0000-0000-0000-000000000002', '1.1.0', E'- Auction house\n- Transaction history\n- Migrated to WASM binary', '0.2.0', '0.3.x', 9120, '2025-10-10T16:00:00Z'),

    -- TerraCraft
    ('h8000000-0000-0000-0000-000000000004', 'g7000000-0000-0000-0000-000000000003', '0.2.0', E'- 8 more biomes\n- Ore distribution config\n- Structure gen API\n- Universal .wasm build', '0.2.0', '0.3.x', 6340, '2025-12-15T11:00:00Z'),

    -- PumpkinCore
    ('h8000000-0000-0000-0000-000000000005', 'g7000000-0000-0000-0000-000000000004', '0.2.0', E'- New macros for event handling\n- Error trait improvements', '0.1.0', '0.3.x', 12100, '2025-09-30T10:00:00Z'),
    ('h8000000-0000-0000-0000-000000000006', 'g7000000-0000-0000-0000-000000000004', '0.3.0', E'- Async hooks support\n- Memory-safe slice API\n- WASM ABI stabilisation', '0.3.0', '0.3.x', 11700, '2026-01-15T09:00:00Z'),

    -- ChatForge
    ('h8000000-0000-0000-0000-000000000007', 'g7000000-0000-0000-0000-000000000005', '0.2.0', E'- Private channels\n- Markdown rendering', '0.2.0', '0.3.x', 4210, '2026-01-08T15:00:00Z'),

    -- QuestForge
    ('h8000000-0000-0000-0000-000000000008', 'g7000000-0000-0000-0000-000000000006', '0.1.0', 'Initial alpha release: basic quest chains.', '0.3.0', '0.3.x', 2980, '2026-02-01T10:00:00Z')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Binaries (.wasm only, no platform column)
-- Storage keys follow pattern: plugins/{slug}/{version}/{filename}
-- SHA-256 values are fake (dev only — actual files not in MinIO)
-- ============================================================
INSERT INTO binaries (id, version_id, file_name, file_size, checksum_sha256, storage_key, content_type) VALUES
    (
        'i9000000-0000-0000-0000-000000000001',
        'h8000000-0000-0000-0000-000000000002',
        'pumpkin-guard.wasm',
        524288,
        'a3b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6e7f8a3b4',
        'plugins/pumpkin-guard/0.3.0/pumpkin-guard.wasm',
        'application/wasm'
    ),
    (
        'i9000000-0000-0000-0000-000000000002',
        'h8000000-0000-0000-0000-000000000003',
        'economine.wasm',
        786432,
        'b4c5d6e7f8a9b4c5d6e7f8a9b4c5d6e7f8a9b4c5d6e7f8a9b4c5d6e7f8a9b4c5',
        'plugins/economine/1.1.0/economine.wasm',
        'application/wasm'
    ),
    (
        'i9000000-0000-0000-0000-000000000003',
        'h8000000-0000-0000-0000-000000000004',
        'terracraft.wasm',
        1048576,
        'c5d6e7f8a9b0c5d6e7f8a9b0c5d6e7f8a9b0c5d6e7f8a9b0c5d6e7f8a9b0c5d6',
        'plugins/terracraft/0.2.0/terracraft.wasm',
        'application/wasm'
    ),
    (
        'i9000000-0000-0000-0000-000000000004',
        'h8000000-0000-0000-0000-000000000006',
        'pumpkin-core.wasm',
        262144,
        'd6e7f8a9b0c1d6e7f8a9b0c1d6e7f8a9b0c1d6e7f8a9b0c1d6e7f8a9b0c1d6e7',
        'plugins/pumpkin-core/0.3.0/pumpkin-core.wasm',
        'application/wasm'
    ),
    (
        'i9000000-0000-0000-0000-000000000005',
        'h8000000-0000-0000-0000-000000000007',
        'chatforge.wasm',
        393216,
        'e7f8a9b0c1d2e7f8a9b0c1d2e7f8a9b0c1d2e7f8a9b0c1d2e7f8a9b0c1d2e7f8',
        'plugins/chatforge/0.2.0/chatforge.wasm',
        'application/wasm'
    )
ON CONFLICT DO NOTHING;
