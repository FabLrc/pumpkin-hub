-- ============================================================
-- 026 — Categories Refinement
--
-- Adds soft-deletion (is_active) and display ordering to
-- categories, renames 4 existing categories for better
-- semantic grouping, and inserts 9 new server-plugin
-- categories inspired by Modrinth / CurseForge taxonomies.
-- ============================================================

-- ── Schema changes ────────────────────────────────────────────
ALTER TABLE categories
    ADD COLUMN is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN display_order  INTEGER NOT NULL DEFAULT 0;

CREATE INDEX idx_categories_is_active ON categories (is_active) WHERE is_active = TRUE;

-- ── Rename existing categories ────────────────────────────────

-- Gameplay → Game Mechanics
UPDATE categories SET
    name          = 'Game Mechanics',
    slug          = 'game-mechanics',
    description   = 'Core gameplay changes, custom enchantments and world rules.',
    display_order = 6
WHERE id = 'c2000000-0000-0000-0000-000000000001';

-- Administration → Management
UPDATE categories SET
    name          = 'Management',
    slug          = 'management',
    description   = 'Server administration, permissions and moderation tools.',
    display_order = 8
WHERE id = 'c2000000-0000-0000-0000-000000000002';

-- API / Library → Library
UPDATE categories SET
    name          = 'Library',
    slug          = 'library',
    description   = 'Shared libraries, frameworks and developer APIs.',
    display_order = 7
WHERE id = 'c2000000-0000-0000-0000-000000000006';

-- Performance → Optimization
UPDATE categories SET
    name          = 'Optimization',
    slug          = 'optimization',
    description   = 'Performance tuning, profiling and resource management.',
    display_order = 11
WHERE id = 'c2000000-0000-0000-0000-000000000007';

-- ── Update display_order for kept categories ──────────────────

UPDATE categories SET display_order = 2
WHERE id = 'c2000000-0000-0000-0000-000000000005'; -- Chat

UPDATE categories SET display_order = 4
WHERE id = 'c2000000-0000-0000-0000-000000000004'; -- Economy

UPDATE categories SET display_order = 12
WHERE id = 'c2000000-0000-0000-0000-000000000008'; -- Security

UPDATE categories SET display_order = 17
WHERE id = 'c2000000-0000-0000-0000-000000000003'; -- World Generation

-- ── Insert new categories ─────────────────────────────────────

INSERT INTO categories (id, name, slug, description, icon, is_active, display_order) VALUES
    ('c2000000-0000-0000-0000-000000000009', 'Adventure',       'adventure',       'Quests, dungeons, RPG mechanics and narrative experiences.',          'compass',          TRUE, 1),
    ('c2000000-0000-0000-0000-000000000010', 'Decoration',      'decoration',      'Visual enhancements, particles, holograms and cosmetics.',           'palette',          TRUE, 3),
    ('c2000000-0000-0000-0000-000000000011', 'Equipment',       'equipment',       'Custom items, weapons, armor and loot systems.',                     'swords',           TRUE, 5),
    ('c2000000-0000-0000-0000-000000000012', 'Minigame',        'minigame',        'Mini-games, arenas and competitive game modes.',                     'trophy',           TRUE, 9),
    ('c2000000-0000-0000-0000-000000000013', 'Mobs',            'mobs',            'Custom mobs, bosses, NPCs and entity modifications.',                'bug',              TRUE, 10),
    ('c2000000-0000-0000-0000-000000000014', 'Social',          'social',          'Teams, parties, friends lists and social features.',                 'users',            TRUE, 13),
    ('c2000000-0000-0000-0000-000000000015', 'Storage',         'storage',         'Databases, inventories, backups and data persistence.',              'database',         TRUE, 14),
    ('c2000000-0000-0000-0000-000000000016', 'Transportation',  'transportation',  'Teleportation, warps, vehicles and movement systems.',               'arrow-right-left', TRUE, 15),
    ('c2000000-0000-0000-0000-000000000017', 'Utility',         'utility',         'General-purpose tools, helpers and quality-of-life improvements.',   'wrench',           TRUE, 16)
ON CONFLICT DO NOTHING;
