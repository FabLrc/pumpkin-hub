-- Development seed data — realistic test fixtures for local development.
-- Uses fixed UUIDs so they can be referenced in tests and frontend work.

-- ============================================================
-- Users
-- ============================================================
INSERT INTO users (id, github_id, username, display_name, email, avatar_url, bio, role) VALUES
    ('a1000000-0000-0000-0000-000000000001', 100001, 'rustcraftdev', 'Alex Craft', 'alex@example.com', 'https://avatars.githubusercontent.com/u/100001', 'Rust enthusiast building Pumpkin plugins since day one.', 'admin'),
    ('a1000000-0000-0000-0000-000000000002', 100002, 'blocksmith42', 'Jordan Block', 'jordan@example.com', 'https://avatars.githubusercontent.com/u/100002', 'Full-stack dev & Minecraft modder.', 'author'),
    ('a1000000-0000-0000-0000-000000000003', 100003, 'oxidebuilder', 'Sam Oxide', 'sam@example.com', 'https://avatars.githubusercontent.com/u/100003', 'Performance-obsessed server plugin author.', 'author'),
    ('a1000000-0000-0000-0000-000000000004', 100004, 'pumpkinqueen', 'Luna Harvest', NULL, 'https://avatars.githubusercontent.com/u/100004', 'Community moderator & plugin reviewer.', 'moderator')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Categories
-- ============================================================
INSERT INTO categories (id, name, slug, description, icon) VALUES
    ('c2000000-0000-0000-0000-000000000001', 'Gameplay',    'gameplay',    'Mechanics, game modes and player experience enhancements.', 'gamepad-2'),
    ('c2000000-0000-0000-0000-000000000002', 'Administration', 'administration', 'Server management, permissions and moderation tools.', 'shield'),
    ('c2000000-0000-0000-0000-000000000003', 'World Generation', 'world-generation', 'Custom biomes, structures and terrain generators.', 'globe'),
    ('c2000000-0000-0000-0000-000000000004', 'Economy',     'economy',     'Virtual currencies, shops and trading systems.',      'coins'),
    ('c2000000-0000-0000-0000-000000000005', 'Chat',        'chat',        'Chat formatting, channels and communication tools.',  'message-square'),
    ('c2000000-0000-0000-0000-000000000006', 'API / Library', 'api-library', 'Shared libraries and developer utilities.',           'code'),
    ('c2000000-0000-0000-0000-000000000007', 'Performance', 'performance', 'Optimisation, profiling and resource management.',    'zap'),
    ('c2000000-0000-0000-0000-000000000008', 'Security',    'security',    'Anti-cheat, anti-grief and access control plugins.',  'lock')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Plugins
-- ============================================================
INSERT INTO plugins (id, author_id, name, slug, short_description, description, repository_url, license, downloads_total) VALUES
    (
        'b3000000-0000-0000-0000-000000000001',
        'a1000000-0000-0000-0000-000000000001',
        'PumpkinGuard',
        'pumpkin-guard',
        'Lightweight anti-cheat for Pumpkin servers.',
        E'# PumpkinGuard\n\nA blazing-fast anti-cheat engine built in Rust.\n\n## Features\n- Movement validation\n- Combat analysis\n- Configurable thresholds',
        'https://github.com/rustcraftdev/pumpkin-guard',
        'MIT',
        12450
    ),
    (
        'b3000000-0000-0000-0000-000000000002',
        'a1000000-0000-0000-0000-000000000002',
        'EconoMine',
        'economine',
        'Full-featured server economy with shops and auctions.',
        E'# EconoMine\n\nComplete economy system for Pumpkin MC.\n\n## Features\n- Virtual currency\n- Player-to-player trading\n- Admin shop configuration\n- Auction house',
        'https://github.com/blocksmith42/economine',
        'Apache-2.0',
        8320
    ),
    (
        'b3000000-0000-0000-0000-000000000003',
        'a1000000-0000-0000-0000-000000000003',
        'TerraCraft',
        'terracraft',
        'Procedural world generation with custom biomes.',
        E'# TerraCraft\n\nAdvanced terrain generator for Pumpkin MC.\n\n## Features\n- 12 custom biomes\n- Configurable ore distribution\n- Structure generation API',
        'https://github.com/oxidebuilder/terracraft',
        'GPL-3.0',
        5670
    ),
    (
        'b3000000-0000-0000-0000-000000000004',
        'a1000000-0000-0000-0000-000000000001',
        'PumpkinCore',
        'pumpkin-core',
        'Shared utilities and API for Pumpkin plugin developers.',
        E'# PumpkinCore\n\nCommon library providing shared traits, macros and utilities.\n\n## Usage\nAdd to your `Cargo.toml`:\n```toml\npumpkin-core = "0.2"\n```',
        'https://github.com/rustcraftdev/pumpkin-core',
        'MIT',
        21300
    ),
    (
        'b3000000-0000-0000-0000-000000000005',
        'a1000000-0000-0000-0000-000000000002',
        'ChatForge',
        'chatforge',
        'Advanced chat formatting and channel management.',
        E'# ChatForge\n\nModular chat system for Pumpkin MC.\n\n## Features\n- Custom prefixes & suffixes\n- Private channels\n- Markdown support in chat',
        'https://github.com/blocksmith42/chatforge',
        'MIT',
        3150
    )
ON CONFLICT DO NOTHING;

-- ============================================================
-- Plugin ↔ Category associations
-- ============================================================
INSERT INTO plugin_categories (plugin_id, category_id) VALUES
    -- PumpkinGuard → Security, Administration
    ('b3000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000008'),
    ('b3000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000002'),
    -- EconoMine → Economy, Gameplay
    ('b3000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000004'),
    ('b3000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000001'),
    -- TerraCraft → World Generation
    ('b3000000-0000-0000-0000-000000000003', 'c2000000-0000-0000-0000-000000000003'),
    -- PumpkinCore → API / Library
    ('b3000000-0000-0000-0000-000000000004', 'c2000000-0000-0000-0000-000000000006'),
    -- ChatForge → Chat
    ('b3000000-0000-0000-0000-000000000005', 'c2000000-0000-0000-0000-000000000005')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Versions
-- ============================================================
INSERT INTO versions (id, plugin_id, version, changelog, pumpkin_version_min, pumpkin_version_max, downloads, published_at) VALUES
    -- PumpkinGuard versions
    ('d4000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', '0.1.0', 'Initial release with basic movement checks.', '0.1.0', '0.1.x', 4200, '2025-06-15T10:00:00Z'),
    ('d4000000-0000-0000-0000-000000000002', 'b3000000-0000-0000-0000-000000000001', '0.2.0', E'- Added combat analysis engine\n- Improved speed detection', '0.1.0', '0.2.x', 5100, '2025-08-20T14:30:00Z'),
    ('d4000000-0000-0000-0000-000000000003', 'b3000000-0000-0000-0000-000000000001', '0.3.0', E'- Configurable thresholds via TOML\n- False-positive reduction', '0.2.0', '0.3.x', 3150, '2025-11-01T09:00:00Z'),

    -- EconoMine versions
    ('d4000000-0000-0000-0000-000000000004', 'b3000000-0000-0000-0000-000000000002', '1.0.0', 'Stable release: currency, basic shops.', '0.1.0', '0.2.x', 6000, '2025-07-01T12:00:00Z'),
    ('d4000000-0000-0000-0000-000000000005', 'b3000000-0000-0000-0000-000000000002', '1.1.0', E'- Auction house\n- Transaction history', '0.2.0', '0.3.x', 2320, '2025-10-10T16:00:00Z'),

    -- TerraCraft versions
    ('d4000000-0000-0000-0000-000000000006', 'b3000000-0000-0000-0000-000000000003', '0.1.0', 'Alpha: 4 custom biomes.', '0.1.0', '0.1.x', 2100, '2025-09-05T08:00:00Z'),
    ('d4000000-0000-0000-0000-000000000007', 'b3000000-0000-0000-0000-000000000003', '0.2.0', E'- 8 more biomes\n- Ore distribution config\n- Structure gen API', '0.2.0', '0.3.x', 3570, '2025-12-15T11:00:00Z'),

    -- PumpkinCore versions
    ('d4000000-0000-0000-0000-000000000008', 'b3000000-0000-0000-0000-000000000004', '0.1.0', 'Initial library release.', '0.1.0', '0.1.x', 9800, '2025-05-20T07:00:00Z'),
    ('d4000000-0000-0000-0000-000000000009', 'b3000000-0000-0000-0000-000000000004', '0.2.0', E'- New macros for event handling\n- Error trait improvements', '0.1.0', '0.3.x', 11500, '2025-09-30T10:00:00Z'),

    -- ChatForge versions
    ('d4000000-0000-0000-0000-000000000010', 'b3000000-0000-0000-0000-000000000005', '0.1.0', 'Beta: basic chat formatting.', '0.2.0', '0.3.x', 1800, '2025-11-20T13:00:00Z'),
    ('d4000000-0000-0000-0000-000000000011', 'b3000000-0000-0000-0000-000000000005', '0.2.0', E'- Private channels\n- Markdown rendering', '0.2.0', '0.3.x', 1350, '2026-01-08T15:00:00Z')
ON CONFLICT DO NOTHING;

-- Mark EconoMine 1.0.0 as yanked (known memory-leak regression)
UPDATE versions SET is_yanked = true WHERE id = 'd4000000-0000-0000-0000-000000000004';
