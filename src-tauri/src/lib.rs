use scraper::{Html, Selector};
use serde::Serialize;

// Tags to exclude from scraping (hardcoded filter list)
const EXCLUDED_TAGS: &[&str] = &[
  "riding",
  "blowjob",
  "cumshot",
  "Japanese",
  "Doggystyle",
  "Cowgirl",
  "Facial",
  "Big dick"
];

#[derive(Serialize)]
pub struct ScrapeResult {
  pub url: String,
  pub creator: Vec<String>,
  pub tags: Vec<String>,
  pub music_artist: Vec<String>,
  pub music_song: Vec<String>,
  pub models: Vec<String>,
}

fn clean_text(text: &str) -> String {
  text.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn is_tag_excluded(tag: &str) -> bool {
  EXCLUDED_TAGS
    .iter()
    .any(|excluded| tag.eq_ignore_ascii_case(excluded))
}

fn normalize_name(name: &str) -> String {
  let mut parts: Vec<&str> = name.split_whitespace().collect();
  parts.sort_unstable();
  parts.join(" ").to_lowercase()
}

#[tauri::command]
async fn fetch_h3_and_spans(url: String) -> Result<ScrapeResult, String> {
  let response = reqwest::get(&url).await.map_err(|e| e.to_string())?;
  let status = response.status();
  if !status.is_success() {
    return Err(format!("Request failed: {}", status));
  }

  let body = response.text().await.map_err(|e| e.to_string())?;
  let document = Html::parse_document(&body);

  let h3_selector = Selector::parse("h3[class*=\"font-semibold\"][class*=\"inline-flex\"]")
    .map_err(|e| e.to_string())?;
  let creator_link_selector = Selector::parse("a[href*=\"creator=\"]")
    .map_err(|e| e.to_string())?;
  let tag_link_selector = Selector::parse("a[href*=\"tags=\"]")
    .map_err(|e| e.to_string())?;
  let music_artist_selector = Selector::parse("a[href*=\"musicArtist=\"]")
    .map_err(|e| e.to_string())?;
  let models_link_selector = Selector::parse("a[href*=\"stars=\"]")
    .map_err(|e| e.to_string())?;

  let creator: Vec<String> = {
    let creator_links: Vec<String> = document
      .select(&creator_link_selector)
      .filter_map(|node| {
        let text = node.text().collect::<String>();
        let cleaned = clean_text(&text).trim().to_string();
        if cleaned.is_empty() { None } else { Some(cleaned) }
      })
      .take(50)
      .collect();
    
    if !creator_links.is_empty() {
      creator_links
    } else {
      document
        .select(&h3_selector)
        .filter_map(|node| {
          let primary = node
            .text()
            .map(|t| clean_text(t))
            .find(|t| !t.is_empty())?;
          Some(primary)
        })
        .take(50)
        .collect()
    }
  };

  let tags: Vec<String> = document
    .select(&tag_link_selector)
    .filter_map(|node| {
      let text = node.text().collect::<String>();
      let cleaned = clean_text(&text)
        .trim_start_matches('#')
        .trim()
        .to_string();
      if cleaned.is_empty() || is_tag_excluded(&cleaned) { None } else { Some(cleaned) }
    })
    .take(200)
    .collect();

  let mut music_artist = Vec::new();
  let mut music_song = Vec::new();
  
  document
    .select(&music_artist_selector)
    .for_each(|node| {
      let text = node.text().collect::<String>();
      let cleaned = clean_text(&text).trim().to_string();
      if !cleaned.is_empty() {
        if let Some((artist, song)) = cleaned.split_once(" - ") {
          music_artist.push(artist.trim().to_string());
          music_song.push(song.trim().to_string());
        }
      }
    });

  let models: Vec<String> = {
    let mut seen = std::collections::HashSet::new();
    document
      .select(&models_link_selector)
      .filter_map(|node| {
        let text = node.text().collect::<String>();
        let cleaned = clean_text(&text)
          .trim_start_matches('#')
          .trim()
          .to_string();
        if cleaned.is_empty() {
          return None;
        }
        let normalized = normalize_name(&cleaned);
        if seen.contains(&normalized) {
          None
        } else {
          seen.insert(normalized);
          Some(cleaned)
        }
      })
      .take(200)
      .collect()
  };

  Ok(ScrapeResult { url, creator, tags, music_artist, music_song, models })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![fetch_h3_and_spans])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
