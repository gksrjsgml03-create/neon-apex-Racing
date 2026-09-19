$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$packageInfo = Get-Content (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json
$appFolder = Join-Path $projectRoot 'dist/Neon Apex-win32-x64'
if (-not (Test-Path (Join-Path $appFolder 'NeonApex.exe'))) {
    throw 'Run npm run build:win before packaging the release.'
}
Copy-Item -LiteralPath (Join-Path $projectRoot 'docs/PLAY_WINDOWS.ko.txt') -Destination (Join-Path $appFolder 'START-HERE.ko.txt')
Copy-Item -LiteralPath (Join-Path $projectRoot 'ONLINE.md') -Destination $appFolder
Copy-Item -LiteralPath (Join-Path $projectRoot 'PUBLIC_SERVER.md') -Destination $appFolder
Copy-Item -LiteralPath (Join-Path $projectRoot 'THIRD_PARTY_NOTICES.md') -Destination $appFolder
$licenseFolder = Join-Path $appFolder 'third-party-licenses'
New-Item -ItemType Directory -Path $licenseFolder -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot 'node_modules/three/LICENSE') -Destination (Join-Path $licenseFolder 'three-MIT.txt')
Copy-Item -LiteralPath (Join-Path $projectRoot 'node_modules/ws/LICENSE') -Destination (Join-Path $licenseFolder 'ws-MIT.txt')
$zipName = "Neon-Apex-v$($packageInfo.version)-windows-x64.zip"
$zipPath = Join-Path $projectRoot "dist/$zipName"
Compress-Archive -LiteralPath $appFolder -DestinationPath $zipPath -CompressionLevel Optimal -Force
$digest = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText((Join-Path $projectRoot 'dist/SHA256SUMS.txt'), "$digest  $zipName`n", [Text.UTF8Encoding]::new($false))
Get-Item -LiteralPath $zipPath | Select-Object Name,Length
Write-Output "SHA256: $digest"
