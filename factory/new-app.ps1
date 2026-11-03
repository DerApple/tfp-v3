<#
  Legt ein neues App-Repo aus der TFP-Fabrik an.
  Aufruf:  .\new-app.ps1 -Name ats-direktvermittlung -Idee "ATS fuer Personalberater in der Direktvermittlung"
  Optional: -Root C:\Projekte\apps  -NoGitHub
#>
param(
  [Parameter(Mandatory)][ValidatePattern('^[a-z0-9-]+$')][string]$Name,
  [Parameter(Mandatory)][string]$Idee,
  [string]$Root = "C:\Projekte\apps",
  [string]$GitHubOwner = "DerApple",
  [switch]$NoGitHub
)
$ErrorActionPreference = "Stop"
$Tfp  = Split-Path $PSScriptRoot -Parent
$Dest = Join-Path $Root $Name
if (Test-Path $Dest) { throw "Ordner existiert bereits: $Dest" }
New-Item -ItemType Directory -Force -Path $Dest | Out-Null

# 1. TFP-Werkzeuge + Dashboard
foreach ($f in "tasks.py","agents.py","board.py","repos.py","AGENTS.md",".gitignore") {
  Copy-Item (Join-Path $Tfp $f) $Dest
}
Copy-Item (Join-Path $Tfp "dashboard") $Dest -Recurse
Get-ChildItem (Join-Path $Dest "dashboard") -Recurse -Directory -Filter "__pycache__" | Remove-Item -Recurse -Force

# 2. Fabrik-Vorlage
Copy-Item (Join-Path $PSScriptRoot "template\*") $Dest -Recurse -Force

# 3. Platzhalter ersetzen (UTF-8 ohne BOM)
$utf8 = New-Object System.Text.UTF8Encoding $false
Get-ChildItem $Dest -Recurse -File -Include *.md | ForEach-Object {
  $t = [IO.File]::ReadAllText($_.FullName, $utf8)
  if ($t -match '\{\{APP_') {
    $t = $t.Replace('{{APP_NAME}}', $Name).Replace('{{APP_IDEA}}', $Idee)
    [IO.File]::WriteAllText($_.FullName, $t, $utf8)
  }
}

# 4. Git
Push-Location $Dest
git init -b main | Out-Null
git add -A
git commit -m "Init aus TFP-Fabrik: $Name" | Out-Null
$remoteOk = $false
if (-not $NoGitHub -and (Get-Command gh -ErrorAction SilentlyContinue)) {
  gh repo create "$GitHubOwner/$Name" --private --source . --push
  if ($LASTEXITCODE -eq 0) { $remoteOk = $true }
}
if (-not $remoteOk) {
  # Ersatz: lokales Bare-Repo als origin (Agenten brauchen ein origin). Spaeter auf GitHub umstellen.
  $Bare = Join-Path $Root "_remotes\$Name.git"
  New-Item -ItemType Directory -Force -Path (Split-Path $Bare) | Out-Null
  git init --bare -b main $Bare | Out-Null
  git remote add origin $Bare
  git push -u origin main | Out-Null
  Write-Warning "Kein GitHub-Repo angelegt (gh fehlt oder -NoGitHub). origin = $Bare"
  Write-Host  "Spaeter, wenn das Board fertig ist: gh repo create $GitHubOwner/$Name --private, dann im App-Ordner:"
  Write-Host  "  git remote set-url origin https://github.com/$GitHubOwner/$Name.git; git push -u origin main"
}
Pop-Location
Write-Host "Fertig: $Dest" -ForegroundColor Green
Write-Host "Naechster Schritt: Claude Code in $Dest starten und Phase 1 (Recherche) beginnen."
