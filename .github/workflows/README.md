This repository currently deploys to Azure App Service through `main_financepro.yml`.

The workflow expects one GitHub Actions secret:

```txt
AZURE_WEBAPP_PUBLISH_PROFILE
```

Create it from the Azure App Service publish profile. The older Azure Static Web Apps workflow was removed because the active Azure resource is an App Service Web App.
