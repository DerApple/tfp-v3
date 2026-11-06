---
name: "app-factory"
description: "Neue App aus einer Ein-Satz-Idee möglichst autonom bauen: Recherche, Spec, Grundgerüst, autonomer Bau mit TFP, Review. Nutzen bei 'baue mir eine App/ein Tool für…', '/app-factory', 'App-Factory', 'neues App-Projekt starten'."
---

# App-Factory (Einstieg)

Die eigentliche Anleitung liegt versioniert im GitHub-Repo **`DerApple/tfp-v3`**, Datei `factory/PIPELINE.md`. Dieser Skill sorgt nur dafür, dass sie auf dem Rechner da und aktuell ist, und folgt ihr dann. So ist es egal, ob jemand mit dem Skill oder direkt im Repo beginnt.

1. **Fabrik-Repo finden:** Prüfe der Reihe nach `C:\Users\nevriera\Automation\tfp-v3`, `C:\Projekte\tfp-v3`, `$HOME\tfp-v3` (Ordner mit `factory\PIPELINE.md`). Gefunden: dort `git pull`.
2. **Nicht gefunden:** Ist `git` nicht installiert, dem Nutzer `winget install Git.Git` geben (Terminal danach neu öffnen) und warten. Dann klonen: `git clone https://github.com/DerApple/tfp-v3.git C:\Projekte\tfp-v3`. Schlägt das wegen fehlender Anmeldung fehl: Das Repo ist privat; der Nutzer meldet sich im aufgehenden GitHub-Fenster an (oder `gh auth login`, falls die GitHub CLI installiert ist).
3. **`factory/PIPELINE.md` vollständig lesen und ab Phase 0 genau befolgen** (Rechner prüfen mit `check-setup.ps1`, GitHub CLI empfehlen oder Repo von Hand anlegen lassen, `new-app.ps1`, dann Phasen 1–5). `<tfp>` in der Anleitung ist der Ordner aus Schritt 1/2.

Nichts aus früheren Fassungen dieses Skills verwenden: Gilt etwas anderes als in `PIPELINE.md`, gilt `PIPELINE.md`.
