use std::collections::HashMap;

use crate::error::AppError;

use super::flow_types::FlowNode;

/// Returns the Rust event data struct name for a given event node_id.
pub fn event_type(node_id: &str) -> &str {
    match node_id {
        "event.player-join" => "PlayerJoinEventData",
        "event.player-leave" => "PlayerLeaveEventData",
        "event.player-chat" => "PlayerChatEventData",
        "event.player-interact" => "PlayerInteractEventData",
        "event.block-break" => "BlockBreakEventData",
        "event.player-move" => "PlayerMoveEventData",
        _ => "EventData",
    }
}

/// Returns the Rust Event enum variant name for a given event node_id.
pub fn event_variant(node_id: &str) -> &str {
    match node_id {
        "event.player-join" => "PlayerJoinEvent",
        "event.player-leave" => "PlayerLeaveEvent",
        "event.player-chat" => "PlayerChatEvent",
        "event.player-interact" => "PlayerInteractEvent",
        "event.block-break" => "BlockBreakEvent",
        "event.player-move" => "PlayerMoveEvent",
        _ => "event",
    }
}

/// Returns true if the node is a known event node.
pub fn is_event_node(node: &FlowNode) -> bool {
    matches!(
        node.data.definition.node_id.as_str(),
        "event.player-join"
            | "event.player-leave"
            | "event.player-chat"
            | "event.player-interact"
            | "event.block-break"
            | "event.player-move"
    )
}

/// Detects cycles in a directed graph using 3-color DFS.
/// Returns Ok if acyclic, Err if a cycle is found.
pub fn detect_cycle(adjacency: &HashMap<&str, Vec<&str>>) -> Result<(), AppError> {
    let mut color: HashMap<&str, u8> = HashMap::new();
    for node in adjacency.keys() {
        color.entry(node).or_insert(0);
    }
    for neighbors in adjacency.values() {
        for n in neighbors {
            color.entry(n).or_insert(0);
        }
    }

    fn dfs<'a>(
        node: &'a str,
        adj: &HashMap<&'a str, Vec<&'a str>>,
        color: &mut HashMap<&'a str, u8>,
    ) -> Result<(), AppError> {
        let entry = color.get_mut(node).ok_or_else(|| {
            AppError::UnprocessableEntity(format!(
                "internal error: node '{node}' not found during cycle detection"
            ))
        })?;
        *entry = 1;
        if let Some(neighbors) = adj.get(node) {
            for next in neighbors {
                let c = *color.get(next).unwrap_or(&0);
                if c == 1 {
                    return Err(AppError::UnprocessableEntity(format!(
                        "Cycle detected in flow graph involving node '{next}'. \
                         Remove the circular connection and retry."
                    )));
                }
                if c == 0 {
                    dfs(next, adj, color)?;
                }
            }
        }
        let entry = color.get_mut(node).ok_or_else(|| {
            AppError::UnprocessableEntity("internal error during cycle detection cleanup".into())
        })?;
        *entry = 2;
        Ok(())
    }

    let keys: Vec<&str> = color.keys().copied().collect();
    for node in keys {
        if *color.get(node).unwrap_or(&0) == 0 {
            dfs(node, adjacency, &mut color)?;
        }
    }
    Ok(())
}
