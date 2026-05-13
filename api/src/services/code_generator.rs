use std::collections::{HashMap, HashSet, VecDeque};

use crate::error::AppError;

use super::event_mapper;
use super::flow_types::{parse_flow, FlowEdge, FlowNode};


pub fn generate_rust_source(
    project_slug: &str,
    flow_json: &serde_json::Value,
) -> Result<String, AppError> {
    let flow = parse_flow(flow_json)?;

    if flow.nodes.is_empty() {
        return empty_plugin(project_slug);
    }

    let edges_by_source = build_edge_index(&flow.edges);
    let event_nodes: Vec<&FlowNode> = flow.nodes.iter().filter(|n| event_mapper::is_event_node(n)).collect();

    // Cycle detection
    build_exec_adjacency(&flow.nodes, &edges_by_source)?;

    let dispatch = generate_dispatch(&event_nodes, &edges_by_source, &flow.nodes)?;

    Ok(format!(
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
"#,
    ))
}

fn empty_plugin(slug: &str) -> Result<String, AppError> {
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

fn build_edge_index<'a>(edges: &'a [FlowEdge]) -> HashMap<&'a str, Vec<&'a FlowEdge>> {
    let mut map: HashMap<&str, Vec<&FlowEdge>> = HashMap::new();
    for edge in edges {
        map.entry(edge.source.as_str()).or_default().push(edge);
    }
    map
}

fn build_exec_adjacency(
    nodes: &[FlowNode],
    edges_by_source: &HashMap<&str, Vec<&FlowEdge>>,
) -> Result<(), AppError> {
    let node_ids: HashSet<&str> = nodes.iter().map(|n| n.id.as_str()).collect();
    let mut adj: HashMap<&str, Vec<&str>> = HashMap::new();

    for source_id in &node_ids {
        if let Some(edges) = edges_by_source.get(source_id) {
            for edge in edges.iter() {
                if is_exec_edge(edge) && node_ids.contains(edge.target.as_str()) {
                    adj.entry(source_id).or_default().push(edge.target.as_str());
                }
            }
        }
    }

    event_mapper::detect_cycle(&adj)
}

fn is_exec_edge(edge: &FlowEdge) -> bool {
    matches!(
        edge.target_handle.as_deref(),
        Some("exec-in") | Some("true") | Some("false") | None
    )
}

fn generate_dispatch(
    event_nodes: &[&FlowNode],
    edges_by_source: &HashMap<&str, Vec<&FlowEdge>>,
    all_nodes: &[FlowNode],
) -> Result<String, AppError> {
    if event_nodes.is_empty() {
        return Ok(r#"#[no_mangle]
pub extern "C" fn handle_event(
    _event_id: u32,
    _server: Server,
    event: Event,
) -> Event {
    event
}"#.to_string());
    }

    let node_map: HashMap<&str, &FlowNode> = all_nodes.iter().map(|n| (n.id.as_str(), n)).collect();
    let mut handler_bodies = String::new();
    let mut arms = Vec::new();

    for event_node in event_nodes {
        let variant = event_mapper::event_variant(&event_node.data.definition.node_id);
        let handler_name = format!("handle_{}", event_node.id.replace('-', "_"));
        let event_type = event_mapper::event_type(&event_node.data.definition.node_id);

        arms.push(format!(
            "        Event::{variant}(data) => {{\n            let server_instance = server.clone();\n            {handler_name}(data, server_instance);\n            Event::{variant}(data)\n        }}"
        ));

        handler_bodies.push_str(&generate_handler_body(event_node, handler_name, event_type, edges_by_source, &node_map)?);
    }

    let arms_str = arms.join(",\n");
    Ok(format!(
        r#"#[no_mangle]
pub extern "C" fn handle_event(
    _event_id: u32,
    server: Server,
    event: Event,
) -> Event {{
    match event {{
{arms_str}
        _ => event,
    }}
}}

{handler_bodies}"#,
    ))
}

fn generate_handler_body(
    event_node: &FlowNode,
    handler_name: String,
    event_type: &str,
    edges_by_source: &HashMap<&str, Vec<&FlowEdge>>,
    node_map: &HashMap<&str, &FlowNode>,
) -> Result<String, AppError> {
    let mut statements = Vec::new();
    let mut visited = HashSet::new();
    let mut queue = VecDeque::new();

    if let Some(edges) = edges_by_source.get(event_node.id.as_str()) {
        for edge in edges.iter() {
            if is_exec_edge(edge) {
                queue.push_back(edge.target.as_str());
            }
        }
    }

    while let Some(node_id) = queue.pop_front() {
        if !visited.insert(node_id) {
            continue;
        }
        if let Some(node) = node_map.get(node_id) {
            statements.push(generate_statement(node, edges_by_source, node_map)?);
            if let Some(edges) = edges_by_source.get(node.id.as_str()) {
                for edge in edges.iter() {
                    if is_exec_edge(edge) {
                        queue.push_back(edge.target.as_str());
                    }
                }
            }
        }
    }

    Ok(format!(
        "fn {handler_name}(_data: {event_type}, _server: Server) {{\n    let _ = _data;\n{}}}",
        statements.join("\n")
    ))
}

fn generate_statement(
    node: &FlowNode,
    edges_by_source: &HashMap<&str, Vec<&FlowEdge>>,
    node_map: &HashMap<&str, &FlowNode>,
) -> Result<String, AppError> {
    let def = &node.data.definition;
    let values = &node.data.values;

    Ok(match def.node_id.as_str() {
        "action.broadcast" => {
            let msg = values.get("message").and_then(|v| v.as_str()).unwrap_or("");
            format!("    let _ = _server.broadcast(\"{}\");", esc(msg))
        }
        "action.send-message" => {
            let msg = values.get("message").and_then(|v| v.as_str()).unwrap_or("");
            format!("    let _ = _server.broadcast(\"{}\");", esc(msg))
        }
        "action.execute-command" => {
            let cmd = values.get("command").and_then(|v| v.as_str()).unwrap_or("");
            format!("    let _ = _server.execute_command(\"{}\", server::CommandSender::Console);", esc(cmd))
        }
        "action.teleport" => format!("    // teleport action (stub)"),
        "action.set-gamemode" => {
            let gm = values.get("gamemode").and_then(|v| v.as_str()).unwrap_or("survival");
            format!("    // set-gamemode: {gm}")
        }
        "action.spawn-particle" => {
            let p = values.get("particle").and_then(|v| v.as_str()).unwrap_or("flame");
            format!("    // spawn-particle: {p}")
        }
        "logic.if" => {
            let cond = resolve_value(node, "condition", edges_by_source, node_map);
            format!("    if {cond} {{\n        // then\n    }} else {{\n        // else\n    }}")
        }
        "logic.compare-string" | "logic.compare-number" => {
            let a = resolve_value(node, "a", edges_by_source, node_map);
            let b = resolve_value(node, "b", edges_by_source, node_map);
            let op = values.get("operator").and_then(|v| v.as_str()).unwrap_or("==");
            format!("    let _cmp = {a} {op} {b};")
        }
        "data.string" | "data.number" | "data.boolean" | "data.player" => String::new(),
        "math.add" | "math.subtract" | "math.multiply" | "math.divide" => {
            let a = resolve_value(node, "a", edges_by_source, node_map);
            let b = resolve_value(node, "b", edges_by_source, node_map);
            let op = match def.node_id.as_str() {
                "math.add" => "+", "math.subtract" => "-",
                "math.multiply" => "*", "math.divide" => "/",
                _ => "+",
            };
            format!("    let _math_result = {a} {op} {b};")
        }
        n => return Err(AppError::UnprocessableEntity(format!(
            "unknown node type '{n}' is not supported by the code generator"
        ))),
    })
}

fn resolve_value(
    node: &FlowNode,
    param_id: &str,
    edges_by_source: &HashMap<&str, Vec<&FlowEdge>>,
    node_map: &HashMap<&str, &FlowNode>,
) -> String {
    for (source_id, source_edges) in edges_by_source {
        for edge in source_edges.iter() {
            if edge.target == node.id && edge.target_handle.as_deref() == Some(param_id) {
                if let Some(source_node) = node_map.get(source_id) {
                    let sv = &source_node.data.values;
                    return match source_node.data.definition.node_id.as_str() {
                        "data.string" => sv.get("value")
                            .and_then(|v| v.as_str())
                            .map(|s| format!("\"{}\"", esc(s)))
                            .unwrap_or_else(|| "\"\"".to_string()),
                        "data.number" => sv.get("value")
                            .and_then(|v| v.as_f64())
                            .map(|n| n.to_string())
                            .unwrap_or_else(|| "0".to_string()),
                        "data.boolean" => sv.get("value")
                            .and_then(|v| v.as_bool())
                            .map(|b| b.to_string())
                            .unwrap_or_else(|| "false".to_string()),
                        _ => "true".to_string(),
                    };
                }
            }
        }
    }
    if let Some(val) = node.data.values.get(param_id) {
        if let Some(s) = val.as_str() {
            return format!("\"{}\"", esc(s));
        }
        if let Some(n) = val.as_f64() {
            return n.to_string();
        }
        if let Some(b) = val.as_bool() {
            return b.to_string();
        }
    }
    "true".to_string()
}

fn esc(s: &str) -> String {
    s.replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n")
}
