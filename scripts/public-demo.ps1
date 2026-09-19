param([ValidateSet('Start','Stop','Status')][string]$Action = 'Status')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$runtime = Join-Path $projectRoot '.runtime'
$statePath = Join-Path $runtime 'public-demo.json'
$state = if (Test-Path -LiteralPath $statePath) { Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json } else { $null }
function Owned-Process($entry) {
    if (-not $entry) { return $null }
    $process = Get-Process -Id $entry.id -ErrorAction SilentlyContinue
    if ($process -and $process.Path -eq $entry.path -and $process.StartTime.ToUniversalTime().Ticks -eq ([datetime]$entry.started).ToUniversalTime().Ticks) { return $process }
    return $null
}
if ($Action -eq 'Stop') {
    foreach ($entry in @($state.tunnel, $state.server)) { $process = Owned-Process $entry; if ($process) { Stop-Process -Id $process.Id } }
    Write-Output 'Temporary public game server stopped.'
    exit
}
if ($Action -eq 'Status') {
    [PSCustomObject]@{ServerRunning=[bool](Owned-Process $state.server);TunnelRunning=[bool](Owned-Process $state.tunnel)}
    exit
}
if ((Owned-Process $state.server) -or (Owned-Process $state.tunnel)) { throw 'Demo process already exists. Use Status or Stop first.' }
$nodePath = (Get-Command node -ErrorAction Stop).Source
$tunnelPath = Join-Path $runtime 'cloudflared.exe'
if (-not (Test-Path -LiteralPath $tunnelPath)) { throw 'Verified cloudflared.exe is required in .runtime.' }
New-Item -ItemType Directory -Path $runtime -Force | Out-Null
$server = Start-Process -FilePath $nodePath -ArgumentList ('"' + (Join-Path $projectRoot 'online/demo-server.js') + '"') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtime 'server.out.log') -RedirectStandardError (Join-Path $runtime 'server.err.log')
try {
    $ready=$false
    for($i=0;$i -lt 20;$i++) {
        if($server.HasExited){throw 'Game server failed to start; see .runtime/server.err.log.'}
        try { $health=Invoke-RestMethod 'http://127.0.0.1:18787/health' -TimeoutSec 1; if($health.game -eq 'Neon Apex'){$ready=$true;break} } catch {}
        Start-Sleep -Milliseconds 100
    }
    if(-not $ready){throw 'Game server did not become ready.'}
    $tunnel = Start-Process -FilePath $tunnelPath -ArgumentList 'tunnel','--no-autoupdate','--url','http://127.0.0.1:18787','--protocol','http2' -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtime 'tunnel.out.log') -RedirectStandardError (Join-Path $runtime 'tunnel.err.log')
    $info=@{server=@{id=$server.Id;path=$nodePath;started=$server.StartTime.ToUniversalTime().ToString('o')};tunnel=@{id=$tunnel.Id;path=$tunnelPath;started=$tunnel.StartTime.ToUniversalTime().ToString('o')}}
    $info | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $statePath -Encoding UTF8
    Write-Output 'Game server and temporary tunnel started. The public URL appears in .runtime/tunnel.err.log.'
} catch { if(-not $server.HasExited){Stop-Process -Id $server.Id}; throw }
