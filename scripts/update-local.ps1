$target = "C:\Users\ggb20\AppData\Local\IdleStream\idlestream.exe"
$source = "C:\Projetos\Chatter\src-tauri\target\release\idlestream.exe"

Write-Host "Verificando se IdleStream está rodando..."
$procs = Get-Process -Name "idlestream" -ErrorAction SilentlyContinue
if ($procs) {
    Write-Host "Finalizando instâncias em execução ($($procs.Count))..."
    $procs | ForEach-Object { Stop-Process -Id $_.Id -Force }
    Start-Sleep -Milliseconds 1500
}

if (Test-Path $target) {
    $timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
    $backup = "$target.old_$timestamp"
    Write-Host "Renomeando executável anterior para $backup..."
    Move-Item -Path $target -Destination $backup -Force
}

Write-Host "Copiando nova versão v4.2.5 para $target..."
Copy-Item -Path $source -Destination $target -Force

Write-Host "Iniciando nova versão do IdleStream..."
Start-Process -FilePath $target
Write-Host "IdleStream v4.2.5 instalado e iniciado com sucesso!"
