$auditDir = "$env:APPDATA\com.idlestream.app\audit"
if (-not (Test-Path $auditDir)) {
    Write-Host "Audit directory not found: $auditDir"
    exit 1
}

$stateFile = Join-Path $auditDir "current_slot.json"
$slot = 1
if (Test-Path $stateFile) {
    try {
        $json = Get-Content $stateFile | ConvertFrom-Json
        $slot = $json.current_slot
    } catch {}
}

$logFile = Join-Path $auditDir "audit_hour_$slot.log"
Write-Host "--- Monitorando Sessão IdleStream em Tempo Real ($logFile) ---"
if (Test-Path $logFile) {
    Get-Content $logFile -Tail 25
}
