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
- Nichts bauen, was nicht in SPEC.md steht. Fehlt etwas: `python tasks.py assume` bzw. neuer Task.
- Externe Systeme (Portale, Mail, Kalender, KI) nur über Adapter-Interfaces aus ARCHITECTURE.md. Mock-Adapter für Tests/Demo.
- Testdaten nur synthetisch.
- Doku ist Teil von Done: ändert sich Verhalten, Befehl oder Architektur, im selben Task SPEC/ARCHITECTURE/README nachziehen.
- Diese Datei kurz halten (< 80 Zeilen). Details in docs/.
