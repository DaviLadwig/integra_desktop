mod exports;
mod updates;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(updates::InstallationLock::default())
        .invoke_handler(tauri::generate_handler![
            exports::save_integra_export,
            updates::integra_check_update,
            updates::integra_install_update,
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Integra");
}
