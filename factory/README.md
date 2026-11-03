# App-Fabrik (auf TFP)

Pipeline: 1 Recherche -> 2 Spec (+ Freigabe durch Raphael) -> 3 Grundgerüst -> 4 autonomer Bau mit TFP -> 5 Review.
Gesteuert über den Claude-Skill `app-pipeline`.

- `new-app.ps1`: legt ein neues App-Repo an (TFP-Werkzeuge, Dashboard, Vorlagen, Git, optional GitHub privat via `gh`)
- `template/`: CLAUDE.md, BRIEF.md, .claude/settings.json (inkl. WebSearch/WebFetch, kein git push), Qualitäts-Subagenten, docs-Gerüst, REVIEW-PROMPT.md

Verbesserungen an der Pipeline nur hier pflegen, nicht in den App-Repos.
