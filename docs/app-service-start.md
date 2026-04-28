# FinancePro auf Azure App Service starten

Das aktive Deployment ist jetzt **Azure App Service Web App**, nicht Static Web Apps.

## 1. App Service Einstellungen

In Azure Portal:

`App Service financepro` -> `Settings` -> `Configuration` -> `Application settings`

Setze:

```txt
NODE_ENV=production
SCM_DO_BUILD_DURING_DEPLOYMENT=false
VITE_USE_AZURE_API=true
VITE_API_BASE_URL=
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=<Document Intelligence Endpoint>
AZURE_DOCUMENT_INTELLIGENCE_KEY=<Document Intelligence Key>
AZURE_DOCUMENT_INTELLIGENCE_API_VERSION=2024-11-30
AZURE_STORAGE_CONNECTION_STRING=<Storage Account Connection String>
AZURE_STORAGE_CONTAINER=invoices
```

Dann speichern und App neu starten.

## 2. Startup Command

In Azure Portal:

`App Service financepro` -> `Settings` -> `Configuration` -> `General settings`

Setze:

```txt
Startup Command: npm start
```

Runtime:

```txt
Node 22 LTS
Linux
Free F1
```

## 3. GitHub Secret für Deployment

In Azure Portal:

`App Service financepro` -> `Overview` -> `Download publish profile`

Falls Download deaktiviert ist:

`Configuration` -> `General settings` -> `SCM Basic Auth Publishing Credentials` aktivieren, speichern, Publish Profile herunterladen.

In GitHub:

`Digcha/FinancePro` -> `Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`

Name:

```txt
AZURE_WEBAPP_PUBLISH_PROFILE
```

Value:

Inhalt der heruntergeladenen `.PublishSettings` Datei komplett einfügen.

## 4. Deployment starten

In GitHub:

`Actions` -> `Build and deploy Node.js app to Azure Web App - financepro` -> `Run workflow`

Oder lokal:

```bash
git commit --allow-empty -m "Trigger Azure deployment"
git push origin main
```

## 5. Test URLs

Nach erfolgreichem Deploy:

```txt
https://financepro-g9bzayfnb9hgcdha.westeurope-01.azurewebsites.net/
https://financepro-g9bzayfnb9hgcdha.westeurope-01.azurewebsites.net/api/health
```

Wenn `/api/health` JSON zurückgibt, läuft der Node-Server.

## 6. Lokal starten

```bash
npm install
npm run build
npm start
```

Dann:

```txt
http://localhost:8080/
http://localhost:8080/api/health
```
