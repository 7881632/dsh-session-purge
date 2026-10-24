# Builds a throwaway, fully isolated DSH home for the browser probes
# (tools/dialog-probe*.mjs, tools/bin-live-probe.mjs).
#
# Nothing here touches the user's real ~/.dsh: the probe home lives inside this
# repo (gitignored as .probe-home/), the plugin is linked in with a junction, and
# the session fixture is copied from the DSH checkout's .playwright-mcp sandbox.
#
# Usage:
#   pwsh -NoProfile -File tools/probe-setup.ps1
#   $env:DSH_HOME = '<repo>\.probe-home'
#   dsh --profile web --no-open --port 3081 --host 127.0.0.1
#   node tools/bin-live-probe.mjs "http://127.0.0.1:3081/?token=<printed token>"
#
# Defaults are derived from this script's location and from the DSH checkout at
# D:\deepseek-harness. Override them when the pieces live elsewhere:
#   pwsh -NoProfile -File tools/probe-setup.ps1 -SourceHome D:\other\devhome
param(
    [string]$Repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
    [string]$SourceHome = 'D:\deepseek-harness\.playwright-mcp\devhome',
    [string]$NordRepo = 'D:\deepseek-harness\dsh-nord'
)
$ErrorActionPreference = 'Stop'

if (-not (Test-Path $SourceHome)) {
    throw "probe fixture home not found: $SourceHome (pass -SourceHome <path to .playwright-mcp\devhome>)"
}
if (-not (Test-Path (Join-Path $SourceHome 'profiles\web\package.json'))) {
    throw "probe fixture is not a DSH home (no profiles\web\package.json): $SourceHome"
}

$probeHome = Join-Path $Repo '.probe-home'

if (Test-Path $probeHome) { Remove-Item $probeHome -Recurse -Force }

New-Item -ItemType Directory -Path "$probeHome\profiles\web\node_modules" -Force | Out-Null

foreach ($f in @('package.json', 'cordis.yml', 'cordis.patch.yml', 'pnpm-lock.yaml', 'pnpm-workspace.yaml')) {
    $from = Join-Path $SourceHome "profiles\web\$f"
    if (Test-Path $from) { Copy-Item $from (Join-Path $probeHome 'profiles\web') -Force }
}
foreach ($f in @('settings.yaml', '.anonymous-user-id', '.credentials.yaml')) {
    if (Test-Path (Join-Path $SourceHome $f)) { Copy-Item (Join-Path $SourceHome $f) $probeHome -Force }
}
foreach ($d in @('sessions', 'storages')) {
    if (Test-Path (Join-Path $SourceHome $d)) {
        Copy-Item (Join-Path $SourceHome $d) (Join-Path $probeHome $d) -Recurse -Force
    }
}

if (Test-Path $NordRepo) {
    New-Item -ItemType Junction -Path "$probeHome\profiles\web\node_modules\dsh-nord" -Target $NordRepo | Out-Null
}
else {
    # Only the token-override probes need this third-party theme; its absence must
    # not stop the isolated instance from booting, so drop it from the profile too.
    Write-Warning "third-party theme fixture missing: $NordRepo - skipping the dsh-nord junction"
}
New-Item -ItemType Junction -Path "$probeHome\profiles\web\node_modules\dsh-session-purge" -Target $Repo | Out-Null

# Register the plugin as a profile layer (the profile.json is rewritten, not merged).
$manifestPath = "$probeHome\profiles\web\package.json"
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$manifest.dependencies | Add-Member -NotePropertyName 'dsh-session-purge' -NotePropertyValue "link:$Repo" -Force
if (-not (Test-Path $NordRepo)) {
    $manifest.dependencies.PSObject.Properties.Remove('dsh-nord')
    $manifest.dsh.profile.bundles = @($manifest.dsh.profile.bundles | Where-Object { $_ -ne 'dsh-nord' })
}
if ($manifest.dsh.profile.bundles -notcontains 'dsh-session-purge') {
    $manifest.dsh.profile.bundles = @($manifest.dsh.profile.bundles) + 'dsh-session-purge'
}
$manifest | ConvertTo-Json -Depth 10 | Set-Content $manifestPath -Encoding utf8

Write-Host "probe home ready: $probeHome"
Write-Host "plugin: $Repo"
Get-Content $manifestPath -Raw
