<#
  Prueft, ob dieser Rechner fuer die App-Fabrik bereit ist. Aendert nichts, installiert nichts.
  Aufruf:  .\check-setup.ps1            (Tabelle + Anleitung fuer alles, was fehlt)
           .\check-setup.ps1 -Quiet     (nur Ergebnis; fuer new-app.ps1)
  Rueckgabe: Objekt mit Ok (Pflicht erfuellt), Gh (GitHub CLI angemeldet), Missing (Liste).
  Exit-Code (bei direktem Aufruf): 0 = bereit, 1 = Pflicht fehlt.
#>
param([switch]$Quiet)

function Ver([string]$cmd, [string[]]$a) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { return $null }
  try { $o = & $cmd @a 2>$null | Select-Object -First 1; if ($o) { return "$o".Trim() } else { return "" } } catch { return $null }
}
function Major([string]$v) { if ($v -match '(\d+)\.(\d+)') { return [int]$Matches[1] * 100 + [int]$Matches[2] } else { return 0 } }

$rows = @()
function Add($name, $ok, $found, $required, $fix) {
  $script:rows += [pscustomobject]@{ Name = $name; Ok = [bool]$ok; Gefunden = $found; Pflicht = $required; Abhilfe = $fix }
}

# Pflicht
$git = Ver git @('--version')
Add "Git" ($null -ne $git) $git $true "winget install Git.Git  (danach Terminal neu oeffnen)"

$gu = if ($git) { (git config --global user.name) } else { $null }
$ge = if ($git) { (git config --global user.email) } else { $null }
Add "Git-Name/E-Mail" ($gu -and $ge) "$gu <$ge>" $true 'git config --global user.name "Vorname Nachname"; git config --global user.email "du@example.com"'

$pyCmd = if (Get-Command python -ErrorAction SilentlyContinue) { "python" } elseif (Get-Command py -ErrorAction SilentlyContinue) { "py" } else { $null }
$py = if ($pyCmd) { Ver $pyCmd @('--version') } else { $null }
if ($py -match 'was not found|Microsoft Store') { $py = $null }   # Windows-Platzhalter ohne echtes Python
Add "Python >= 3.10" ($py -and (Major ($py -replace 'Python ', '')) -ge 310) $py $true "winget install Python.Python.3.13  (danach Terminal neu oeffnen)"

$node = Ver node @('--version')
Add "Node.js >= 22" ($node -and (Major ($node.TrimStart('v'))) -ge 2200) $node $true "winget install OpenJS.NodeJS.LTS"

$claude = Ver claude @('--version')
Add "Claude Code (CLI)" ($null -ne $claude) $claude $true "npm install -g @anthropic-ai/claude-code, dann einmal 'claude' starten und anmelden"

$key = [Environment]::GetEnvironmentVariable("ANTHROPIC_API_KEY")
Add "ANTHROPIC_API_KEY nicht gesetzt" (-not $key) ($(if ($key) { "gesetzt" } else { "nicht gesetzt" })) $true "Variable entfernen (sonst rechnen die Agenten ueber die API ab statt ueber das Abo)"

# Empfohlen
$ghV = Ver gh @('--version')
$ghAuth = $false
if ($ghV) { gh auth status *> $null; $ghAuth = ($LASTEXITCODE -eq 0) }
$ghFound = if (-not $ghV) { $null } elseif ($ghAuth) { "$ghV (angemeldet)" } else { "$ghV (NICHT angemeldet)" }
Add "GitHub CLI (gh)" $ghAuth $ghFound $false "winget install GitHub.cli, dann: gh auth login  (GitHub.com, HTTPS, im Browser anmelden). Ohne gh: Repo von Hand auf github.com anlegen und new-app.ps1 -RepoUrl nutzen."

$missing = @($rows | Where-Object { $_.Pflicht -and -not $_.Ok } | ForEach-Object Name)
$result = [pscustomobject]@{ Ok = ($missing.Count -eq 0); Gh = $ghAuth; Missing = $missing; Rows = $rows }

if (-not $Quiet) {
  $rows | ForEach-Object {
    $mark = if ($_.Ok) { "OK  " } elseif ($_.Pflicht) { "FEHLT" } else { "EMPF." }
    "{0,-6} {1,-32} {2}" -f $mark, $_.Name, $_.Gefunden
  } | Out-Host
  $todo = $rows | Where-Object { -not $_.Ok }
  if ($todo) {
    "`nSo beheben:" | Out-Host
    $todo | ForEach-Object { "- $($_.Name): $($_.Abhilfe)" } | Out-Host
  }
  if ($result.Ok) { "`nBereit." | Out-Host } else { "`nNoch nicht bereit: $($missing -join ', ')" | Out-Host }
}
if ($MyInvocation.InvocationName -ne '.' -and -not $Quiet) { exit ([int](-not $result.Ok)) }
$result
