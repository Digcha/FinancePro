# FinancePro auf Azure deployen

Diese Variante passt zu deinem 200-USD-Azure-Guthaben:

- Azure Static Web Apps für das React/Vite-Frontend
- integrierte Azure Functions API im Ordner `api`
- Azure Blob Storage für Originalbelege
- Azure AI Document Intelligence für `prebuilt-invoice`
- EU-VIES-Prüfung über `GET /api/check-vat?uid=ATU...`

## 1. Ressourcen im Azure Portal anlegen

Erstelle eine Resource Group, zum Beispiel:

- Name: `rg-financepro-dev`
- Region: `West Europe`

Lege dann diese Ressourcen an:

1. **Static Web App**
   - Plan: `Free` für MVP
   - Build preset: `React`
   - App location: `/`
   - API location: `api`
   - Output location: `dist`

2. **Storage account**
   - Performance: `Standard`
   - Redundancy: `LRS`
   - Public access: disabled
   - Container: `invoices`

3. **Azure AI Document Intelligence**
   - Resource kind: `Document Intelligence` / `Form Recognizer`
   - Pricing tier: `F0` wenn verfügbar, sonst `S0`
   - Region: `West Europe`

## 2. App Settings setzen

In der Static Web App unter Configuration/App settings:

```txt
VITE_USE_AZURE_API=true
VITE_API_BASE_URL=
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://<name>.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=<key>
AZURE_DOCUMENT_INTELLIGENCE_API_VERSION=2024-11-30
AZURE_STORAGE_CONNECTION_STRING=<storage-connection-string>
AZURE_STORAGE_CONTAINER=invoices
```

Wichtig: `AZURE_DOCUMENT_INTELLIGENCE_KEY` und `AZURE_STORAGE_CONNECTION_STRING` gehören nur in Azure App Settings oder lokal in `api/local.settings.json`, niemals in GitHub.

## 3. Lokale Entwicklung

Frontend:

```bash
npm install
npm run dev
```

API:

```bash
cd api
npm install
cp local.settings.example.json local.settings.json
npm run build
npm run start
```

Danach im Projektroot `.env.local` anlegen:

```txt
VITE_USE_AZURE_API=true
VITE_API_BASE_URL=http://localhost:7071
```

## 4. Deployment ohne Azure CLI

Da `az` auf deinem Mac aktuell nicht installiert ist, ist der einfachste Weg:

1. Code in ein GitHub-Repository pushen.
2. Im Azure Portal `Code von GitHub importieren` wählen.
3. Repository verbinden.
4. Diese Werte setzen:
   - App location: `/`
   - API location: `api`
   - Output location: `dist`
5. Azure erstellt eine GitHub Actions Pipeline.

## 5. Deployment mit Azure CLI

Azure CLI installieren:

```bash
brew install azure-cli
az login
```

Ressourcen per Bicep:

```bash
az group create --name rg-financepro-dev --location westeurope
az deployment group create \
  --resource-group rg-financepro-dev \
  --template-file infra/main.bicep \
  --parameters projectName=financepro location=westeurope documentIntelligenceSku=F0 staticWebAppSku=Free
```

Danach GitHub Actions oder Azure Static Web Apps CLI für den Code-Deploy verwenden.

## 6. Kostenkontrolle

Für den MVP:

- Static Web Apps Free: sehr günstig/gratis für Frontend
- Document Intelligence F0: kleines Gratis-Kontingent, danach S0 nach Verbrauch
- Blob Storage LRS: Cent-Bereich bei kleinen Belegmengen
- Functions in Static Web Apps: für MVP ausreichend

Setze direkt ein Budget Alert bei 20 USD und 50 USD.

## 7. Was jetzt noch fehlt

- echte Authentifizierung über Microsoft Entra ID oder Static Web Apps Auth
- produktive Rollenbindung an Benutzer statt lokaler UI-Auswahl
- rechtssichere Lösch-/Archivregeln
- echte UID-Stufe-2-Nachweise als Datei im Audit-Paket
- produktive BMD/RZL/domizil+/Business-Central-Testimporte mit Pilotkunde
