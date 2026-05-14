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
            if node.data.definition.node_id == "logic.if" {
                let branch_stmt =
                    generate_if_branch(node, edges_by_source, node_map, &mut scope, &mut visited)?;
                if !branch_stmt.is_empty() {
                    statements.push(branch_stmt);
                }
            } else {
                let stmt = generate_statement(node, edges_by_source, node_map, &mut scope)?;
                if !stmt.is_empty() {
                    statements.push(stmt);
                }
                if let Some(edges) = edges_by_source.get(node.id.as_str()) {
                    for edge in edges.iter() {
                        if is_exec_edge(edge) && !visited.contains(edge.target.as_str()) {
                            queue.push_back(edge.target.as_str());
                        }
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

/// Generates the full if/else block for a logic.if node, including recursive
/// branch generation for true and false paths.
fn generate_if_branch<'a>(
    node: &'a FlowNode,
    edges_by_source: &HashMap<&'a str, Vec<&'a FlowEdge>>,
    node_map: &HashMap<&'a str, &'a FlowNode>,
    scope: &mut VarScope,
    parent_visited: &mut HashSet<&'a str>,
) -> Result<String, AppError> {
    let cond = resolve_value(node, "condition", edges_by_source, node_map, scope);

    let true_starts: Vec<&str> = edges_by_source
        .get(node.id.as_str())
        .map(|edges| {
            edges
                .iter()
                .filter(|e| e.source_handle.as_deref() == Some("true"))
                .map(|e| e.target.as_str())
                .collect()
        })
        .unwrap_or_default();

    let false_starts: Vec<&str> = edges_by_source
        .get(node.id.as_str())
        .map(|edges| {
            edges
                .iter()
                .filter(|e| e.source_handle.as_deref() == Some("false"))
                .map(|e| e.target.as_str())
                .collect()
        })
        .unwrap_or_default();

    let true_body = generate_branch_chain(
        &true_starts,
        edges_by_source,
        node_map,
        scope,
        parent_visited,
    )?;
    let false_body = generate_branch_chain(
        &false_starts,
        edges_by_source,
        node_map,
        scope,
        parent_visited,
    )?;

    let true_block = if true_body.is_empty() {
        String::new()
    } else {
        format!("\n{}", true_body)
    };

    let false_block = if false_body.is_empty() {
        String::new()
    } else {
        format!("\n{}", false_body)
    };

    Ok(format!(
        "    if {cond} {{{true_block}\n    }} else {{{false_block}\n    }}"
    ))
}

/// Generates a linear sequence of statements starting from the given node IDs,
/// following exec edges. Used for true/false branches inside if blocks.
fn generate_branch_chain<'a>(
    start_ids: &[&'a str],
    edges_by_source: &HashMap<&'a str, Vec<&'a FlowEdge>>,
    node_map: &HashMap<&'a str, &'a FlowNode>,
    scope: &mut VarScope,
    parent_visited: &mut HashSet<&'a str>,
) -> Result<String, AppError> {
    let mut statements = Vec::new();
    let mut visited = HashSet::new();
    let mut queue: VecDeque<&str> = start_ids.iter().copied().collect();

    while let Some(node_id) = queue.pop_front() {
        if !visited.insert(node_id) {
            continue;
        }
        parent_visited.insert(node_id);
        if let Some(node) = node_map.get(node_id) {
            if node.data.definition.node_id == "logic.if" {
                let branch_stmt =
                    generate_if_branch(node, edges_by_source, node_map, scope, parent_visited)?;
                if !branch_stmt.is_empty() {
                    statements.push(branch_stmt);
                }
                continue;
            }
            let stmt = generate_statement(node, edges_by_source, node_map, scope)?;
            if !stmt.is_empty() {
                statements.push(stmt);
            }
            if let Some(edges) = edges_by_source.get(node.id.as_str()) {
                for edge in edges.iter() {
                    if is_exec_edge(edge) && !visited.contains(edge.target.as_str()) {
                        queue.push_back(edge.target.as_str());
                    }
                }
            }
        }
    }

    Ok(statements.join("\n"))
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
            format!(
                "    let _msg_{} = {};\n    let _ = _server.broadcast(&_msg_{});",
                node.id.replace('-', "_"),
                msg,
                node.id.replace('-', "_")
            )
        }
        "action.send-message" => {
            let msg = resolve_value(node, "message", edges_by_source, node_map, scope);
            let player = resolve_value(node, "player", edges_by_source, node_map, scope);
            format!(
                "    let _msg_{id} = {msg};\n    let _tmp_{id} = text::TextComponent::text(&_msg_{id});\n    let _ = {player}.send_system_message(&_tmp_{id}, false);",
                id = node.id.replace('-', "_")
            )
        }
        "action.execute-command" => {
            let cmd = resolve_value(node, "command", edges_by_source, node_map, scope);
            format!("    let _cmd_{} = {cmd};\n    let _ = _server.execute_command(&_cmd_{}, &server::CommandSender::Console);",
                node.id.replace('-', "_"),
                node.id.replace('-', "_"))
        }
        "action.teleport" => {
            let player = resolve_value(node, "player", edges_by_source, node_map, scope);
            let x = resolve_value(node, "x", edges_by_source, node_map, scope);
            let y = resolve_value(node, "y", edges_by_source, node_map, scope);
            let z = resolve_value(node, "z", edges_by_source, node_map, scope);
            format!(
                "    let _ = {player}.teleport(({x} as f64, {y} as f64, {z} as f64), None, None, &{player}.get_world());"
            )
        }
        "action.set-gamemode" => {
            let player = resolve_value(node, "player", edges_by_source, node_map, scope);
            let gm = resolve_value(node, "gamemode", edges_by_source, node_map, scope);
            format!(
                "    let _ = {player}.set_gamemode(match {gm} {{\"survival\" => common::GameMode::Survival,\"creative\" => common::GameMode::Creative,\"adventure\" => common::GameMode::Adventure,\"spectator\" => common::GameMode::Spectator,_ => common::GameMode::Survival}});"
            )
        }
        "action.spawn-particle" => {
            let particle = resolve_value(node, "particle", edges_by_source, node_map, scope);
            let x = resolve_value(node, "x", edges_by_source, node_map, scope);
            let y = resolve_value(node, "y", edges_by_source, node_map, scope);
            let z = resolve_value(node, "z", edges_by_source, node_map, scope);
            format!(
                "    let _part_{id} = {particle};\n    let _pos_{id} = ({x} as f64, {y} as f64, {z} as f64);\n    let _world_{id} = /* TODO: obtain world reference */;\n    let _ = _world_{id}.spawn_particle(&_part_{id}, _pos_{id}, (0.0, 0.0, 0.0), 0.0, 1);",
                id = node.id.replace('-', "_")
            )
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
        "logic.if" => String::new(),
        "data.string" | "data.number" | "data.boolean" | "data.player" | "data.player-name"
        | "data.player-uuid" | "data.format-text" => String::new(),
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
                    if let Some(ref handle) = edge.source_handle {
                        if let Some(expr) = scope.get(&(source_id.to_string(), handle.clone())) {
                            return expr.clone();
                        }
                    }

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
                        "data.player-name" => {
                            let player = resolve_value(
                                source_node,
                                "player",
                                edges_by_source,
                                node_map,
                                scope,
                            );
                            format!("{player}.get_name()")
                        }
                        "data.player-uuid" => {
                            let player = resolve_value(
                                source_node,
                                "player",
                                edges_by_source,
                                node_map,
                                scope,
                            );
                            format!("{player}.get_id()")
                        }
                        "data.format-text" => {
                            resolve_format_text(source_node, edges_by_source, node_map, scope)
                        }
                        _ => "true".to_string(),
                    };
                }
            }
        }
    }
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

/// Resolves a `data.format-text` node into a Rust expression.
/// Parses `{slot}` patterns in the template, resolves each slot via the edge
/// connected to that target handle, and emits a `format!(...)` call (or a
/// plain string literal if there are no slots).
fn resolve_format_text(
    node: &FlowNode,
    edges_by_source: &HashMap<&str, Vec<&FlowEdge>>,
    node_map: &HashMap<&str, &FlowNode>,
    scope: &VarScope,
) -> String {
    let template = node
        .data
        .values
        .get("template")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let mut fmt = String::new();
    let mut args: Vec<String> = Vec::new();
    let mut chars = template.chars().peekable();

    while let Some(c) = chars.next() {
        match c {
            '{' => {
                if chars.peek() == Some(&'{') {
                    chars.next();
                    fmt.push_str("{{");
                    continue;
                }
                let mut name = String::new();
                let mut found_close = false;
                while let Some(&nc) = chars.peek() {
                    if nc == '}' {
                        chars.next();
                        found_close = true;
                        break;
                    }
                    if !nc.is_alphanumeric() && nc != '_' {
                        break;
                    }
                    name.push(nc);
                    chars.next();
                }
                if !found_close || name.is_empty() {
                    fmt.push_str("{{");
                    for ch in name.chars() {
                        fmt.push(ch);
                    }
                    if !found_close && chars.peek().is_none() {
                        // unclosed brace at end of input — leave as is
                    }
                    continue;
                }
                let has_edge = edges_by_source.iter().any(|(_, edges)| {
                    edges.iter().any(|e| {
                        e.target == node.id && e.target_handle.as_deref() == Some(&name)
                    })
                });
                let expr = if has_edge {
                    resolve_value(node, &name, edges_by_source, node_map, scope)
                } else {
                    "\"\"".to_string()
                };
                args.push(expr);
                fmt.push_str("{}");
            }
            '}' => {
                if chars.peek() == Some(&'}') {
                    chars.next();
                }
                fmt.push_str("}}");
            }
            '\\' => fmt.push_str("\\\\"),
            '"' => fmt.push_str("\\\""),
            '\n' => fmt.push_str("\\n"),
            ch => fmt.push(ch),
        }
    }

    if args.is_empty() {
        // No interpolation — emit a plain string literal.
        // Undo the format!-style `{{` `}}` doubling.
        let literal = fmt.replace("{{", "{").replace("}}", "}");
        format!("\"{}\"", literal)
    } else {
        format!("format!(\"{}\", {})", fmt, args.join(", "))
    }
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
            "data.player-name" => (
                "data",
                serde_json::json!([
                    {"id":"player","param_type":"player","required":true}
                ]),
                serde_json::json!([{"id":"value","output_type":"string"}]),
            ),
            "data.player-uuid" => (
                "data",
                serde_json::json!([
                    {"id":"player","param_type":"player","required":true}
                ]),
                serde_json::json!([{"id":"value","output_type":"string"}]),
            ),
            "data.format-text" => (
                "data",
                serde_json::json!([
                    {"id":"template","param_type":"string","required":true}
                ]),
                serde_json::json!([{"id":"value","output_type":"string"}]),
            ),
            "logic.if" => (
                "logic",
                serde_json::json!([
                    {"id":"condition","param_type":"boolean","required":true}
                ]),
                serde_json::json!([]),
            ),
            "math.add" | "math.subtract" | "math.multiply" | "math.divide" => (
                "math",
                serde_json::json!([
                    {"id":"a","param_type":"number","required":true},
                    {"id":"b","param_type":"number","required":true}
                ]),
                serde_json::json!([{"id":"result","output_type":"number"}]),
            ),
            "action.execute-command" => (
                "action",
                serde_json::json!([
                    {"id":"command","param_type":"string","required":true}
                ]),
                serde_json::json!([]),
            ),
            "action.teleport" => (
                "action",
                serde_json::json!([
                    {"id":"player","param_type":"player","required":true},
                    {"id":"x","param_type":"number","required":true},
                    {"id":"y","param_type":"number","required":true},
                    {"id":"z","param_type":"number","required":true}
                ]),
                serde_json::json!([]),
            ),
            "action.set-gamemode" => (
                "action",
                serde_json::json!([
                    {"id":"player","param_type":"player","required":true},
                    {"id":"gamemode","param_type":"select","required":true}
                ]),
                serde_json::json!([]),
            ),
            "action.spawn-particle" => (
                "action",
                serde_json::json!([
                    {"id":"particle","param_type":"string","required":true},
                    {"id":"x","param_type":"number","required":true},
                    {"id":"y","param_type":"number","required":true},
                    {"id":"z","param_type":"number","required":true}
                ]),
                serde_json::json!([]),
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
    fn action_send_message_uses_correct_wit() {
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
            result.contains("send_system_message"),
            "should use player.send_system_message (WIT-correct)"
        );
        assert!(
            result.contains("TextComponent::text"),
            "should wrap message in TextComponent"
        );
        assert!(
            !result.contains("send_message"),
            "should NOT use _server.send_message (not in WIT)"
        );
    }

    #[test]
    fn action_broadcast_correct_wit() {
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
        assert!(result.contains("broadcast"), "should use server.broadcast");
        assert!(
            result.contains("\"Hello everyone!\""),
            "should keep literal string"
        );
    }

    #[test]
    fn action_teleport_emits_real_rust() {
        let flow = serde_json::json!({
            "nodes": [
                n("ev1", "event", "event.player-join", serde_json::json!({})),
                n("tp1", "action", "action.teleport", serde_json::json!({"player": "", "x": 100, "y": 64, "z": 200}))
            ],
            "edges": [
                e("ev1", "tp1", serde_json::json!("exec"), serde_json::json!(null)),
                e("ev1", "tp1", serde_json::json!("player"), serde_json::json!("player"))
            ]
        });

        let result = generate_rust_source("test-plugin", &flow).unwrap();
        assert!(result.contains("teleport"), "should emit teleport call");
        assert!(result.contains("get_world"), "should get world from player");
        assert!(!result.contains("// teleport"), "should NOT be a comment");
    }

    #[test]
    fn action_set_gamemode_emits_real_rust() {
        let flow = serde_json::json!({
            "nodes": [
                n("ev1", "event", "event.player-join", serde_json::json!({})),
                n("gm1", "action", "action.set-gamemode", serde_json::json!({"player": "", "gamemode": "creative"}))
            ],
            "edges": [
                e("ev1", "gm1", serde_json::json!("exec"), serde_json::json!(null)),
                e("ev1", "gm1", serde_json::json!("player"), serde_json::json!("player"))
            ]
        });

        let result = generate_rust_source("test-plugin", &flow).unwrap();
        assert!(
            result.contains("set_gamemode"),
            "should emit set_gamemode call"
        );
        assert!(
            result.contains("common::GameMode::Creative"),
            "should map creative to GameMode enum"
        );
        assert!(
            !result.contains("// set-gamemode"),
            "should NOT be a comment"
        );
    }

    #[test]
    fn action_execute_command_uses_command_sender() {
        let flow = serde_json::json!({
            "nodes": [
                n("ev1", "event", "event.player-join", serde_json::json!({})),
                n("cmd1", "action", "action.execute-command", serde_json::json!({"command": "say hello"}))
            ],
            "edges": [
                e("ev1", "cmd1", serde_json::json!("exec"), serde_json::json!(null))
            ]
        });

        let result = generate_rust_source("test-plugin", &flow).unwrap();
        assert!(
            result.contains("CommandSender::Console"),
            "should use CommandSender::Console"
        );
        assert!(
            result.contains("execute_command"),
            "should emit execute_command"
        );
    }

    #[test]
    fn data_player_name_inlines_get_name() {
        let flow = serde_json::json!({
            "nodes": [
                n("ev1", "event", "event.player-join", serde_json::json!({})),
                n("pn1", "data", "data.player-name", serde_json::json!({})),
                n("act1", "action", "action.broadcast", serde_json::json!({}))
            ],
            "edges": [
                e("ev1", "act1", serde_json::json!("exec"), serde_json::json!(null)),
                e("ev1", "pn1", serde_json::json!("player"), serde_json::json!("player")),
                e("pn1", "act1", serde_json::json!("value"), serde_json::json!("message"))
            ]
        });

        let result = generate_rust_source("test-plugin", &flow).unwrap();
        assert!(
            result.contains("get_name"),
            "should call player.get_name() inline"
        );
        assert!(
            result.contains("_data.player.get_name()"),
            "should inline _data.player.get_name() in broadcast message"
        );
    }

    #[test]
    fn data_player_uuid_inlines_get_id() {
        let flow = serde_json::json!({
            "nodes": [
                n("ev1", "event", "event.player-join", serde_json::json!({})),
                n("pu1", "data", "data.player-uuid", serde_json::json!({})),
                n("act1", "action", "action.broadcast", serde_json::json!({}))
            ],
            "edges": [
                e("ev1", "act1", serde_json::json!("exec"), serde_json::json!(null)),
                e("ev1", "pu1", serde_json::json!("player"), serde_json::json!("player")),
                e("pu1", "act1", serde_json::json!("value"), serde_json::json!("message"))
            ]
        });

        let result = generate_rust_source("test-plugin", &flow).unwrap();
        assert!(
            result.contains("get_id"),
            "should call player.get_id() inline"
        );
        assert!(
            result.contains("_data.player.get_id()"),
            "should inline _data.player.get_id() in broadcast message"
        );
    }

    #[test]
    fn logic_if_generates_true_false_branches() {
        let flow = serde_json::json!({
            "nodes": [
                n("ev1", "event", "event.player-join", serde_json::json!({})),
                n("if1", "logic", "logic.if", serde_json::json!({"condition": true})),
                n("true1", "action", "action.broadcast", serde_json::json!({"message": "yes"})),
                n("false1", "action", "action.broadcast", serde_json::json!({"message": "no"}))
            ],
            "edges": [
                e("ev1", "if1", serde_json::json!("exec"), serde_json::json!(null)),
                e("if1", "true1", serde_json::json!("true"), serde_json::json!("exec-in")),
                e("if1", "false1", serde_json::json!("false"), serde_json::json!("exec-in"))
            ]
        });

        let result = generate_rust_source("test-plugin", &flow).unwrap();
        assert!(
            result.contains("if true {"),
            "should open if with condition"
        );
        assert!(result.contains("} else {"), "should have else block");
        assert!(
            result.contains("broadcast(&_msg_true1"),
            "should execute true branch"
        );
        assert!(
            result.contains("broadcast(&_msg_false1"),
            "should execute false branch"
        );
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
    fn format_text_with_player_name_slot() {
        let flow = serde_json::json!({
            "nodes": [
                n("ev1", "event", "event.player-join", serde_json::json!({})),
                n("pn1", "data", "data.player-name", serde_json::json!({})),
                n("ft1", "formatText", "data.format-text", serde_json::json!({
                    "template": "Bienvenue {nom} sur notre serveur !"
                })),
                n("act1", "action", "action.send-message", serde_json::json!({}))
            ],
            "edges": [
                e("ev1", "act1", serde_json::json!("exec"), serde_json::json!(null)),
                e("ev1", "pn1", serde_json::json!("player"), serde_json::json!("player")),
                e("ev1", "act1", serde_json::json!("player"), serde_json::json!("player")),
                e("pn1", "ft1", serde_json::json!("value"), serde_json::json!("nom")),
                e("ft1", "act1", serde_json::json!("value"), serde_json::json!("message"))
            ]
        });

        let result = generate_rust_source("test-plugin", &flow).unwrap();
        assert!(
            result.contains("format!(\"Bienvenue {} sur notre serveur !\""),
            "should emit format! with one slot: got\n{result}"
        );
        assert!(
            result.contains("_data.player.get_name()"),
            "should resolve {{nom}} to player.get_name()"
        );
        assert!(
            result.contains("send_system_message"),
            "should call send_system_message with the formatted text"
        );
    }

    #[test]
    fn format_text_no_slots_emits_plain_literal() {
        let flow = serde_json::json!({
            "nodes": [
                n("ev1", "event", "event.player-join", serde_json::json!({})),
                n("ft1", "formatText", "data.format-text", serde_json::json!({
                    "template": "Hello world"
                })),
                n("act1", "action", "action.broadcast", serde_json::json!({}))
            ],
            "edges": [
                e("ev1", "act1", serde_json::json!("exec"), serde_json::json!(null)),
                e("ft1", "act1", serde_json::json!("value"), serde_json::json!("message"))
            ]
        });

        let result = generate_rust_source("test-plugin", &flow).unwrap();
        assert!(
            result.contains("\"Hello world\""),
            "should emit plain literal when no slots: got\n{result}"
        );
        assert!(
            !result.contains("format!(\"Hello world\""),
            "should NOT wrap in format! when no slots needed"
        );
    }

    #[test]
    fn format_text_unconnected_slot_falls_back_to_empty_string() {
        let flow = serde_json::json!({
            "nodes": [
                n("ev1", "event", "event.player-join", serde_json::json!({})),
                n("ft1", "formatText", "data.format-text", serde_json::json!({
                    "template": "Hi {missing}!"
                })),
                n("act1", "action", "action.broadcast", serde_json::json!({}))
            ],
            "edges": [
                e("ev1", "act1", serde_json::json!("exec"), serde_json::json!(null)),
                e("ft1", "act1", serde_json::json!("value"), serde_json::json!("message"))
            ]
        });

        let result = generate_rust_source("test-plugin", &flow).unwrap();
        assert!(
            result.contains("format!(\"Hi {}!\", \"\")"),
            "should emit empty string for unconnected slot: got\n{result}"
        );
    }

    #[test]
    fn format_text_multiple_slots_in_order() {
        let flow = serde_json::json!({
            "nodes": [
                n("ev1", "event", "event.player-join", serde_json::json!({})),
                n("pn1", "data", "data.player-name", serde_json::json!({})),
                n("pu1", "data", "data.player-uuid", serde_json::json!({})),
                n("ft1", "formatText", "data.format-text", serde_json::json!({
                    "template": "{nom} ({uuid}) a rejoint"
                })),
                n("act1", "action", "action.broadcast", serde_json::json!({}))
            ],
            "edges": [
                e("ev1", "act1", serde_json::json!("exec"), serde_json::json!(null)),
                e("ev1", "pn1", serde_json::json!("player"), serde_json::json!("player")),
                e("ev1", "pu1", serde_json::json!("player"), serde_json::json!("player")),
                e("pn1", "ft1", serde_json::json!("value"), serde_json::json!("nom")),
                e("pu1", "ft1", serde_json::json!("value"), serde_json::json!("uuid")),
                e("ft1", "act1", serde_json::json!("value"), serde_json::json!("message"))
            ]
        });

        let result = generate_rust_source("test-plugin", &flow).unwrap();
        assert!(
            result.contains("format!(\"{} ({}) a rejoint\", _data.player.get_name(), _data.player.get_id())"),
            "should emit slots in template order with correct expressions: got\n{result}"
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
