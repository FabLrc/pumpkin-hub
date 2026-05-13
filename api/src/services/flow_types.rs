use serde::Deserialize;
use std::collections::HashMap;

use crate::error::AppError;

#[derive(Debug, Deserialize)]
pub struct FlowNode {
    pub id: String,
    #[serde(rename = "type")]
    #[allow(dead_code)]
    node_type: String,
    #[allow(dead_code)]
    position: Option<serde_json::Value>,
    pub data: FlowNodeData,
}

#[derive(Debug, Deserialize)]
pub struct FlowNodeData {
    #[serde(default)]
    pub definition: FlowNodeDefinition,
    #[serde(default)]
    pub values: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Deserialize, Default)]
pub struct FlowNodeDefinition {
    #[serde(default)]
    pub node_id: String,
    #[serde(default)]
    pub category: String,
    #[serde(default)]
    pub parameters: Vec<FlowParam>,
    #[serde(default)]
    pub outputs: Vec<FlowOutput>,
}

#[derive(Debug, Deserialize)]
pub struct FlowParam {
    pub id: String,
    #[serde(rename = "param_type")]
    pub param_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct FlowOutput {
    pub id: String,
    pub output_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct FlowEdge {
    pub source: String,
    pub target: String,
    #[serde(rename = "sourceHandle")]
    pub source_handle: Option<String>,
    #[serde(rename = "targetHandle")]
    pub target_handle: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct FlowData {
    #[serde(default)]
    pub nodes: Vec<FlowNode>,
    #[serde(default)]
    pub edges: Vec<FlowEdge>,
}

pub fn parse_flow(flow_json: &serde_json::Value) -> Result<FlowData, AppError> {
    serde_json::from_value(flow_json.clone())
        .map_err(|e| AppError::UnprocessableEntity(format!("invalid flow_data: {e}")))
}
