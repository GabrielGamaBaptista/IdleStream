$packageJson = Get-Content "package.json" | ConvertFrom-Json
$version = $packageJson.version
$keyPath = "$env:USERPROFILE\.tauri\idlestream.key"
$targetExe = "src-tauri/target/release/bundle/nsis/IdleStream_${version}_x64-setup.exe"
$password = "idlestream_signing_key_2026"

Write-Host "Assinando $targetExe com a chave $keyPath (versão $version)..."
$sig = & npx tauri signer sign -f $keyPath -p $password --app-version $version $targetExe
Write-Host "Assinatura gerada:"
$sig
$sigFile = "src-tauri/target/release/bundle/nsis/IdleStream_${version}_x64-setup.exe.sig"
Set-Content -Path $sigFile -Value $sig -NoNewline
Write-Host "Salvo em $sigFile"
