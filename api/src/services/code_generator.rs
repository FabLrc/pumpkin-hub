use std::collections::{HashMap, HashSet, VecDeque};

use crate::error::AppError;

use super::event_mapper;
use super::flow_types::{parse_flow, FlowEdge, FlowNode};

/// Variable scope mapping (node+output) → Rust expression.
/// Key: (node_id, output_id). Value: Rust expression (e.g. "_data.player", "_n_abc_math").
type VarScope = HashMap<(String, String), String>;

pub fn generate_rust_source(
    project_slug: &str,
    flow_json: &serde_json::Value,
) -> Result<String, AppError> {
    let flow = parse_flow(flow_json)?;

    if flow.nodes.is_empty() {
        return empty_plugin(project_slug);
    }

    let edges_by_source = build_edge_index(&flow.edges);
    let event_nodes: Vec<&FlowNode> = flow
        .nodes
        .iter()
        .filter(|n| event_mapper::is_event_node(n))
        .collect();

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

fn build_edge_index(edges: &[FlowEdge]) -> HashMap<&str, Vec<&FlowEdge>> {
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
}"#
        .to_string());
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

        handler_bodies.push_str(&generate_handler_body(
            event_node,
            handler_name,
            event_type,
            edges_by_source,
            &node_map,
        )?);
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
    let mut scope: VarScope = HashMap::new();

    // Populate scope with event data fields reachable via data edges
    if let Some(event_edges) = edges_by_source.get(event_node.id.as_str()) {
        for edge in event_edges {
            if !is_exec_edge(edge) {
                if let Some(ref handle) = edge.source_handle {
                    let expr = format!("_data.{}", handle);
                    scope.insert((event_node.id.clone(), handle.clone()), expr);
                }
            }
        }
    }

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
            let stmt = generate_statement(node, edges_by_source, node_map, &mut scope)?;
            if !stmt.is_empty() {
                statements.push(stmt);
            }
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
        "fn {handler_name}(_data: {event_type}, _server: Server) {{\n{}}}",
        statements.join("\n")
    ))
}

fn generate_statement(
    node: &FlowNode,
    edges_by_source: &HashMap<&str, Vec<&FlowEdge>>,
    node_map: &HashMap<&str, &FlowNode>,
    scope: &mut VarScope,
) -> Result<String, AppError> {
    let def = &node.data.definition;

    Ok(match def.node_id.as_str() {
        "action.broadcast" => {
            let msg = resolve_value(node, "message", edges_by_source, node_map, scope);
            format!("    let _ = _server.broadcast({msg});")
        }
        "action.send-message" => {
            let msg = resolve_value(node, "message", edges_by_source, node_map, scope);
            let player = resolve_value(node, "player", edges_by_source, node_map, scope);
            format!("    let _ = _server.send_message({player}, {msg});")
        }
        "action.execute-command" => {
            let cmd = resolve_value(node, "command", edges_by_source, node_map, scope);
            format!("    let _ = _server.execute_command({cmd}, server::CommandSender::Console);")
        }
        "action.teleport" => {
            let player = resolve_value(node, "player", edges_by_source, node_map, scope);
            let x = resolve_value(node, "x", edges_by_source, node_map, scope);
            let y = resolve_value(node, "y", edges_by_source, node_map, scope);
            let z = resolve_value(node, "z", edges_by_source, node_map, scope);
            format!("    // teleport {player} to ({x}, {y}, {z})")
        }
        "action.set-gamemode" => {
            let player = resolve_value(node, "player", edges_by_source, node_map, scope);
            let gm = resolve_value(node, "gamemode", edges_by_source, node_map, scope);
            format!("    // set-gamemode {player} → {gm}")
        }
        "action.spawn-particle" => {
            let particle = resolve_value(node, "particle", edges_by_source, node_map, scope);
            let x = resolve_value(node, "x", edges_by_source, node_map, scope);
            let y = resolve_value(node, "y", edges_by_source, node_map, scope);
            let z = resolve_value(node, "z", edges_by_source, node_map, scope);
            format!("    // spawn-particle {particle} at ({x}, {y}, {z})")
        }
        "logic.and" | "logic.or" => {
            let a = resolve_value(node, "a", edges_by_source, node_map, scope);
            let b = resolve_value(node, "b", edges_by_source, node_map, scope);
            let op = if def.node_id == "logic.and" {
                "&&"
            } else {
                "||"
            };
            let var = format!("_n_{}_logic", node.id.replace('-', "_"));
            scope.insert((node.id.clone(), "result".to_string()), var.clone());
            format!("    let {var} = {a} {op} {b};")
        }
        "logic.compare-string" | "logic.compare-number" => {
            let a = resolve_value(node, "a", edges_by_source, node_map, scope);
            let b = resolve_value(node, "b", edges_by_source, node_map, scope);
            let op = node
                .data
                .values
                .get("operator")
                .and_then(|v| v.as_str())
                .unwrap_or("==");
            let var = format!("_n_{}_cmp", node.id.replace('-', "_"));
            scope.insert((node.id.clone(), "result".to_string()), var.clone());
            format!("    let {var} = {a} {op} {b};")
        }
        "logic.if" => {
            let cond = resolve_value(node, "condition", edges_by_source, node_map, scope);
            format!("    if {cond} {{\n        // then\n    }} else {{\n        // else\n    }}")
        }
        "data.string" | "data.number" | "data.boolean" | "data.player" => String::new(),
        "math.add" | "math.subtract" | "math.multiply" | "math.divide" => {
            let a = resolve_value(node, "a", edges_by_source, node_map, scope);
            let b = resolve_value(node, "b", edges_by_source, node_map, scope);
            let op = match def.node_id.as_str() {
                "math.add" => "+",
                "math.subtract" => "-",
                "math.multiply" => "*",
                "math.divide" => "/",
                _ => "+",
            };
            let var = format!("_n_{}_math", node.id.replace('-', "_"));
            scope.insert((node.id.clone(), "result".to_string()), var.clone());
            format!("    let {var} = {a} {op} {b};")
        }
        n => {
            return Err(AppError::UnprocessableEntity(format!(
                "unknown node type '{n}' is not supported by the code generator"
            )))
        }
    })
}

fn resolve_value(
    node: &FlowNode,
    param_id: &str,
    edges_by_source: &HashMap<&str, Vec<&FlowEdge>>,
    node_map: &HashMap<&str, &FlowNode>,
    scope: &VarScope,
) -> String {
    for (source_id, source_edges) in edges_by_source {
        for edge in source_edges.iter() {
            if edge.target == node.id && edge.target_handle.as_deref() == Some(param_id) {
                if let Some(source_node) = node_map.get(source_id) {
                    // Check scope first (event outputs, intermediate results)
                    if let Some(ref handle) = edge.source_handle {
                        if let Some(expr) = scope.get(&(source_id.to_string(), handle.clone())) {
                            return expr.clone();
                        }
                    }

                    // Fall back to data node literal values
                    let sv = &source_node.data.values;
                    return match source_node.data.definition.node_id.as_str() {
                        "data.string" => {
                            let raw = sv.get("value").and_then(|v| v.as_str()).unwrap_or("");
                            apply_template(raw, scope)
                        }
                        "data.number" => sv
                            .get("value")
                            .and_then(|v| v.as_f64())
                            .map(|n| n.to_string())
                            .unwrap_or_else(|| "0".to_string()),
                        "data.boolean" => sv
                            .get("value")
                            .and_then(|v| v.as_bool())
                            .map(|b| b.to_string())
                            .unwrap_or_else(|| "false".to_string()),
                        _ => "true".to_string(),
                    };
                }
            }
        }
    }
    // Fall back to node's own literal values
    if let Some(val) = node.data.values.get(param_id) {
        if let Some(s) = val.as_str() {
            return apply_template(s, scope);
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

/// Replace `{variable}` patterns in a string with Rust expressions from scope.
/// Produces either a string literal or a `format!(...)` call.
fn apply_template(s: &str, scope: &VarScope) -> String {
    let mut vars: Vec<String> = Vec::new();
    let mut fmt = String::new();
    let mut rest = s;

    while let Some(start) = rest.find('{') {
        if let Some(end) = rest[start..].find('}') {
            let literal = &rest[..start];
            for ch in literal.chars() {
                match ch {
                    '\\' => fmt.push_str("\\\\"),
                    '"' => fmt.push_str("\\\""),
                    '\n' => fmt.push_str("\\n"),
                    '{' | '}' => {
                        fmt.push(ch);
                        fmt.push(ch);
                    }
                    c => fmt.push(c),
                }
            }

            let var_name = &rest[start + 1..start + end];
            if let Some(expr) = scope_lookup(scope, var_name) {
                vars.push(expr);
                fmt.push_str("{}");
            } else {
                fmt.push('{');
                fmt.push_str(var_name);
                fmt.push('}');
            }

            rest = &rest[start + end + 1..];
        } else {
            break;
        }
    }

    for ch in rest.chars() {
        match ch {
            '\\' => fmt.push_str("\\\\"),
            '"' => fmt.push_str("\\\""),
            '\n' => fmt.push_str("\\n"),
            '{' | '}' => {
                fmt.push(ch);
                fmt.push(ch);
            }
            c => fmt.push(c),
        }
    }

    if vars.is_empty() {
        format!("\"{fmt}\"")
    } else {
        format!("format!(\"{}\", {})", fmt, vars.join(", "))
    }
}

/// Find a scope entry by output_id (returns the first match).
fn scope_lookup(scope: &VarScope, output_id: &str) -> Option<String> {
    for ((_node_id, out_id), expr) in scope {
        if out_id == output_id {
            return Some(expr.clone());
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn n(id: &str, node_type: &str, node_id: &str, values: serde_json::Value) -> serde_json::Value {
        let (cat, params, outputs) = match node_id {
            "event.player-join" => (
                "event",
                serde_json::json!([]),
                serde_json::json!([{"id":"player","output_type":"player"}]),
            ),
            "action.send-message" => (
                "action",
                serde_json::json!([
                    {"id":"player","param_type":"player","required":true},
                    {"id":"message","param_type":"string","required":true}
                ]),
                serde_json::json!([]),
            ),
            "action.broadcast" => (
                "action",
                serde_json::json!([
                    {"id":"message","param_type":"string","required":true}
                ]),
                serde_json::json!([]),
            ),
            "data.string" => (
                "data",
                serde_json::json!([
                    {"id":"value","param_type":"string","required":true}
                ]),
                serde_json::json!([{"id":"value","output_type":"string"}]),
            ),
            "math.add" | "math.subtract" | "math.multiply" | "math.divide" => (
                "math",
                serde_json::json!([
                    {"id":"a","param_type":"number","required":true},
                    {"id":"b","param_type":"number","required":true}
                ]),
                serde_json::json!([{"id":"result","output_type":"number"}]),
            ),
            _ => ("data", serde_json::json!([]), serde_json::json!([])),
        };
        serde_json::json!({
            "id": id,
            "type": node_type,
            "data": {
                "definition": {
                    "node_id": node_id,
                    "category": cat,
                    "parameters": params,
                    "outputs": outputs
                },
                "values": values
            }
        })
    }

    fn e(
        source: &str,
        target: &str,
        source_handle: serde_json::Value,
        target_handle: serde_json::Value,
    ) -> serde_json::Value {
        serde_json::json!({"source": source, "target": target, "sourceHandle": source_handle, "targetHandle": target_handle})
    }

    #[test]
    fn event_output_bound_to_action_param() {
        let flow = serde_json::json!({
            "nodes": [
                n("ev1", "event", "event.player-join", serde_json::json!({})),
                n("act1", "action", "action.send-message", serde_json::json!({"message": "Welcome {player}!"}))
            ],
            "edges": [
                e("ev1", "act1", serde_json::json!("exec"), serde_json::json!(null)),
                e("ev1", "act1", serde_json::json!("player"), serde_json::json!("player"))
            ]
        });

        let result = generate_rust_source("test-plugin", &flow).unwrap();
        assert!(
            result.contains("_data.player"),
            "should reference _data.player for the player param"
        );
        assert!(
            result.contains("format!"),
            "should use format! for template string"
        );
        assert!(result.contains("send_message"), "should use send_message");
    }

    #[test]
    fn data_node_literal_value() {
        let flow = serde_json::json!({
            "nodes": [
                n("ev1", "event", "event.player-join", serde_json::json!({})),
                n("ds1", "data", "data.string", serde_json::json!({"value": "Hello from data node"})),
                n("act1", "action", "action.broadcast", serde_json::json!({}))
            ],
            "edges": [
                e("ev1", "act1", serde_json::json!("exec"), serde_json::json!(null)),
                e("ds1", "act1", serde_json::json!("value"), serde_json::json!("message"))
            ]
        });

        let result = generate_rust_source("test-plugin", &flow).unwrap();
        assert!(
            result.contains("Hello from data node"),
            "should inline data node value"
        );
    }

    #[test]
    fn plain_literal_value_no_template() {
        let flow = serde_json::json!({
            "nodes": [
                n("ev1", "event", "event.player-join", serde_json::json!({})),
                n("act1", "action", "action.broadcast", serde_json::json!({"message": "Hello everyone!"}))
            ],
            "edges": [
                e("ev1", "act1", serde_json::json!("exec"), serde_json::json!(null))
            ]
        });

        let result = generate_rust_source("test-plugin", &flow).unwrap();
        assert!(
            result.contains("\"Hello everyone!\""),
            "should keep literal string unchanged"
        );
    }

    #[test]
    fn math_node_result_referenced() {
        let flow = serde_json::json!({
            "nodes": [
                n("ev1", "event", "event.player-join", serde_json::json!({})),
                n("m1", "math", "math.add", serde_json::json!({"a": 10, "b": 20})),
                n("m2", "math", "math.multiply", serde_json::json!({"b": 5}))
            ],
            "edges": [
                e("ev1", "m1", serde_json::json!("exec"), serde_json::json!(null)),
                e("m1", "m2", serde_json::json!("exec"), serde_json::json!(null)),
                e("m1", "m2", serde_json::json!("result"), serde_json::json!("a"))
            ]
        });

        let result = generate_rust_source("test-plugin", &flow).unwrap();
        assert!(
            result.contains("let _n_m1_math = 10 + 20;"),
            "first math: literal a + literal b"
        );
        assert!(
            result.contains("let _n_m2_math = _n_m1_math * 5;"),
            "second math: scope result * literal b"
        );
    }

    #[test]
    fn no_event_output_edges_no_destructuring() {
        let flow = serde_json::json!({
            "nodes": [
                n("ev1", "event", "event.player-join", serde_json::json!({})),
                n("act1", "action", "action.broadcast", serde_json::json!({"message": "just a broadcast"}))
            ],
            "edges": [
                e("ev1", "act1", serde_json::json!("exec"), serde_json::json!(null))
            ]
        });

        let result = generate_rust_source("test-plugin", &flow).unwrap();
        assert!(result.contains("just a broadcast"));
    }
}
