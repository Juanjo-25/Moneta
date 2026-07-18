#[tauri::command]
fn health_check() -> String {
    "Moneta Tauri conectado".to_string()
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![health_check])
        .run(tauri::generate_context!())
        .expect("error while running Moneta desktop app");
}
