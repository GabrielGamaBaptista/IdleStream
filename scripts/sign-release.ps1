$keyPath = "$env:USERPROFILE\.tauri\idlestream.key"
$targetExe = "src-tauri/target/release/bundle/nsis/IdleStream_3.2.7_x64-setup.exe"
$password = "idlestream_signing_key_2026"
$version = "3.2.7"

Write-Host "Assinando $targetExe com a chave $keyPath..."
$sig = & npx tauri signer sign -f $keyPath -p $password --app-version $version $targetExe
Write-Host "Assinatura gerada:"
$sig
$sigFile = "src-tauri/target/release/bundle/nsis/IdleStream_3.2.7_x64-setup.exe.sig"
Set-Content -Path $sigFile -Value $sig -NoNewline
Write-Host "Salvo em $sigFile"
