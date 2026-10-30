#[allow(unused_imports)]
use std::collections::HashMap;

#[cfg(target_os = "android")]
use jni::objects::{GlobalRef, JClass, JObject, JString, JValue};
#[cfg(target_os = "android")]
use jni::{JNIEnv, JavaVM};
#[cfg(target_os = "android")]
use std::sync::OnceLock;

#[cfg(target_os = "android")]
static JVM: OnceLock<JavaVM> = OnceLock::new();

#[cfg(target_os = "android")]
static BRIDGE_CLASS: OnceLock<GlobalRef> = OnceLock::new();

#[cfg(target_os = "android")]
#[no_mangle]
pub extern "system" fn Java_com_idlestream_app_KickHttpBridge_registerNativeBridge(
    mut env: JNIEnv,
    class: JClass,
) {
    if let Ok(vm) = env.get_java_vm() {
        let _ = JVM.set(vm);
    }
    if let Ok(global_class) = env.new_global_ref(class) {
        let _ = BRIDGE_CLASS.set(global_class);
    }
    eprintln!("[KickHttp] Android KickHttpBridge successfully registered with JNI");
}

#[cfg(target_os = "android")]
pub async fn kick_http_request(
    method: &str,
    url: &str,
    headers: Option<&[(&str, &str)]>,
    body: Option<&str>,
    timeout_secs: u64,
) -> Result<(u16, String), String> {
    let method = method.to_string();
    let url = url.to_string();
    let headers_json = match headers {
        Some(h) => {
            let map: HashMap<&str, &str> = h.iter().cloned().collect();
            serde_json::to_string(&map).unwrap_or_default()
        }
        None => String::new(),
    };
    let body = body.map(|b| b.to_string());
    let timeout_ms = (timeout_secs * 1000) as i32;

    tokio::task::spawn_blocking(move || {
        let vm = JVM.get().ok_or_else(|| {
            "Android JavaVM não registrada no KickHttpBridge".to_string()
        })?;
        let mut env = vm
            .attach_current_thread()
            .map_err(|e| format!("JNI attach thread falhou: {}", e))?;

        let bridge_class = BRIDGE_CLASS.get().ok_or_else(|| {
            "KickHttpBridge class global ref não inicializada".to_string()
        })?;

        let j_method = env.new_string(&method).map_err(|e| e.to_string())?;
        let j_url = env.new_string(&url).map_err(|e| e.to_string())?;
        let j_headers = env.new_string(&headers_json).map_err(|e| e.to_string())?;
        let j_body = match &body {
            Some(b) => env.new_string(b).map_err(|e| e.to_string())?.into(),
            None => JObject::null(),
        };

        let args = [
            JValue::Object(&j_method),
            JValue::Object(&j_url),
            JValue::Object(&j_headers),
            JValue::Object(&j_body),
            JValue::Int(timeout_ms),
        ];

        let result_obj = env
            .call_static_method(
                bridge_class,
                "request",
                "(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;I)Ljava/lang/String;",
                &args,
            )
            .map_err(|e| format!("Erro ao chamar KickHttpBridge.request: {}", e))?;

        let j_str: JString = result_obj.l().map_err(|e| e.to_string())?.into();
        let rust_str: String = env.get_string(&j_str).map_err(|e| e.to_string())?.into();

        let v: serde_json::Value = serde_json::from_str(&rust_str)
            .map_err(|e| format!("Resposta inválida do bridge: {} (raw: {})", e, rust_str))?;

        let status = v["status"].as_i64().unwrap_or(-1) as i32;
        let resp_body = v["body"].as_str().unwrap_or("").to_string();
        let error = v["error"].as_str().unwrap_or("");

        if status < 0 {
            return Err(format!("KickHttpBridge erro: {}", error));
        }

        Ok((status as u16, resp_body))
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[cfg(target_os = "windows")]
pub async fn kick_http_request(
    method: &str,
    url: &str,
    headers: Option<&[(&str, &str)]>,
    body: Option<&str>,
    timeout_secs: u64,
) -> Result<(u16, String), String> {
    let method = method.to_string();
    let url = url.to_string();
    let headers_vec: Vec<(String, String)> = headers
        .unwrap_or(&[])
        .iter()
        .map(|(k, v)| (k.to_string(), v.to_string()))
        .collect();
    let body = body.map(|b| b.to_string());

    tokio::task::spawn_blocking(move || {
        let mut cmd = std::process::Command::new("curl.exe");
        cmd.args(["-s", "-m", &timeout_secs.to_string(), "-X", &method, &url]);

        for (k, v) in &headers_vec {
            cmd.args(["-H", &format!("{}: {}", k, v)]);
        }

        if let Some(b) = &body {
            cmd.args(["-d", b]);
        }

        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

        match cmd.output() {
            Ok(out) if out.status.success() => {
                let stdout = String::from_utf8_lossy(&out.stdout).to_string();
                Ok((200, stdout))
            }
            Ok(out) => Err(format!("curl falhou com status: {}", out.status)),
            Err(e) => Err(format!("Erro ao executar curl: {}", e)),
        }
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[cfg(all(not(target_os = "windows"), not(target_os = "android")))]
pub async fn kick_http_request(
    method: &str,
    url: &str,
    headers: Option<&[(&str, &str)]>,
    body: Option<&str>,
    timeout_secs: u64,
) -> Result<(u16, String), String> {
    let method = method.to_string();
    let url = url.to_string();
    let headers_vec: Vec<(String, String)> = headers
        .unwrap_or(&[])
        .iter()
        .map(|(k, v)| (k.to_string(), v.to_string()))
        .collect();
    let body = body.map(|b| b.to_string());

    tokio::task::spawn_blocking(move || {
        let mut cmd = std::process::Command::new("curl");
        cmd.args(["-s", "-m", &timeout_secs.to_string(), "-X", &method, &url]);

        for (k, v) in &headers_vec {
            cmd.args(["-H", &format!("{}: {}", k, v)]);
        }

        if let Some(b) = &body {
            cmd.args(["-d", b]);
        }

        match cmd.output() {
            Ok(out) if out.status.success() => {
                let stdout = String::from_utf8_lossy(&out.stdout).to_string();
                Ok((200, stdout))
            }
            Ok(out) => Err(format!("curl falhou com status: {}", out.status)),
            Err(e) => Err(format!("Erro ao executar curl: {}", e)),
        }
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}
