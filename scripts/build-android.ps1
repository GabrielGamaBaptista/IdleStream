param (
    [string]$Target = "aarch64-linux-android",
    [string]$BuildType = "release"
)

$ErrorActionPreference = "Stop"

Write-Host "==> [1/5] Compilando frontend React 19..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "Falha ao compilar frontend!" }

Write-Host "==> [2/5] Configurando ambiente NDK e Tauri..." -ForegroundColor Cyan
$env:TAURI_CONFIG = '{"build": {"devUrl": null}}'
$env:TAURI_ENV_DEBUG = "false"
$NdkPath = "C:\Users\ggb20\AppData\Local\Android\Sdk\ndk\27.1.12297006\toolchains\llvm\prebuilt\windows-x86_64\bin"
if (Test-Path $NdkPath) {
    $env:PATH = "$NdkPath;" + $env:PATH
    $env:CARGO_TARGET_AARCH64_LINUX_ANDROID_LINKER = "$NdkPath\aarch64-linux-android24-clang.cmd"
    $env:CARGO_TARGET_ARMV7_LINUX_ANDROIDEABI_LINKER = "$NdkPath\armv7a-linux-androideabi24-clang.cmd"
    $env:CARGO_TARGET_X86_64_LINUX_ANDROID_LINKER = "$NdkPath\x86_64-linux-android24-clang.cmd"
} else {
    Write-Warning "NDK bin não encontrado no caminho padrão: $NdkPath"
}

Write-Host "==> [3/5] Compilando Rust cdylib ($Target - $BuildType)..." -ForegroundColor Cyan
$releaseFlag = if ($BuildType -eq "release") { "--release" } else { "" }
if ($releaseFlag) {
    cargo build --manifest-path src-tauri/Cargo.toml --target $Target --release --lib --features custom-protocol
} else {
    cargo build --manifest-path src-tauri/Cargo.toml --target $Target --lib --features custom-protocol
}
if ($LASTEXITCODE -ne 0) { throw "Falha ao compilar cdylib Rust!" }

Write-Host "==> [4/5] Copiando bibliotecas e assets para o projeto Android..." -ForegroundColor Cyan
$abiMap = @{
    "aarch64-linux-android"   = "arm64-v8a"
    "armv7-linux-androideabi" = "armeabi-v7a"
    "x86_64-linux-android"    = "x86_64"
    "i686-linux-android"      = "x86"
}
$abi = $abiMap[$Target]
if (-not $abi) { $abi = "arm64-v8a" }

$srcSo = "src-tauri/target/$Target/$BuildType/libidlestream_lib.so"
$destJni = "src-tauri/gen/android/app/src/main/jniLibs/$abi"
New-Item -ItemType Directory -Force -Path $destJni | Out-Null
Copy-Item -Path $srcSo -Destination "$destJni/libidlestream_lib.so" -Force

$destAssets = "src-tauri/gen/android/app/src/main/assets"
New-Item -ItemType Directory -Force -Path $destAssets | Out-Null
Copy-Item -Path "dist/*" -Destination $destAssets -Recurse -Force

Write-Host "==> [5/5] Montando APK Gradle ($BuildType)..." -ForegroundColor Cyan
if ($Target -eq "x86_64-linux-android") {
    $gradleTask = if ($BuildType -eq "release") { "assembleX86_64Release" } else { "assembleX86_64Debug" }
} elseif ($Target -eq "aarch64-linux-android") {
    $gradleTask = if ($BuildType -eq "release") { "assembleArm64Release" } else { "assembleArm64Debug" }
} else {
    $gradleTask = if ($BuildType -eq "release") { "assembleRelease" } else { "assembleDebug" }
}

Push-Location "src-tauri/gen/android"
try {
    .\gradlew.bat $gradleTask
    if ($LASTEXITCODE -ne 0) { throw "Gradle build falhou!" }
} finally {
    Pop-Location
}

$apkPattern = if ($BuildType -eq "release") { "*release*.apk" } else { "*debug*.apk" }
$apkPath = Get-ChildItem -Path "src-tauri/gen/android/app/build/outputs/apk" -Recurse -Filter $apkPattern | Select-Object -First 1

if ($apkPath) {
    $sizeMb = [math]::Round($apkPath.Length / 1MB, 2)
    Write-Host "`n========================================================" -ForegroundColor Green
    Write-Host " APK GERADO COM SUCESSO!" -ForegroundColor Green
    Write-Host " Arquivo: $($apkPath.FullName)" -ForegroundColor White
    Write-Host " Tamanho: $sizeMb MB" -ForegroundColor Yellow
    Write-Host "========================================================`n" -ForegroundColor Green
} else {
    Write-Warning "APK não encontrado na pasta de saída padrão."
}
