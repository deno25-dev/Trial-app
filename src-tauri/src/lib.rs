#[tauri::command]
fn clear_drawings(source_id: String) -> Result<(), String> {
    // In a real implementation with SQLite/Diesel:
    // DELETE FROM drawings WHERE source_id = ?
    println!("Bulk delete drawings for source_id: {}", source_id);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![clear_drawings])
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
