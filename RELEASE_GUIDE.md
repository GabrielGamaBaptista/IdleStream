# 📖 Guia Definitivo de Releases, Assinatura Digital e Auto-Updater do IdleStream

Este documento centraliza todas as informações criptográficas, passos de compilação, assinatura digital e publicação de versões do **IdleStream** tanto para **Windows (Desktop)** quanto para **Android (Mobile)**.

> ⚠️ **IMPORTANTE**: O Tauri Updater (`@tauri-apps/plugin-updater`) rejeitará silenciosamente qualquer atualização caso o instalador não possua a assinatura digital válida correspondente no manifesto `latest.json` e o arquivo `.sig` na release.

---

## 🔑 Credenciais Criptográficas (Tauri Minisign)

As chaves do projeto foram geradas pelo Tauri Signer e estão configuradas da seguinte forma:

| Propriedade | Valor / Localização |
| :--- | :--- |
| **Caminho da Chave Privada** | `~/.tauri/idlestream.key` (ou `$env:USERPROFILE\.tauri\idlestream.key`) |
| **Senha / Passphrase da Chave** | `idlestream_signing_key_2026` |
| **Chave Pública** | `dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDU3Rjk5Nzk4QjMzMjNCMjEKUldRaE96S3ptSmY1VjI2Unh2cnRJK3RNTW4zeHRsbHFSaXZwU1FKUDhJL2Fnd2tvNlFyNGpmajQK` |
| **Configuração no App** | `src-tauri/tauri.conf.json` sob a chave `"plugins.updater.pubkey"` |
| **Endpoint do Updater** | `https://github.com/GabrielGamaBaptista/IdleStream/releases/latest/download/latest.json` |

---

## 📋 Checklist Obrigatório de uma Release

Para que usuários instalados no Windows e no Android recebam e instalem atualizações sem falhas, a release no GitHub **DEVE** conter exatamente estes 5 arquivos:

1. `IdleStream_<VERSION>_x64-setup.exe` (Instalador NSIS Windows)
2. `IdleStream_<VERSION>_x64-setup.exe.sig` (Arquivo de assinatura minisign gerado pela chave)
3. `IdleStream_<VERSION>_arm64.apk` (Pacote Android nativo)
4. `idlestream.exe` (Executável standalone portátil)
5. `latest.json` (Manifesto contendo a mesma assinatura e notas da versão)

---

## 🛠️ Passo a Passo Completo para Lançar uma Nova Release

### 1. Atualizar Strings de Versão no Código

Sincronize a versão (ex: `X.Y.Z`) nos seguintes arquivos:
- `package.json` (`"version": "X.Y.Z"`)
- `src-tauri/tauri.conf.json` (`"version": "X.Y.Z"`)
- `src-tauri/Cargo.toml` (`version = "X.Y.Z"`)
- `src/stores/appStore.ts` (`appVersion: 'X.Y.Z'`)
- `src/components/SettingsTab.tsx` (versão do relatório de diagnóstico)
- `scripts/build-android.ps1` (`$destRootApk = "IdleStream_X.Y.Z_arm64.apk"`)
- `latest.json` (`"version": "X.Y.Z"`)

### 2. Compilar o Instalador Desktop (Windows)

No terminal PowerShell na raiz do projeto:

```powershell
# 1. Exportar a chave privada e sua senha para o ambiente
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content -Raw "$env:USERPROFILE\.tauri\idlestream.key"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "idlestream_signing_key_2026"

# 2. Compilar frontend e backend com empacotamento NSIS
npx tauri build
```

O comando gerará os seguintes arquivos em `src-tauri/target/release/bundle/nsis/`:
- `IdleStream_<VERSION>_x64-setup.exe`
- `IdleStream_<VERSION>_x64-setup.exe.sig`

E em `src-tauri/target/release/`:
- `idlestream.exe`

#### 💡 Assinatura Manual (caso o build seja executado sem a variável de ambiente)
Se o build for feito sem a senha e não gerar o `.sig`, execute manualmente:
```powershell
npx tauri signer sign `
  -f "$env:USERPROFILE\.tauri\idlestream.key" `
  -p "idlestream_signing_key_2026" `
  --app-version "<VERSION>" `
  "src-tauri/target/release/bundle/nsis/IdleStream_<VERSION>_x64-setup.exe"
```
O console exibirá o bloco da assinatura (`dW50cnVzdGVkIGNvbW1lbnQ...`). Copie esse valor para o passo seguinte.

### 3. Atualizar o `latest.json`

Abra `latest.json` na raiz e preencha:
```json
{
  "version": "<VERSION>",
  "notes": "IdleStream v<VERSION> — Resumo das novidades...",
  "pub_date": "2026-11-04T18:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "<COLE_AQUI_O_CONTEÚDO_DA_ASSINATURA>",
      "url": "https://github.com/GabrielGamaBaptista/IdleStream/releases/download/v<VERSION>/IdleStream_<VERSION>_x64-setup.exe"
    }
  }
}
```

### 4. Compilar o APK Release para Android

Execute o script de automação Android:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-android.ps1
```
Ele gerará o arquivo `IdleStream_<VERSION>_arm64.apk` na raiz do projeto.

### 5. Commitar e Enviar ao Repositório

```powershell
git add .
git commit -m "feat: release v<VERSION>"
git push origin main
```

### 6. Publicar a Release no GitHub

Crie a release anexando todos os 5 artefatos obrigatórios:

```powershell
gh release create "v<VERSION>" `
  "IdleStream_<VERSION>_arm64.apk" `
  "src-tauri/target/release/bundle/nsis/IdleStream_<VERSION>_x64-setup.exe" `
  "src-tauri/target/release/bundle/nsis/IdleStream_<VERSION>_x64-setup.exe.sig" `
  "src-tauri/target/release/idlestream.exe" `
  "latest.json" `
  --title "IdleStream v<VERSION> — Título da Versão" `
  --notes "Notas de lançamento..."
```

*(Se precisar atualizar arquivos em uma release existente, use `gh release upload v<VERSION> <ARQUIVOS> --clobber`)*.

---

## 🧪 Como Validar se a Atualização Automática Funcionará

Para garantir que o fluxo de auto-update não quebrará:

1. Execute a suíte de testes de versionamento:
   ```powershell
   npx tsx scripts/test-version.ts
   ```
2. Inicie o app em uma versão anterior (ex: v2.2.0) e clique em **Verificar Atualizações** na aba de Ajustes.
3. O app deve exibir:
   - Notificação de nova versão disponível (`vX.Y.Z`).
   - Barra de progresso de download.
   - Botão **Reiniciar e Instalar**.
