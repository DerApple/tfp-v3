<#
  Legt ein neues App-Repo aus der TFP-Fabrik an.
  Aufruf:  .\new-app.ps1 -Name ats-direktvermittlung -Idee "ATS fuer Personalberater in der Direktvermittlung"
  Optional: -Root C:\Projekte\apps  -RepoUrl https://github.com/DerApple/<name>.git  -NoGitHub

  Jedes App-Repo gehoert von Anfang an auf GitHub (die Agenten pushen jede fertige Aufgabe dorthin):
  - mit gh (GitHub CLI, angemeldet): Repo wird automatisch privat angelegt.
  - ohne gh: vorher auf github.com ein LEERES privates Repo anlegen (ohne README) und -RepoUrl angeben.
  - -NoGitHub nur fuer Wegwerf-Experimente: origin ist dann ein lokaler Ordner, nichts verlaesst den Rechner.
#>
param(
  [Parameter(Mandatory)][ValidatePattern('^[a-z0-9-]+$')][string]$Name,
  [Parameter(Mandatory)][string]$Idee,
  [string]$Root = "C:\Projekte\apps",
  [string]$GitHubOwner = "DerApple",
  [string]$RepoUrl,
  [switch]$NoGitHub
)
$ErrorActionPreference = "Stop"
$Tfp  = Split-Path $PSScriptRoot -Parent
$Dest = Join-Path $Root $Name
if (Test-Path $Dest) { throw "Ordner existiert bereits: $Dest" }
$Setup = & (Join-Path $PSScriptRoot "check-setup.ps1") -Quiet
if (-not $Setup.Ok) {
  & (Join-Path $PSScriptRoot "check-setup.ps1") | Out-Null
  throw "Rechner noch nicht bereit (fehlt: $($Setup.Missing -join ', ')). Anleitung steht oben; danach erneut starten."
}
$HasGh = $Setup.Gh
if (-not $NoGitHub -and -not $RepoUrl -and -not $HasGh) {
  throw ("Kein GitHub-Ziel: GitHub CLI (gh) ist nicht installiert/angemeldet und -RepoUrl fehlt. Entweder einmalig " +
         "'winget install GitHub.cli' und 'gh auth login', oder auf github.com ein leeres privates Repo '$Name' " +
         "anlegen (ohne README) und erneut starten mit -RepoUrl https://github.com/$GitHubOwner/$Name.git")
}
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
$ErrorActionPreference = "Continue"   # Git schreibt harmlose Warnungen (LF/CRLF) nach stderr; Fehler pruefen wir per $LASTEXITCODE
git init -b main | Out-Null
git add -A
git commit -m "Init aus TFP-Fabrik: $Name" | Out-Null
if ($NoGitHub) {
  # Nur auf ausdruecklichen Wunsch: lokales Bare-Repo als origin (Agenten brauchen ein origin).
  $Bare = Join-Path $Root "_remotes\$Name.git"
  New-Item -ItemType Directory -Force -Path (Split-Path $Bare) | Out-Null
  git init --bare -b main $Bare | Out-Null
  git remote add origin $Bare
  git push -u origin main | Out-Null
  Write-Warning "-NoGitHub: origin = $Bare (nur auf diesem Rechner, kein Backup)."
} elseif ($RepoUrl) {
  git remote add origin $RepoUrl
  git push -u origin main
  if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Push nach $RepoUrl fehlgeschlagen (Repo leer? angemeldet?). Ordner $Dest bleibt, origin ist gesetzt." }
} else {
  gh repo create "$GitHubOwner/$Name" --private --source . --push
  if ($LASTEXITCODE -ne 0) { Pop-Location; throw "gh repo create fehlgeschlagen. Repo von Hand anlegen und im Ordner ${Dest}: git remote add origin <url>; git push -u origin main" }
}
Write-Host "origin = $(git remote get-url origin)"
Pop-Location
Write-Host "Fertig: $Dest" -ForegroundColor Green
Write-Host "Naechster Schritt: Claude Code in $Dest starten und Phase 1 (Recherche) beginnen."
