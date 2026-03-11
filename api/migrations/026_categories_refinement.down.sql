-- ============================================================
-- 026 — Categories Refinement  (ROLLBACK)
-- ============================================================

-- Remove new categories
DELETE FROM plugin_categories WHERE category_id IN (
    'c2000000-0000-0000-0000-000000000009',
    'c2000000-0000-0000-0000-000000000010',
    'c2000000-0000-0000-0000-000000000011',
    'c2000000-0000-0000-0000-000000000012',
    'c2000000-0000-0000-0000-000000000013',
    'c2000000-0000-0000-0000-000000000014',
    'c2000000-0000-0000-0000-000000000015',
    'c2000000-0000-0000-0000-000000000016',
    'c2000000-0000-0000-0000-000000000017'
);

DELETE FROM categories WHERE id IN (
    'c2000000-0000-0000-0000-000000000009',
    'c2000000-0000-0000-0000-000000000010',
    'c2000000-0000-0000-0000-000000000011',
    'c2000000-0000-0000-0000-000000000012',
    'c2000000-0000-0000-0000-000000000013',
    'c2000000-0000-0000-0000-000000000014',
    'c2000000-0000-0000-0000-000000000015',
    'c2000000-0000-0000-0000-000000000016',
    'c2000000-0000-0000-0000-000000000017'
);

-- Revert renamed categories
UPDATE categories SET
    name = 'Gameplay', slug = 'gameplay',
    description = 'Mechanics, game modes and player experience enhancements.',
    display_order = 0
WHERE id = 'c2000000-0000-0000-0000-000000000001';

UPDATE categories SET
    name = 'Administration', slug = 'administration',
    description = 'Server management, permissions and moderation tools.',
    display_order = 0
WHERE id = 'c2000000-0000-0000-0000-000000000002';

UPDATE categories SET
    name = 'API / Library', slug = 'api-library',
    description = 'Shared libraries and developer utilities.',
    display_order = 0
WHERE id = 'c2000000-0000-0000-0000-000000000006';

UPDATE categories SET
    name = 'Performance', slug = 'performance',
    description = 'Optimisation, profiling and resource management.',
    display_order = 0
WHERE id = 'c2000000-0000-0000-0000-000000000007';

-- Reset display_order for kept categories
UPDATE categories SET display_order = 0
WHERE id IN (
    'c2000000-0000-0000-0000-000000000003',
    'c2000000-0000-0000-0000-000000000004',
    'c2000000-0000-0000-0000-000000000005',
    'c2000000-0000-0000-0000-000000000008'
);

-- Drop index and columns
DROP INDEX IF EXISTS idx_categories_is_active;
ALTER TABLE categories DROP COLUMN IF EXISTS display_order;
ALTER TABLE categories DROP COLUMN IF EXISTS is_active;
