-- Junction table: many-to-many relationship between plugins and categories.
CREATE TABLE IF NOT EXISTS plugin_categories (
    plugin_id       UUID NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
    category_id     UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (plugin_id, category_id)
);

CREATE INDEX idx_plugin_categories_category_id ON plugin_categories (category_id);
