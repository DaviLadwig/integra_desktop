//! Atualizações verificadas por assinatura, acionadas somente com consentimento.

use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{AppHandle, State};
use tauri_plugin_updater::UpdaterExt;

#[derive(Default)]
pub struct InstallationLock(pub AtomicBool);

#[derive(Serialize)]
pub struct IntegraUpdate {
    pub version: String,
    pub notes: String,
}

#[tauri::command]
pub async fn integra_check_update(app: AppHandle) -> Result<Option<IntegraUpdate>, String> {
    let update = app
        .updater_builder()
        .timeout(Duration::from_secs(12))
        .build()
        .map_err(|_| "O serviço de atualização está indisponível.".to_string())?
        .check()
        .await
        .map_err(|_| "Não foi possível consultar as atualizações.".to_string())?;

    Ok(update.map(|u| IntegraUpdate {
        version: u.version.to_string(),
        notes: u.body.unwrap_or_default(),
    }))
}

#[tauri::command]
pub async fn integra_install_update(
    app: AppHandle,
    expected_version: String,
    lock: State<'_, InstallationLock>,
) -> Result<(), String> {
    if lock.0.swap(true, Ordering::AcqRel) {
        return Err("Já existe uma atualização em andamento.".to_string());
    }

    // Executa a verificação novamente para impedir troca inesperada de versão.
    let result = async {
        let update = app
            .updater_builder()
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(|e| e.to_string())?
            .check()
            .await
            .map_err(|e| e.to_string())?
            .ok_or("A atualização não está mais disponível.")?;

        if update.version.to_string() != expected_version {
            return Err("A versão publicada mudou. Verifique as atualizações novamente.".into());
        }

        update
            .download_and_install(|_, _| {}, || {})
            .await
            .map_err(|_| "Falha ao baixar ou instalar a atualização assinada.".to_string())?;

        Ok(())
    }
    .await;

    lock.0.store(false, Ordering::Release);
    if result.is_ok() {
        // No Windows, a etapa de instalação pode encerrar o aplicativo.
        app.restart();
    }
    result
}
