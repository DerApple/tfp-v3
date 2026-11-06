# App-Factory (auf TFP)

Aus einer Ein-Satz-Idee entsteht autonom eine App: 1 Recherche → 2 Spec (+ Freigabe) → 3 Grundgerüst → 4 autonomer Bau mit TFP-Agenten → 5 Review.
Jede App bekommt **von Anfang an ein eigenes privates GitHub-Repo**; die Agenten pushen jede fertige Aufgabe dorthin.

## Neue App starten

Zwei Einstiege, ein Ergebnis. Beide folgen [`PIPELINE.md`](PIPELINE.md).

**A. Mit dem Claude-Skill:** In der Claude-Code-App sagen: „Baue mir eine App für …“ oder `/app-factory`.
Der Skill holt sich dieses Repo selbst (falls es auf dem Rechner noch fehlt) und folgt `PIPELINE.md`.

**B. Von GitHub aus (ohne Skill):**
1. Dieses Repo klonen, z. B. nach `C:\Projekte\tfp-v3`:
   ```
   git clone https://github.com/DerApple/tfp-v3.git C:\Projekte\tfp-v3
   ```
2. Claude Code in diesem Ordner öffnen und sagen:
   **„Starte eine neue App nach factory/PIPELINE.md. Idee: …“**

In beiden Fällen prüft Claude zuerst den Rechner (`check-setup.ps1`), empfiehlt die GitHub CLI und hilft beim Einrichten, und legt dann mit `new-app.ps1` das App-Repo samt GitHub-Ziel an.

## Dateien

- `PIPELINE.md`: die maßgebliche Anleitung für alle Phasen (hier verbessern, nicht im Skill)
- `check-setup.ps1`: prüft Git, Git-Name/E-Mail, Python, Node, Claude Code, `ANTHROPIC_API_KEY`, GitHub CLI; zeigt, wie man Fehlendes installiert. Ändert nichts.
- `new-app.ps1`: legt das App-Repo an (TFP-Werkzeuge, Dashboard, Vorlagen, Git, GitHub-Repo per `gh` oder `-RepoUrl`). Bricht ab, wenn der Rechner nicht bereit ist oder kein GitHub-Ziel da ist.
- `template/`: CLAUDE.md, BRIEF.md, .claude/settings.json, Qualitäts-Subagenten, docs-Gerüst, REVIEW-PROMPT.md
- `skills/app-factory/SKILL.md`: der Skill zum Hochladen in claude.ai (nur Einstieg, verweist auf `PIPELINE.md`)

Verbesserungen an der Pipeline nur hier pflegen, nicht in den App-Repos. Bestehende Apps bekommen neue TFP-Versionen nicht automatisch; bei Bedarf `tasks.py`, `agents.py`, `board.py`, `repos.py`, `AGENTS.md` und `dashboard/` hinüberkopieren.
