# Review nach dem autonomen Bau (Phase 5)

In eine neue Claude-Code-Session im App-Repo kopieren:

---
Das Board ist abgearbeitet. Führe das Abnahme-Review durch und ändere dabei noch keinen Code:
1. `git pull`, `python tasks.py status`: offene, gehaltene (held), verworfene Tasks auflisten.
2. `python tasks.py assumptions`: alle unbestätigten Annahmen als Tabelle (Task, Annahme, Risiko hoch/mittel/niedrig, Empfehlung bestätigen/ändern).
3. Projekt-Check (`.taskcheck`) und alle Tests ausführen, Ergebnis berichten.
4. App nach CLAUDE.md starten und die Testszenarien aus SPEC.md durchgehen (wenn möglich im Browser). Pro Szenario: ok / fehlerhaft / fehlt.
5. Abgleich SPEC vs. Ist: welche Must-haves fehlen oder sind nur angedeutet?
6. Zusammenhang: doppelte Logik, uneinheitliche Muster/Benennung, Abweichungen von ARCHITECTURE.md (relevant bei mehreren parallelen Agenten). Von Agenten geänderte SPEC-Stellen auflisten.
7. Doku-Check: stimmen README, CLAUDE.md, ARCHITECTURE.md mit dem Code überein?
8. Ergebnis in `docs/REVIEW-<datum>.md` schreiben: Zusammenfassung, Befunde nach Priorität (Demo-Blocker > Must-have > Rest), vorgeschlagene Folge-Tasks im TFP-Format.
Danach mir eine Kurzfassung geben und fragen, welche Befunde ich als Tasks anlegen oder direkt mit dir iterativ lösen will.
---
