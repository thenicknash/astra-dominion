$ErrorActionPreference = 'Stop'
$gameDirectory = $PSScriptRoot
$gameAddress = 'http://127.0.0.1:4173'
function Test-GameServer {
    try {
        $response = Invoke-WebRequest -Uri $gameAddress -UseBasicParsing -TimeoutSec 2
        return $response.Content.Contains('Astra Dominion')
    } catch { return $false }
}
if (-not (Test-GameServer)) {
    $nodePath = (Get-Command node -ErrorAction Stop).Source
    $serverFile = Join-Path $gameDirectory 'server.mjs'
    $gameProcess = Start-Process -FilePath $nodePath -ArgumentList ('"' + $serverFile + '"') -WorkingDirectory $gameDirectory -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $gameDirectory 'server.log') -RedirectStandardError (Join-Path $gameDirectory 'server-error.log')
    $gameProcess.Id | Set-Content -LiteralPath (Join-Path $gameDirectory '.server-pid')
    $ready = $false
    for ($attempt = 0; $attempt -lt 25; $attempt++) {
        if (Test-GameServer) { $ready = $true; break }
        Start-Sleep -Milliseconds 200
    }
    if (-not $ready) { throw 'The game could not start. Check server-error.log or run npm start in this folder.' }
}
Start-Process $gameAddress
