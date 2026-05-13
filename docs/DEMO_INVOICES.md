# Demo Invoices

`prisma/seed.ts` legt sieben Demo-Belege an.

## 1. Gültige Standardrechnung mit 20 % USt

`demo-standard-20` von ViennaOffice Supplies GmbH mit korrekter Netto/USt/Brutto-Berechnung und freigegebenem Buchungsvorschlag.

## 2. Mehrseitige Mietrechnung / Eventtechnik

`demo-rental-event-4p` umfasst vier Seiten, Eventtechnik-Positionen über mehrere Seiten, 10-%-Rabatte, eine 100-%-Rabattposition, Projekt-/Angebots-/Lieferscheinnummern und Footer-Daten auf Seite 4. Die finale Summenbox liegt auf Seite 4.

## 3. Kostenvorschreibung mit 0,00 USt

`demo-cost-assessment-zero-tax` enthält Kundennummer, Zahlungsreferenz, Bankdaten und den Hinweis „Keine Umsatzsteuer, da kein steuerbarer Vorgang vorliegt.“ Die Validierung markiert den 0,00-USt-Fall als plausibel.

## 4. Rechnung mit fehlender Rechnungsnummer

`demo-missing-invoice-number` erzeugt einen formalen Fehler und blockiert Export.

## 5. Rechnung mit falscher Steuerberechnung

`demo-wrong-tax` hat 20 % Steuersatz, aber nur 150 EUR USt auf 1.000 EUR netto. Zusätzlich weicht die IBAN von bekannten Lieferantendaten ab.

## 6. Rechnung mit fehlender Seite

`demo-missing-page` enthält Seite 1 und 3 von 3. Die fehlende Seite 2 wird als Warnung und Risiko angezeigt.

## 7. Rechnung mit unscharfem Scanstatus

`demo-blurry-duplicate` ist eine unscharfe Version einer bereits vorhandenen Rechnung und erzeugt Dokumentqualitäts- sowie Doppelungsrisiko.
