Set-StrictMode -Version Latest
$ErrorActionPreference = "SilentlyContinue"

$processPatterns = @(
  "havenai-agent",
  "HavenAI"
)

foreach ($pattern in $processPatterns) {
  Get-Process | Where-Object { $_.ProcessName -like "$pattern*" } | ForEach-Object {
    try { Stop-Process -Id $_.Id -Force } catch {}
  }
}

# Fallback process-tree kill for stubborn processes.
foreach ($pattern in $processPatterns) {
  try { & taskkill /F /T /IM "$pattern.exe" | Out-Null } catch {}
}

$targets = @(
  (Join-Path $env:USERPROFILE ".havenai"),
  (Join-Path $env:APPDATA "havenai"),
  (Join-Path $env:APPDATA "HavenAI"),
  (Join-Path $env:LOCALAPPDATA "havenai"),
  (Join-Path $env:LOCALAPPDATA "HavenAI")
)

foreach ($target in $targets) {
  if ([string]::IsNullOrWhiteSpace($target)) { continue }
  $expanded = [System.IO.Path]::GetFullPath($target)
  if ($expanded -notlike "$env:USERPROFILE*") { continue }
  if (Test-Path -LiteralPath $expanded) {
    try { Remove-Item -LiteralPath $expanded -Recurse -Force } catch {}
  }
}

exit 0
