use std::collections::{HashMap, HashSet, VecDeque};

use serde::Deserialize;

use crate::error::AppError;

/// Represents a node in the flow graph as parsed from flow_data JSON.
#[derive(Debug, Deserialize)]
struct FlowNode {
    id: String,
    #[serde(rename = "type")]
    node_type: String,
    #[allow(dead_code)]
    position: Option<serde_json::Value>,
    data: FlowNodeData,
}

#[derive(Debug, Deserialize)]
struct FlowNodeData {
    #[serde(default)]
    definition: FlowNodeDefinition,
    #[serde(default)]
    values: HashMap<String, serde_json::Value>,
    label: Option<String>,
}

#[derive(Debug, Deserialize, Default)]
struct FlowNodeDefinition {
    #[serde(default)]
    node_id: String,
    #[serde(default)]
    category: String,
    #[serde(default)]
    parameters: Vec<FlowParam>,
    #[serde(default)]
    outputs: Vec<FlowOutput>,
}

#[derive(Debug, Deserialize)]
struct FlowParam {
    id: String,
    label: Option<String>,
    #[serde(rename = "param_type")]
    param_type: Option<String>,
    #[serde(default)]
    default_value: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
struct FlowOutput {
    id: String,
    output_type: Option<String>,
}

#[derive(Debug, Deserialize)]
struct FlowEdge {
    id: Option<String>,
    source: String,
    target: String,
    #[serde(rename = "sourceHandle")]
    source_handle: Option<String>,
    #[serde(rename = "targetHandle")]
    target_handle: Option<String>,
}

#[derive(Debug, Deserialize)]
struct FlowData {
    #[serde(default)]
    nodes: Vec<FlowNode>,
    #[serde(default)]
    edges: Vec<FlowEdge>,
}

/// Generates Rust source code from a flow graph.
/// Returns the complete `src/lib.rs` content.
pub fn generate_rust_source(project_slug: &str, flow_json: &serde_json::Value) -> Result<String, AppError> {
    let flow: FlowData = serde_json::from_value(flow_json.clone())
        .map_err(|e| AppError::UnprocessableEntity(format!("invalid flow_data: {e}")))?;

    if flow.nodes.is_empty() {
        return generate_empty_plugin(project_slug);
    }

    let edges_by_source: HashMap<String, Vec<&FlowEdge>> = {
        let mut map: HashMap<String, Vec<&FlowEdge>> = HashMap::new();
        for edge in &flow.edges {
            map.entry(edge.source.clone()).or_default().push(edge);
        }
        map
    };

    // Find event nodes (entry points)
    let event_nodes: Vec<&FlowNode> = flow.nodes.iter()
        .filter(|n| n.data.definition.category == "event")
        .collect();

    let mut body = String::new();

    // Generate event handlers
    for event_node in &event_nodes {
        let handler_name = format!("handle_{}", event_node.data.definition.node_id.replace('.', "_"));
        body.push_str(&generate_event_handler(event_node, &edges_by_source, &flow.nodes, &handler_name)?);
    }

    // Generate the handle_event dispatch
    let dispatch = generate_event_dispatch(&event_nodes);

    let code = format!(
        r#"use pumpkin_plugin_api::*;
use std::sync::Mutex;

struct PluginState;

static STATE: Mutex<PluginState> = Mutex::new(PluginState);

#[no_mangle]
pub extern "C" fn init_plugin() {{}}

#[no_mangle]
pub extern "C" fn on_load(_context: Context) -> Result<(), String> {{
    Ok(())
}}

#[no_mangle]
pub extern "C" fn on_unload(_context: Context) -> Result<(), String> {{
    Ok(())
}}

{dispatch}

{body}
"#,
        dispatch = dispatch,
        body = body,
    );

    Ok(code)
}

fn generate_empty_plugin(slug: &str) -> Result<String, AppError> {
    Ok(format!(
        r#"use pumpkin_plugin_api::*;
use std::sync::Mutex;

struct PluginState;

static STATE: Mutex<PluginState> = Mutex::new(PluginState);

#[no_mangle]
pub extern "C" fn init_plugin() {{}}

#[no_mangle]
pub extern "C" fn on_load(_context: Context) -> Result<(), String> {{
    tracing::info!("{slug} loaded");
    Ok(())
}}

#[no_mangle]
pub extern "C" fn on_unload(_context: Context) -> Result<(), String> {{
    tracing::info!("{slug} unloaded");
    Ok(())
}}

#[no_mangle]
pub extern "C" fn handle_event(
    _event_id: u32,
    _server: Server,
    event: Event,
) -> Event {{
    event
}}
"#
    ))
}

fn generate_event_dispatch(event_nodes: &[&FlowNode]) -> String {
    if event_nodes.is_empty() {
        return r#"#[no_mangle]
pub extern "C" fn handle_event(
    _event_id: u32,
    _server: Server,
    event: Event,
) -> Event {
    event
}"#.to_string();
    }

    let arms: Vec<String> = event_nodes.iter().map(|node| {
        let variant = flow_node_to_event_variant(&node.data.definition.node_id);
        let handler = format!("handle_{}", node.data.definition.node_id.replace('.', "_"));
        format!("        Event::{variant}(data) => {{\n            let server_instance = server.clone();\n            {handler}(data, server_instance);\n            Event::{variant}(data)\n        }}")
    }).collect();

    format!(
        r#"#[no_mangle]
pub extern "C" fn handle_event(
    _event_id: u32,
    server: Server,
    event: Event,
) -> Event {{
    match event {{
{arms}
        _ => event,
    }}
}}"#,
        arms = arms.join(",\n")
    )
}

fn generate_event_handler(
    event_node: &FlowNode,
    edges_by_source: &HashMap<String, Vec<&FlowEdge>>,
    all_nodes: &[FlowNode],
    handler_name: &str,
) -> Result<String, AppError> {
    let node_map: HashMap<&str, &FlowNode> = all_nodes.iter().map(|n| (n.id.as_str(), n)).collect();

    // Cycle detection: build adjacency list and detect cycles via DFS
    let adjacency: std::collections::HashMap<&str, Vec<&str>> = {
        let mut map: std::collections::HashMap<&str, Vec<&str>> = std::collections::HashMap::new();
        for edge in all_nodes.iter().flat_map(|n| edges_by_source.get(&n.id).into_iter().flatten()) {
            let is_exec = matches!(edge.target_handle.as_deref(), Some("exec-in") | Some("true") | Some("false") | None);
            if is_exec {
                map.entry(edge.source.as_str()).or_default().push(edge.target.as_str());
            }
        }
        map
    };

    let mut color: std::collections::HashMap<&str, u8> = std::collections::HashMap::new();
    for node in all_nodes {
        color.entry(node.id.as_str()).or_insert(0);
    }

    fn dfs_cycle<'a>(
        node: &'a str,
        adj: &std::collections::HashMap<&'a str, Vec<&'a str>>,
        color: &mut std::collections::HashMap<&'a str, u8>,
    ) -> Result<(), AppError> {
        *color.get_mut(node).unwrap() = 1; // gray = in progress
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
                    dfs_cycle(next, adj, color)?;
                }
            }
        }
        *color.get_mut(node).unwrap() = 2; // black = done
        Ok(())
    }

    for node in all_nodes {
        if *color.get(node.id.as_str()).unwrap_or(&0) == 0 {
            dfs_cycle(node.id.as_str(), &adjacency, &mut color)?;
        }
    }

    let mut statements = Vec::new();
    let mut visited = HashSet::new();
    let mut queue = VecDeque::new();

    if let Some(edges) = edges_by_source.get(&event_node.id) {
        // Find exec output edges (those targeting action/logic nodes via "true"/"false" or exec handles)
        for edge in edges {
            let is_exec = matches!(edge.target_handle.as_deref(), Some("exec-in") | Some("true") | Some("false") | None);
            if is_exec {
                queue.push_back(edge.target.clone());
            }
        }
    }

    while let Some(node_id) = queue.pop_front() {
        if !visited.insert(node_id.clone()) {
            continue;
        }
        if let Some(node) = node_map.get(node_id.as_str()) {
            statements.push(generate_node_code(node, edges_by_source, &node_map)?);
            // Enqueue downstream exec nodes
            if let Some(next_edges) = edges_by_source.get(&node.id) {
                for edge in next_edges {
                    let is_exec = matches!(edge.target_handle.as_deref(), Some("exec-in") | Some("true") | Some("false") | None);
                    if is_exec {
                        queue.push_back(edge.target.clone());
                    }
                }
            }
        }
    }

    Ok(format!(
        r#"fn {handler_name}(data: {event_type}, server: Server) {{
{statements}
}}"#,
        handler_name = handler_name,
        event_type = flow_node_to_event_type(&event_node.data.definition.node_id),
        statements = statements.iter().map(|s| format!("    {}", s.trim())).collect::<Vec<_>>().join("\n"),
    ))
}

fn generate_node_code(
    node: &FlowNode,
    edges_by_source: &HashMap<String, Vec<&FlowEdge>>,
    node_map: &HashMap<&str, &FlowNode>,
) -> Result<String, AppError> {
    let def = &node.data.definition;
    let values = &node.data.values;

    match def.node_id.as_str() {
        // ── Actions ──
        "action.broadcast" => {
            let msg = values.get("message")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            Ok(format!("let _ = server.broadcast(\"{}\");", escape_rust_string(msg)))
        }
        "action.send-message" => {
            let msg = values.get("message")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            Ok(format!("// send-message: {}\nlet _ = server.broadcast(\"{}\");", msg, escape_rust_string(msg)))
        }
        "action.execute-command" => {
            let cmd = values.get("command")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            Ok(format!("let _ = server.execute_command(\"{}\", server::CommandSender::Console);", escape_rust_string(cmd)))
        }
        "action.teleport" => {
            let x = values.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let y = values.get("y").and_then(|v| v.as_f64()).unwrap_or(64.0);
            let z = values.get("z").and_then(|v| v.as_f64()).unwrap_or(0.0);
            Ok(format!("// teleport to ({x}, {y}, {z})"))
        }
        "action.set-gamemode" => {
            let gamemode = values.get("gamemode")
                .and_then(|v| v.as_str())
                .unwrap_or("survival");
            Ok(format!("// set-gamemode: {gamemode}"))
        }
        "action.spawn-particle" => {
            let particle = values.get("particle")
                .and_then(|v| v.as_str())
                .unwrap_or("minecraft:flame");
            let x = values.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let y = values.get("y").and_then(|v| v.as_f64()).unwrap_or(64.0);
            let z = values.get("z").and_then(|v| v.as_f64()).unwrap_or(0.0);
            Ok(format!("// spawn-particle {particle} at ({x}, {y}, {z})"))
        }

        // ── Logic ──
        "logic.if" => {
            let cond_var = resolve_input_value(node, "condition", edges_by_source, node_map);
            Ok(format!("if {cond_var} {{\n    // TODO: then branch\n}} else {{\n    // TODO: else branch\n}}"))
        }
        "logic.compare-string" | "logic.compare-number" => {
            let a = resolve_input_value(node, "a", edges_by_source, node_map);
            let b = resolve_input_value(node, "b", edges_by_source, node_map);
            let op = values.get("operator")
                .and_then(|v| v.as_str())
                .unwrap_or("==");
            let var_name = format!("_cmp_{}", node.id.replace('-', "_"));
            Ok(format!("let {var_name} = {a} {op} {b};"))
        }

        // ── Default — reject unknown nodes ──
        _ => Err(AppError::UnprocessableEntity(format!(
            "unknown node type '{}' is not supported by the code generator",
            def.node_id
        ))),
    }
}

fn resolve_input_value(
    node: &FlowNode,
    param_id: &str,
    edges_by_source: &HashMap<String, Vec<&FlowEdge>>,
    node_map: &HashMap<&str, &FlowNode>,
) -> String {
    // Check if there's a connected data/logic node feeding this param
    for (source_id, source_edges) in edges_by_source {
        for edge in source_edges {
            if edge.target == node.id && edge.target_handle.as_deref() == Some(param_id) {
                if let Some(source_node) = node_map.get(source_id.as_str()) {
                    let sv = &source_node.data.values;
                    let def = &source_node.data.definition;
                    return match def.node_id.as_str() {
                        "data.string" => sv.get("value")
                            .and_then(|v| v.as_str())
                            .map(|s| format!("\"{}\"", escape_rust_string(s)))
                            .unwrap_or_else(|| "\"\"".to_string()),
                        "data.number" => sv.get("value")
                            .and_then(|v| v.as_f64())
                            .map(|n| n.to_string())
                            .unwrap_or_else(|| "0".to_string()),
                        "data.boolean" => sv.get("value")
                            .and_then(|v| v.as_bool())
                            .map(|b| b.to_string())
                            .unwrap_or_else(|| "false".to_string()),
                        _ => format!("/* value from {} */ true", def.node_id),
                    };
                }
            }
        }
    }
    // Fallback to literal from the node's own values
    if let Some(val) = node.data.values.get(param_id) {
        if let Some(s) = val.as_str() {
            return format!("\"{}\"", escape_rust_string(s));
        }
        if let Some(n) = val.as_f64() {
            return n.to_string();
        }
        if let Some(b) = val.as_bool() {
            return b.to_string();
        }
    }
    "true /* default */".to_string()
}

fn flow_node_to_event_variant(node_id: &str) -> &'static str {
    match node_id {
        "event.player-join" => "Event::PlayerJoinEvent",
        "event.player-leave" => "Event::PlayerLeaveEvent",
        "event.player-chat" => "Event::PlayerChatEvent",
        "event.player-interact" => "Event::PlayerInteractEvent",
        "event.block-break" => "Event::BlockBreakEvent",
        "event.player-move" => "Event::PlayerMoveEvent",
        _ => "event",
    }
}

fn flow_node_to_event_type(node_id: &str) -> &'static str {
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

fn escape_rust_string(s: &str) -> String {
    s.replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n")
        .replace('\r', "\\r")
        .replace('\t', "\\t")
}
