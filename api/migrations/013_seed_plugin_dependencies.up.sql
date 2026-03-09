-- Seed realistic inter-plugin dependency data for local development.
-- Uses fixed UUIDs consistent with 006_seed_dev_data.

-- ============================================================
-- Plugin Dependencies
-- ============================================================
-- Reminder of version UUIDs (from 006):
--   PumpkinGuard  0.3.0 → d4000000-...-000000000003
--   EconoMine     1.1.0 → d4000000-...-000000000005
--   TerraCraft    0.2.0 → d4000000-...-000000000007
--   PumpkinCore   0.2.0 → d4000000-...-000000000009
--   ChatForge     0.2.0 → d4000000-...-000000000011

INSERT INTO plugin_dependencies (id, version_id, dependency_plugin_id, version_req, is_optional) VALUES
    -- PumpkinGuard 0.3.0 depends on PumpkinCore >=0.1.0
    (
        'e5000000-0000-0000-0000-000000000001',
        'd4000000-0000-0000-0000-000000000003',
        'b3000000-0000-0000-0000-000000000004',
        '>=0.1.0',
        false
    ),
    -- EconoMine 1.1.0 depends on PumpkinCore >=0.2.0
    (
        'e5000000-0000-0000-0000-000000000002',
        'd4000000-0000-0000-0000-000000000005',
        'b3000000-0000-0000-0000-000000000004',
        '>=0.2.0',
        false
    ),
    -- EconoMine 1.1.0 optionally depends on ChatForge >=0.1.0 (economy chat integration)
    (
        'e5000000-0000-0000-0000-000000000003',
        'd4000000-0000-0000-0000-000000000005',
        'b3000000-0000-0000-0000-000000000005',
        '>=0.1.0',
        true
    ),
    -- TerraCraft 0.2.0 depends on PumpkinCore ^0.2
    (
        'e5000000-0000-0000-0000-000000000004',
        'd4000000-0000-0000-0000-000000000007',
        'b3000000-0000-0000-0000-000000000004',
        '^0.2',
        false
    ),
    -- ChatForge 0.2.0 depends on PumpkinCore >=0.1.0
    (
        'e5000000-0000-0000-0000-000000000005',
        'd4000000-0000-0000-0000-000000000011',
        'b3000000-0000-0000-0000-000000000004',
        '>=0.1.0',
        false
    )
ON CONFLICT DO NOTHING;
