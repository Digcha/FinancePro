@description('Short lowercase project name used as Azure resource prefix.')
param projectName string = 'financepro'

@description('Azure region. West Europe is a practical default for Austria.')
param location string = 'westeurope'

@description('Azure Static Web Apps SKU. Free is enough for MVP; use Standard later for production SLAs/custom auth needs.')
@allowed([
  'Free'
  'Standard'
])
param staticWebAppSku string = 'Free'

@description('Document Intelligence SKU. F0 gives a small free monthly test allowance; S0 uses paid consumption.')
@allowed([
  'F0'
  'S0'
])
param documentIntelligenceSku string = 'F0'

var suffix = uniqueString(resourceGroup().id, projectName)
var safeProject = toLower(replace(projectName, '-', ''))
var storageName = take('${safeProject}${suffix}', 24)

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    accessTier: 'Hot'
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  name: 'default'
  parent: storage
}

resource invoiceContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  name: 'invoices'
  parent: blobService
  properties: {
    publicAccess: 'None'
  }
}

resource documentIntelligence 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: '${projectName}-di-${suffix}'
  location: location
  sku: {
    name: documentIntelligenceSku
  }
  kind: 'FormRecognizer'
  properties: {
    customSubDomainName: '${projectName}-di-${suffix}'
    publicNetworkAccess: 'Enabled'
  }
}

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: '${projectName}-swa-${suffix}'
  location: location
  sku: {
    name: staticWebAppSku
    tier: staticWebAppSku
  }
  properties: {
    allowConfigFileUpdates: true
    stagingEnvironmentPolicy: 'Enabled'
    provider: 'None'
  }
}

output staticWebAppName string = staticWebApp.name
output staticWebAppDefaultHostname string = staticWebApp.properties.defaultHostname
output storageAccountName string = storage.name
output invoiceContainerName string = invoiceContainer.name
output documentIntelligenceName string = documentIntelligence.name
output documentIntelligenceEndpoint string = documentIntelligence.properties.endpoint
