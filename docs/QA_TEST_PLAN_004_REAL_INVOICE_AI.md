# QA TEST PLAN 004 — Real Invoice AI Stability

Projekt: FinancePro  
Ziel: sicherstellen, dass GPT-4o mini Integration stabil und realistisch funktioniert

---

## 1. Testdaten

Mindestens folgende Testfälle müssen im Projekt als Demo/Test Fixtures vorhanden sein:

1. einfache Standardrechnung mit 20 % USt
2. mehrseitige Rechnung mit Positionen über mehrere Seiten
3. Rechnung mit finaler Summe nur auf letzter Seite
4. Rechnung mit 0,00 USt und Hinweis „kein steuerbarer Vorgang“
5. Kostenvorschreibung oder Zahlungsaufforderung ohne klassische USt
6. Rechnung mit fehlender Rechnungsnummer
7. Rechnung mit falschem Steuerbetrag
8. Rechnung mit niedriger Scanqualität
9. Rechnung mit mehreren Steuersätzen
10. Rechnung mit Rabattpositionen

---

## 2. Kritische Tests

### Test 1 — App ohne API-Key

Erwartung:

- App startet
- Uploadseite funktioniert
- Mock-Modus sichtbar
- keine Server-Crashes

### Test 2 — AI-Key fehlt während Analyse

Erwartung:

- verständliche Fehlermeldung
- keine Endlosschleife
- Rechnung bleibt im Status `ai_failed` oder `needs_review`

### Test 3 — Mehrseiten-PDF

Erwartung:

- pageCount korrekt
- Seiten werden angezeigt
- Positionen werden zusammengeführt
- finale Summe wird erkannt

### Test 4 — 0,00 USt

Erwartung:

- nicht automatisch als Fehler markieren
- Sonderfall anzeigen
- Quelle des Sonderfalltexts anzeigen

### Test 5 — Falsches JSON von AI simulieren

Erwartung:

- Schemafehler wird gespeichert
- UI zeigt Analysefehler
- Nutzer kann manuell prüfen

### Test 6 — Niedrige Confidence

Erwartung:

- Feld wird markiert
- Review erforderlich
- Export gesperrt bis Review

### Test 7 — Manuelle Korrektur

Erwartung:

- Feld kann geändert werden
- Audit Log enthält alten und neuen Wert
- Validierung läuft neu
- Export verwendet korrigierten Wert

### Test 8 — Keine automatische Reanalyse

Erwartung:

- Reload löst keine neue AI-Kosten aus
- Analyse nur per Button oder beim ersten Upload

---

## 3. Build-Gates

Vor Abschluss ausführen:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Kein Gate darf fehlschlagen.

---

## 4. Manuelle Abnahme

Die App ist abnahmefähig, wenn:

- Dashboard funktioniert
- Upload funktioniert
- Detailseite funktioniert
- AI/Mock Status sichtbar ist
- Felder mit Confidence sichtbar sind
- Review Flow funktioniert
- Export kontrolliert funktioniert
- README erklärt Setup verständlich

