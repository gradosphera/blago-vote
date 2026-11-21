use reqwest::Client;
use tracing::{error, warn};

use crate::config::Config;

/// HTTP client for api.ton.vote with proxy support.
fn build_client(config: &Config) -> Client {
    let mut builder = Client::builder()
        .timeout(std::time::Duration::from_secs(30));

    if let Some(ref proxy_str) = config.proxy {
        if let Ok(proxy) = reqwest::Proxy::all(proxy_str) {
            builder = builder.proxy(proxy);
        } else {
            warn!("Failed to create proxy for API client: {}", proxy_str);
        }
    }

    builder.build().expect("Failed to build API HTTP client")
}

#[derive(Debug, serde::Deserialize, serde::Serialize, Clone)]
pub struct Proposal {
    #[serde(default)]
    pub metadata: Option<serde_json::Value>,
    #[serde(default)]
    pub proposal_result: Option<serde_json::Value>,
    #[serde(default)]
    pub votes: Option<serde_json::Value>,
}

#[derive(Debug, serde::Deserialize, Clone)]
pub struct Dao {
    #[serde(default)]
    pub dao_address: Option<String>,
    #[serde(default)]
    pub dao_proposals: Option<Vec<String>>,
    #[serde(default)]
    pub dao_metadata: Option<serde_json::Value>,
}

/// Fetch all DAOs.
pub async fn fetch_daos(config: &Config) -> Vec<Dao> {
    let client = build_client(config);
    let base_url = &config.api_base;
    
    match client.get(format!("{}/daos", base_url)).send().await {
        Ok(resp) => match resp.json::<Vec<Dao>>().await {
            Ok(daos) => daos,
            Err(e) => {
                error!("Failed to parse DAOs: {}", e);
                Vec::new()
            }
        },
        Err(e) => {
            error!("Failed to fetch DAOs: {}", e);
            Vec::new()
        }
    }
}

/// Fetch a single proposal by address.
pub async fn fetch_proposal(config: &Config, proposal_address: &str) -> Option<Proposal> {
    let client = build_client(config);
    let base_url = &config.api_base;
    
    match client.get(format!("{}/proposal/{}", base_url, proposal_address)).send().await {
        Ok(resp) => match resp.json::<Proposal>().await {
            Ok(proposal) => Some(proposal),
            Err(e) => {
                error!("Failed to parse proposal {}: {}", proposal_address, e);
                None
            }
        },
        Err(e) => {
            error!("Failed to fetch proposal {}: {}", proposal_address, e);
            None
        }
    }
}

/// Fetch a single DAO by address.
pub async fn fetch_dao(config: &Config, dao_address: &str) -> Option<Dao> {
    let client = build_client(config);
    let base_url = &config.api_base;
    
    match client.get(format!("{}/dao/{}", base_url, dao_address)).send().await {
        Ok(resp) => match resp.json::<Dao>().await {
            Ok(dao) => Some(dao),
            Err(e) => {
                error!("Failed to parse DAO {}: {}", dao_address, e);
                None
            }
        },
        Err(e) => {
            error!("Failed to fetch DAO {}: {}", dao_address, e);
            None
        }
    }
}
