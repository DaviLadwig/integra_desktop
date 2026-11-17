//! Exportação local controlada: o usuário escolhe o destino no diálogo nativo.
//! A interface web nunca fornece um caminho de escrita ao comando Rust.

use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

const MAX_EXPORT_BYTES: usize = 64 * 1024 * 1024;

fn safe_filename(value: &str, extension: &str) -> String {
    let name: String = value
        .chars()
        .take(150)
        .map(|c| {
            if c.is_control() || "\\/:*?\"<>|".contains(c) { '_' } else { c }
        })
        .collect();
    let mut name = name.trim().trim_matches('.').to_string();
    if name.is_empty() {
        name = "Integra".to_string();
    }
    if !name.to_lowercase().ends_with(&format!(".{extension}")) {
        name = format!("{name}.{extension}");
    }
    name
}

#[tauri::command]
pub async fn save_integra_export(
    app: AppHandle,
    file_name: String,
    extension: String,
    bytes: Vec<u8>,
) -> Result<Option<String>, String> {
    let (filter_name, signature_ok) = match extension.as_str() {
        "pdf" => ("Documento PDF", bytes.starts_with(b"%PDF-")),
        "xlsx" => ("Planilha do Excel", bytes.starts_with(b"PK\x03\x04")),
        _ => return Err("Formato de arquivo não permitido.".into()),
    };

    if bytes.is_empty() || bytes.len() > MAX_EXPORT_BYTES || !signature_ok {
        return Err("O arquivo gerado é inválido ou ultrapassa o limite de 64 MB.".into());
    }

    let name = safe_filename(&file_name, &extension);
    tauri::async_runtime::spawn_blocking(move || {
        let chosen = app
            .dialog()
            .file()
            .set_title("Salvar arquivo do Integra")
            .set_file_name(name)
            .add_filter(filter_name, &[extension.as_str()])
            .blocking_save_file();

        let Some(chosen) = chosen else { return Ok(None) };
        let path = chosen.into_path().map_err(|_| "Caminho inválido para salvar o arquivo.")?;

        // Impede que o seletor seja usado para escrever outros formatos.
        if !path.extension().is_some_and(|ext| ext.to_string_lossy().eq_ignore_ascii_case(&extension)) {
            return Err("O arquivo deve manter a extensão selecionada.".to_string());
        }

        std::fs::write(&path, bytes)
            .map_err(|_| "Não foi possível gravar o arquivo na pasta selecionada.".to_string())?;
        Ok(Some(path.to_string_lossy().to_string()))
    })
    .await
    .map_err(|_| "O salvamento foi interrompido.".to_string())?
}

#[cfg(test)]
mod tests {
    use super::safe_filename;

    #[test]
    fn removes_path_segments() {
        assert_eq!(safe_filename("../relatorio:2026.pdf", "pdf"), "_relatorio_2026.pdf");
    }

    #[test]
    fn normalizes_missing_extension() {
        assert_eq!(safe_filename("Checklist", "xlsx"), "Checklist.xlsx");
    }
}
