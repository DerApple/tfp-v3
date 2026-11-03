# {{APP_NAME}}

Kurzbeschreibung: {{APP_IDEA}}

## Wo was steht (zuerst lesen, nicht den ganzen Code)
- `SPEC.md`: Was gebaut wird, MVP, Nicht-Ziele, Geschäftsregeln, Testszenarien. Maßgeblich.
- `docs/ARCHITECTURE.md`: Aufbau, Module, Datenmodell, Integrations-Adapter
- `docs/adr/`: Architekturentscheidungen (warum)
- `docs/research/`: Fachrecherche (Markt, Prozesse, Integrationen, Recht). Bei fachlichen Fragen hier nachsehen, dann erst im Web.
- `AGENTS.md`: Task-Protokoll (TFP), `tasks/`: Board

## Befehle
<!-- in Phase 3 ausfüllen: install, dev-server, test, lint, build -->

## Regeln
- Nichts bauen, was nicht in SPEC.md steht.
- **Autonom entscheiden, nie auf Menschen warten.** Fachliche Unklarheit: vernünftigste Option wählen, die zu SPEC.md passt, und sofort `python tasks.py assume <id> "<Annahme + Grund>"`. `hold` NUR bei technischen Blockern (externer Zugang fehlt), nie für fachliche Fragen.
- **Recherche-Lücke:** Steht die Antwort nicht in `docs/research/` und ist sie für den Task entscheidend, lege `python tasks.py new research-<thema> "<Frage>" --touches docs/research/<thema>.md` an (Ergebnis: eine Datei mit Quellen, Websuche erlaubt) und mache den abhängigen Task davon abhängig oder entscheide per `assume` weiter. Max. 1 Recherche-Task pro Auslöser, keine Recherche-Ketten.
- Änderst du SPEC.md (Lücke, Präzisierung), protokolliere es zusätzlich per `assume`, damit es im Review sichtbar ist.
- Dateien immer mit dem Write/Edit-Werkzeug schreiben, nie per Shell-Heredoc (scheitert unter Windows).
- Externe Systeme (Portale, Mail, Kalender, KI) nur über Adapter-Interfaces aus ARCHITECTURE.md. Mock-Adapter für Tests/Demo.
- Testdaten nur synthetisch.
- Doku ist Teil von Done: ändert sich Verhalten, Befehl oder Architektur, im selben Task SPEC/ARCHITECTURE/README nachziehen.
- Diese Datei kurz halten (< 80 Zeilen). Details in docs/.
