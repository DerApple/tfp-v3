# App-Pipeline (App-Fabrik) – v3

Diese Datei ist die einzige maßgebliche Anleitung. Der Claude-Skill `app-pipeline` und der Einstieg über GitHub (README) führen beide hierher.

Ziel: Aus einer kurzen Idee entsteht autonom ein lauffähiges MVP. Raphael wird **nur zu Beginn** gefragt (Spec-Fragen in dieser Session). Ab dem Start des Baus gibt es **keine Stopps** mehr: Agenten entscheiden selbst und protokollieren Annahmen. Raphael prüft am Ende im Review.

**Werkzeuge:** Fabrik = dieses Repo `DerApple/tfp-v3`, Ordner `factory/` (im Folgenden `<tfp>` = lokaler Ordner des Repos). Skripte `check-setup.ps1`, `new-app.ps1`, Vorlage `template/`. App-Repos: `C:\Projekte\apps\<name>` (änderbar mit `-Root`), GitHub `DerApple/<name>` (privat) **von Anfang an**: Die Agenten pushen jede fertige Aufgabe dorthin. Nie ein lokales Ersatz-Repo als Dauerlösung. Windows, PowerShell, Claude Max.

## Anleitungen an Raphael (immer)
- Befehle als **einen kopierbaren Block, der mit `cd <absoluter Pfad>` beginnt**. Nie Befehle ohne Ordnerangabe.
- Sagen, ob ein Fenster offen bleiben muss (z. B. `npm run dev`) und wie man beendet (Strg+C).
- Schritte, die erst später dran sind, NICHT als ausführbaren Befehl jetzt ausgeben, sondern als „später, wenn …“ kennzeichnen.
- Am Ende jeder Phase in 3–5 Zeilen: Stand, was Raphael jetzt tun kann (Block), was als Nächstes passiert.

## Phase 0: Rechner, GitHub, Start
1. **Rechner prüfen:** `cd <tfp>\factory; .\check-setup.ps1`. Fehlt etwas Pflichtiges (Git, Git-Name/E-Mail, Python, Node, Claude Code, kein `ANTHROPIC_API_KEY`): Raphael die angezeigte Abhilfe als kopierbaren Block geben, Schritt für Schritt begleiten, danach erneut prüfen. Nicht weitermachen, bevor „Bereit.“ erscheint.
2. **GitHub CLI (`gh`):** Ist sie nicht angemeldet, Raphael empfehlen, sie einmalig einzurichten (dann legt die Fabrik Repos selbst an): `winget install GitHub.cli`, Terminal neu öffnen, `gh auth login` (GitHub.com → HTTPS → „Login with a web browser“). Will Raphael das nicht: Er legt auf github.com ein **leeres privates** Repo `<name>` an (Neues Repository, Private, ohne README/.gitignore/Lizenz) und nennt die URL. Beides ist ok; ein lokales Repo ohne GitHub nur auf ausdrücklichen Wunsch (`-NoGitHub`).
3. Idee, kurzen Namen (a-z, 0-9, -) und **Größe** festlegen (selbst einschätzen, in einer Zeile nennen). Fehlt der Name, einen vorschlagen. Sonst keine Rückfragen.
   - **S** – Einzelwerkzeug ohne Speicherung/Login (z. B. Rechner): 2 Recherche-Teile (Fachprozess+Recht, Markt+UX), reine Frontend-App, 3–4 Stories, 4–8 Tasks, 1 Agent.
   - **M** – App mit Daten, ohne echte Integrationen: 4 Recherche-Teile, Frontend + lokale DB, 5–8 Stories, 10–20 Tasks, 2 Agenten.
   - **L** – Fachanwendung mit Rollen und Integrationen (ATS, Makler-Tool): alle 5 Recherche-Teile, Fullstack, Adapter-Schicht, 8–12 Stories, 20–40 Tasks, 3–4 Agenten.
4. `cd <tfp>; git pull` (neuester Fabrik-Stand), dann `cd <tfp>\factory; .\new-app.ps1 -Name <name> -Idee "<idee>"` mit `-RepoUrl https://github.com/DerApple/<name>.git`, falls ohne `gh`. Das Skript prüft den Rechner erneut und bricht ohne GitHub-Ziel ab. Danach prüfen: `git -C C:\Projekte\apps\<name> remote get-url origin` zeigt auf github.com.
5. Ab jetzt im App-Ordner arbeiten. Nach jeder Phase committen und pushen. Dateien immer mit Write/Edit schreiben, nie per Shell-Heredoc (scheitert unter Windows).

## Phase 1: Recherche (autonom, parallel)
Subagenten parallel mit Websuche, je eine Datei in `docs/research/` mit Quellen-URLs (Anzahl nach Größe):
- `markt.md`: 5–8 relevante Wettbewerber (DACH zuerst): Kernfunktionen, Preismodell, Zielgruppe, Lob/Kritik der Nutzer, Feature-Matrix.
- `ux-muster.md`: Aufbau dieser Tools (Navigation, Hauptansichten, typische Screens, Listen/Kanban/Detail), Branchenstandard.
- `prozesse.md`: realer Arbeitsablauf Schritt für Schritt, Artefakte, Kennzahlen, Rollen, Schmerzpunkte.
- `integrationen.md` (nur M/L): genutzte Tools/Systeme, Standards/APIs/Formate (Zugang, Kosten, Machbarkeit), was davon das MVP braucht.
- `recht.md`: DSGVO und fachliche Rechtsregeln, die die Software betreffen, mit Quelle (kein Rechtsrat).
Bei S werden Teile zusammengelegt. Danach selbst `zusammenfassung.md` (10 wichtigste Erkenntnisse für das Produkt). Quellen: Gesetze, Behörden, Hersteller, Doku, Verbände; Foren nur als Nutzerstimmen. Commit.

## Phase 2: Spec + Fragen (einziger Stopp)
`SPEC.md` aus BRIEF.md + Recherche (BMAD-Stil: PRD):
1. Problem, Zielnutzer, Personas (max. 2)
2. Must-have-Stories (Anzahl nach Größe) mit nummerierten Geschäftsregeln
3. **Nicht-Ziele** (explizit, inkl. bewusst verschobener Integrationen)
4. Datenmodell grob (Entitäten, Pflichtfelder, Beziehungen)
5. Rollen & Rechte (falls vorhanden)
6. Integrationen: welche im MVP als Mock-Adapter, welche echt
7. Testszenarien T1…Tn (beobachtbar, mit erwartetem Ergebnis), inkl. Demo-Pfad (5 min)
8. Annahmen-Liste

Dann **AskUserQuestion** mit 3–5 Fragen zu den riskantesten fachlichen Annahmen (je mit empfohlener Option) plus Freigabe. Raphael hat Recruiting-Fachwissen: gezielt fragen. Antworten in BRIEF.md („Ergänzungen“) und SPEC.md. Alles, was jetzt nicht gefragt wird, entscheiden später die Agenten selbst. Ist Raphael nicht erreichbar: Empfehlungen übernehmen, oben in SPEC.md vermerken, weiter.

## Phase 3: Grundgerüst (ein Agent, diese Session)
1. Stack wählen, `docs/adr/0001-stack.md`. So einfach wie möglich, Bewährtes vor Neuem (S: Vite+React+TS ohne Server; M/L: TS-Fullstack lokal lauffähig, SQLite/Prisma oder Postgres via Docker). Vitest + Playwright.
2. Gerüst: Struktur, Datenmodell, ggf. Auth-Grundlage, Layout/Navigation nach ux-muster.md, bei L Adapter-Interfaces + Mock-Adapter für alle Integrationen, Seed mit synthetischen Demodaten.
3. **`.taskcheck` = genau EINE Zeile** (tasks.py liest nur die erste Zeile!), z. B. `([ -d node_modules ] || npm ci) && npm run check`. Das `npm ci`-Präfix sorgt dafür, dass frische Agenten-Kopien funktionieren. Unter 2 min, läuft in Git-Bash.
4. **Gegenprobe:** einmal einen Test absichtlich brechen und den Check ausführen → muss ROT sein; zurücksetzen → grün. Erst dann weiter. Ergebnis in `docs/PIPELINE-NOTIZEN.md`.
5. `docs/ARCHITECTURE.md` (max. 2 Seiten), Befehle in `CLAUDE.md`, `README.md` mit Startanleitung als Block inkl. `cd`.
6. `.claude/settings.json` an Stack anpassen (WebSearch/WebFetch bleiben, `git push` bleibt verboten). Commit + push.

## Phase 4: Board + autonomer Bau (TFP)
1. Tasks selbst aus SPEC ableiten. NICHT die Vorlagen aus `tfp-v3/templates/fullstack` kopieren (enthalten Hackathon-Texte), nur deren Frontmatter-Format übernehmen: title, status: todo, owner:, deps, touches, prio. Regeln: 30–90 min pro Task, `deps` + `touches` immer, beobachtbare Kriterien mit Bezug zu Story/Geschäftsregel/Testszenario, Doku-Pflege in der Definition of Done. Letzte Tasks: `e2e-smoke` (Demo-Pfad als Playwright-Test), `readme`.
2. `python tasks.py check`, commit, push.
3. `python agents.py start 1`, ersten Task bis `done` beobachten (verify-Belege, Check grün), dann auf die Agentenzahl der Größe erhöhen.
4. Dashboard für Raphael in eigenem Fenster starten und Adresse nennen. Raphael sagen: Agenten laufen unabhängig von dieser Session; Laptop wach, Netzteil.

**Kein Stopp im Lauf:** Agenten entscheiden fachliche Fragen per `assume`, legen bei Bedarf `research-<thema>`-Tasks an (Regeln in der CLAUDE.md der App). `hold` nur bei technischen Blockern. Keine Features außerhalb SPEC.

## Phase 5: Review (neue Session im App-Repo)
`docs/REVIEW-PROMPT.md` ausführen → `docs/REVIEW-<datum>.md`: Status, Annahmen-Tabelle mit Risiko, Check, Testszenarien, SPEC-Abgleich (inkl. Scope-Abweichungen gegen Nicht-Ziele), Doku-Abgleich. Startanleitung für Raphael als Block mit `cd`. Danach iterativ mit Raphael weiter (ein Agent, Plan Mode), Releases als Git-Tags (`v1`, `v2`).

## Leitplanken
- Qualität entsteht in Phase 1–2, dort nicht sparen, Phase 4 nicht vorziehen.
- Kein `ANTHROPIC_API_KEY` setzen (sonst API-Abrechnung).
- Erkenntnisse über die Pipeline selbst in `docs/PIPELINE-NOTIZEN.md` der App; Verbesserungen danach hier in `factory/PIPELINE.md` (bzw. den Skripten) pflegen, committen und pushen. Den Skill nur ändern, wenn sich der Einstieg ändert.